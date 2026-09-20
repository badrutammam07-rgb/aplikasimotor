import {
  getTursoClient,
  isTursoConfigured,
  ensureTursoSchema,
  isTursoAuthError,
} from "../lib/turso";
import { MotorRecord, AppConfig } from "../types";
import { formatElapsedDays, isLunasExpired } from "../data/initialData";

const STORAGE_KEY_RECORDS = "motorku_records_v2";
const STORAGE_KEY_CONFIG = "motorku_config_v2";
const STORAGE_KEY_DELETED_IDS = "motorku_deleted_motor_ids_v2";

// In-memory subscribers
type MotorSubscriber = (motors: MotorRecord[]) => void;
type ConfigSubscriber = (config: AppConfig) => void;

const motorSubscribers = new Set<MotorSubscriber>();
const configSubscribers = new Set<ConfigSubscriber>();

let isPollingActive = false;
let pollingTimer: ReturnType<typeof setInterval> | null = null;

/**
 * Normalisasi data baris dari SQLite ke MotorRecord
 */
function mapRowToMotorRecord(row: Record<string, unknown>): MotorRecord {
  const tanggal = String(row.tanggal || new Date().toISOString().split("T")[0]);
  const jasaVal =
    typeof row.jasa_parkir === "number"
      ? row.jasa_parkir
      : typeof row.tarif_jasa === "number"
        ? row.tarif_jasa
        : Number(row.jasa_parkir) || Number(row.tarif_jasa) || 0;

  return {
    id: String(row.id),
    tanggal,
    motor: String(row.motor || ""),
    tahun: String(row.tahun || ""),
    nopol: String(row.nopol || ""),
    hari: formatElapsedDays(tanggal),
    nominal: typeof row.nominal === "number" ? row.nominal : Number(row.nominal) || 0,
    pemasukan: typeof row.pemasukan === "number" ? row.pemasukan : Number(row.pemasukan) || 0,
    jasaParkir: jasaVal,
    tarifJasa: jasaVal,
    kepemilikan: (row.kepemilikan as MotorRecord["kepemilikan"]) || "pecel",
    lunas: Boolean(row.lunas),
    lunasAt: row.lunas_at ? String(row.lunas_at) : undefined,
    catatan: row.catatan ? String(row.catatan) : "",
    statusKirimPecel: (row.status_kirim_pecel as MotorRecord["statusKirimPecel"]) || undefined,
    nominalKirimPecel:
      row.nominal_kirim_pecel != null ? Number(row.nominal_kirim_pecel) : undefined,
    tanggalKirimPecel: row.tanggal_kirim_pecel ? String(row.tanggal_kirim_pecel) : undefined,
    catatanKirimPecel: row.catatan_kirim_pecel ? String(row.catatan_kirim_pecel) : undefined,
    pemasukanConfirmedByPecel: Boolean(row.pemasukan_confirmed_by_pecel),
    pemasukanConfirmedAt: row.pemasukan_confirmed_at
      ? String(row.pemasukan_confirmed_at)
      : undefined,
  };
}

/**
 * Membaca data lokal dari localStorage
 */
function getLocalMotors(): MotorRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const saved = localStorage.getItem(STORAGE_KEY_RECORDS);
    const savedDeleted = localStorage.getItem(STORAGE_KEY_DELETED_IDS);
    const deletedArr: string[] = savedDeleted ? JSON.parse(savedDeleted) : [];

    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed
          .filter(
            (item: MotorRecord) =>
              !deletedArr.includes(item.id) && !(item.lunas && isLunasExpired(item.lunasAt)),
          )
          .map((item: MotorRecord) => ({
            ...item,
            hari: formatElapsedDays(item.tanggal),
          }));
      }
    }
  } catch (e) {
    console.error("Gagal membaca local storage motor:", e);
  }
  return [];
}

/**
 * Menyimpan data lokal ke localStorage
 */
function saveLocalMotors(motors: MotorRecord[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(motors));
  } catch (e) {
    console.error("Gagal menyimpan local storage motor:", e);
  }
}

/**
 * Mengabarkan semua subscriber motor
 */
function notifyMotorSubscribers(motors: MotorRecord[]): void {
  // Urutkan berdasarkan tanggal terbaru
  const sorted = [...motors].sort((a, b) => {
    const dateDiff = new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime();
    if (dateDiff !== 0) return dateDiff;
    return b.id.localeCompare(a.id);
  });
  saveLocalMotors(sorted);
  motorSubscribers.forEach((sub) => {
    try {
      sub(sorted);
    } catch (err) {
      console.error("Error in motor subscriber:", err);
    }
  });
}

/**
 * Mengambil semua motor dari Turso libSQL
 */
export async function fetchMotorsFromTurso(): Promise<MotorRecord[]> {
  if (!isTursoConfigured() || isTursoAuthError()) {
    return getLocalMotors();
  }

  const client = getTursoClient();
  if (!client) {
    return getLocalMotors();
  }

  try {
    const schemaOk = await ensureTursoSchema();
    if (!schemaOk) {
      return getLocalMotors();
    }
    const result = await client.execute("SELECT * FROM motors ORDER BY tanggal DESC;");
    const records: MotorRecord[] = [];

    for (const row of result.rows) {
      const record = mapRowToMotorRecord(row as unknown as Record<string, unknown>);
      if (!(record.lunas && isLunasExpired(record.lunasAt))) {
        records.push(record);
      }
    }

    notifyMotorSubscribers(records);
    return records;
  } catch (err) {
    console.warn("Gagal mengambil data dari Turso, menggunakan cache lokal:", err);
    return getLocalMotors();
  }
}

/**
 * Memulai sinkronisasi berkala (polling) dengan Turso libSQL
 */
function startSyncLoop() {
  if (isPollingActive) return;
  isPollingActive = true;

  const poll = async () => {
    if (isTursoConfigured() && !isTursoAuthError() && motorSubscribers.size > 0) {
      await fetchMotorsFromTurso();
      await fetchConfigFromTurso();
    }
  };

  // Langsung fetch pertama kali
  poll();

  // Polling tiap 6 detik jika tab sedang aktif
  pollingTimer = setInterval(() => {
    if (typeof document !== "undefined" && document.hidden) {
      return; // Hemat request saat tab di background
    }
    poll();
  }, 6000);
}

/**
 * Berlangganan perubahan data motor secara real-time
 */
export function subscribeToMotors(
  onData: (motors: MotorRecord[]) => void,
  onError?: (err: unknown) => void,
): () => void {
  motorSubscribers.add(onData);

  // Kirim data cache lokal langsung agar UI instan tanpa jeda
  const cached = getLocalMotors();
  if (cached.length > 0) {
    onData(cached);
  }

  // Mulai loop sinkronisasi Turso
  startSyncLoop();

  // Jalankan fetch awal
  fetchMotorsFromTurso().catch((err) => {
    if (onError) onError(err);
  });

  return () => {
    motorSubscribers.delete(onData);
    if (motorSubscribers.size === 0 && configSubscribers.size === 0) {
      if (pollingTimer) {
        clearInterval(pollingTimer);
        pollingTimer = null;
      }
      isPollingActive = false;
    }
  };
}

/**
 * Menambahkan unit motor baru ke Turso dan LocalStorage
 */
export async function addMotor(
  motorData: Omit<MotorRecord, "id"> & { id?: string },
): Promise<string> {
  const id = motorData.id || `motor_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const tanggal = motorData.tanggal || new Date().toISOString().split("T")[0];
  const jasa = motorData.jasaParkir ?? motorData.tarifJasa ?? 0;

  const newRecord: MotorRecord = {
    ...motorData,
    id,
    tanggal,
    hari: formatElapsedDays(tanggal),
    nominal: motorData.nominal ?? 0,
    pemasukan: motorData.pemasukan ?? 0,
    jasaParkir: jasa,
    tarifJasa: jasa,
    kepemilikan: motorData.kepemilikan || "pecel",
    lunas: !!motorData.lunas,
    lunasAt: motorData.lunasAt,
    catatan: motorData.catatan || "",
  };

  // Update memori dan local storage terlebih dahulu (optimistic)
  const current = getLocalMotors().filter((m) => m.id !== id);
  notifyMotorSubscribers([newRecord, ...current]);

  if (isTursoConfigured() && !isTursoAuthError()) {
    const client = getTursoClient();
    if (client) {
      try {
        const schemaOk = await ensureTursoSchema();
        if (schemaOk) {
          await client.execute({
            sql: `INSERT OR REPLACE INTO motors (
              id, tanggal, motor, tahun, nopol, hari, nominal, pemasukan,
              jasa_parkir, tarif_jasa, kepemilikan, lunas, lunas_at, catatan,
              status_kirim_pecel, nominal_kirim_pecel, tanggal_kirim_pecel, catatan_kirim_pecel,
              pemasukan_confirmed_by_pecel, pemasukan_confirmed_at, updated_at
            ) VALUES (
              ?, ?, ?, ?, ?, ?, ?, ?,
              ?, ?, ?, ?, ?, ?,
              ?, ?, ?, ?,
              ?, ?, CURRENT_TIMESTAMP
            );`,
            args: [
              newRecord.id,
              newRecord.tanggal,
              newRecord.motor,
              String(newRecord.tahun),
              newRecord.nopol,
              newRecord.hari,
              newRecord.nominal ?? 0,
              newRecord.pemasukan ?? 0,
              newRecord.jasaParkir ?? 0,
              newRecord.tarifJasa ?? 0,
              newRecord.kepemilikan,
              newRecord.lunas ? 1 : 0,
              newRecord.lunasAt || null,
              newRecord.catatan || null,
              newRecord.statusKirimPecel || null,
              newRecord.nominalKirimPecel ?? null,
              newRecord.tanggalKirimPecel || null,
              newRecord.catatanKirimPecel || null,
              newRecord.pemasukanConfirmedByPecel ? 1 : 0,
              newRecord.pemasukanConfirmedAt || null,
            ],
          });
        }
      } catch (err) {
        console.warn("Gagal menyimpan motor ke Turso:", err);
      }
    }
  }

  return id;
}

/**
 * Memperbarui data motor di Turso dan LocalStorage
 */
export async function updateMotor(id: string, updates: Partial<MotorRecord>): Promise<void> {
  const current = getLocalMotors();
  const existing = current.find((m) => m.id === id);
  if (!existing) return;

  const jasa = updates.jasaParkir ?? updates.tarifJasa ?? existing.jasaParkir ?? 0;
  const updatedRecord: MotorRecord = {
    ...existing,
    ...updates,
    jasaParkir: jasa,
    tarifJasa: jasa,
    hari: updates.tanggal ? formatElapsedDays(updates.tanggal) : existing.hari,
  };

  const updatedList = current.map((m) => (m.id === id ? updatedRecord : m));
  notifyMotorSubscribers(updatedList);

  if (isTursoConfigured() && !isTursoAuthError()) {
    const client = getTursoClient();
    if (client) {
      try {
        const schemaOk = await ensureTursoSchema();
        if (schemaOk) {
          await client.execute({
            sql: `UPDATE motors SET
              tanggal = ?, motor = ?, tahun = ?, nopol = ?, hari = ?,
              nominal = ?, pemasukan = ?, jasa_parkir = ?, tarif_jasa = ?,
              kepemilikan = ?, lunas = ?, lunas_at = ?, catatan = ?,
              status_kirim_pecel = ?, nominal_kirim_pecel = ?, tanggal_kirim_pecel = ?, catatan_kirim_pecel = ?,
              pemasukan_confirmed_by_pecel = ?, pemasukan_confirmed_at = ?,
              updated_at = CURRENT_TIMESTAMP
            WHERE id = ?;`,
            args: [
              updatedRecord.tanggal,
              updatedRecord.motor,
              String(updatedRecord.tahun),
              updatedRecord.nopol,
              updatedRecord.hari,
              updatedRecord.nominal ?? 0,
              updatedRecord.pemasukan ?? 0,
              updatedRecord.jasaParkir ?? 0,
              updatedRecord.tarifJasa ?? 0,
              updatedRecord.kepemilikan,
              updatedRecord.lunas ? 1 : 0,
              updatedRecord.lunasAt || null,
              updatedRecord.catatan || null,
              updatedRecord.statusKirimPecel || null,
              updatedRecord.nominalKirimPecel ?? null,
              updatedRecord.tanggalKirimPecel || null,
              updatedRecord.catatanKirimPecel || null,
              updatedRecord.pemasukanConfirmedByPecel ? 1 : 0,
              updatedRecord.pemasukanConfirmedAt || null,
              id,
            ],
          });
        }
      } catch (err) {
        console.warn("Gagal update motor di Turso:", err);
      }
    }
  }
}

/**
 * Menghapus unit motor permanen dari Turso dan LocalStorage
 */
export async function deleteMotor(id: string): Promise<void> {
  // Simpan ke daftar ID terhapus
  if (typeof window !== "undefined") {
    try {
      const savedDeleted = localStorage.getItem(STORAGE_KEY_DELETED_IDS);
      const deletedArr: string[] = savedDeleted ? JSON.parse(savedDeleted) : [];
      if (!deletedArr.includes(id)) {
        deletedArr.push(id);
        localStorage.setItem(STORAGE_KEY_DELETED_IDS, JSON.stringify(deletedArr));
      }
    } catch (e) {
      console.error("Gagal simpan ID terhapus:", e);
    }
  }

  const current = getLocalMotors().filter((m) => m.id !== id);
  notifyMotorSubscribers(current);

  if (isTursoConfigured() && !isTursoAuthError()) {
    const client = getTursoClient();
    if (client) {
      try {
        const schemaOk = await ensureTursoSchema();
        if (schemaOk) {
          await client.execute({
            sql: "DELETE FROM motors WHERE id = ?;",
            args: [id],
          });
        }
      } catch (err) {
        console.warn("Gagal hapus motor di Turso:", err);
      }
    }
  }
}

/**
 * Mengambil konfigurasi aplikasi (logo & judul) dari Turso
 */
export async function fetchConfigFromTurso(): Promise<AppConfig | null> {
  if (!isTursoConfigured() || isTursoAuthError()) return null;
  const client = getTursoClient();
  if (!client) return null;

  try {
    const schemaOk = await ensureTursoSchema();
    if (!schemaOk) return null;
    const res = await client.execute("SELECT * FROM app_config WHERE id = 'general' LIMIT 1;");
    if (res.rows.length > 0) {
      const row = res.rows[0];
      const cfg: AppConfig = {
        logoUrl: (row.logo_url as string) || null,
        appTitle: (row.app_title as string) || "EL-GHIGHAIS MOTOR",
      };
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(cfg));
      }
      configSubscribers.forEach((sub) => sub(cfg));
      return cfg;
    }
  } catch (err) {
    console.warn("Gagal membaca konfigurasi dari Turso:", err);
  }
  return null;
}

/**
 * Berlangganan konfigurasi aplikasi
 */
export function subscribeToAppConfig(
  onData: (config: AppConfig) => void,
  onError?: (err: unknown) => void,
): () => void {
  configSubscribers.add(onData);

  // Kirim data cache lokal
  if (typeof window !== "undefined") {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CONFIG);
      if (saved) {
        onData(JSON.parse(saved));
      }
    } catch (e) {
      console.error("Gagal baca config lokal:", e);
    }
  }

  fetchConfigFromTurso().catch((err) => {
    if (onError) onError(err);
  });

  return () => {
    configSubscribers.delete(onData);
  };
}

/**
 * Memperbarui konfigurasi aplikasi (logo / judul) di Turso dan LocalStorage
 */
export async function updateAppConfig(config: Partial<AppConfig>): Promise<void> {
  let merged: AppConfig = {
    logoUrl: null,
    appTitle: "EL-GHIGHAIS MOTOR",
    ...config,
  };

  if (typeof window !== "undefined") {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CONFIG);
      if (saved) {
        merged = { ...JSON.parse(saved), ...config };
      }
      localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(merged));
    } catch (e) {
      console.error("Gagal update config lokal:", e);
    }
  }

  configSubscribers.forEach((sub) => sub(merged));

  if (isTursoConfigured() && !isTursoAuthError()) {
    const client = getTursoClient();
    if (client) {
      try {
        const schemaOk = await ensureTursoSchema();
        if (schemaOk) {
          await client.execute({
            sql: `INSERT OR REPLACE INTO app_config (id, logo_url, app_title, updated_at)
                  VALUES ('general', ?, ?, CURRENT_TIMESTAMP);`,
            args: [merged.logoUrl || null, merged.appTitle],
          });
        }
      } catch (err) {
        console.warn("Gagal update app_config di Turso:", err);
      }
    }
  }
}

/**
 * Seed data awal jika database masih kosong
 */
export async function seedInitialMotorsIfEmpty(initialMotors: MotorRecord[]): Promise<void> {
  const current = getLocalMotors();
  if (current.length === 0 && initialMotors.length > 0) {
    notifyMotorSubscribers(initialMotors);
  }

  if (isTursoConfigured() && !isTursoAuthError()) {
    const client = getTursoClient();
    if (client) {
      try {
        const schemaOk = await ensureTursoSchema();
        if (schemaOk) {
          const countRes = await client.execute("SELECT count(*) as total FROM motors;");
          const total = Number(countRes.rows[0]?.total || 0);

          if (total === 0 && initialMotors.length > 0) {
            const statements = initialMotors.map((m) => {
              const jasa = m.jasaParkir ?? m.tarifJasa ?? 0;
              return {
                sql: `INSERT OR IGNORE INTO motors (
                  id, tanggal, motor, tahun, nopol, hari, nominal, pemasukan,
                  jasa_parkir, tarif_jasa, kepemilikan, lunas, lunas_at, catatan
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
                args: [
                  m.id,
                  m.tanggal,
                  m.motor,
                  String(m.tahun),
                  m.nopol,
                  formatElapsedDays(m.tanggal),
                  m.nominal ?? 0,
                  m.pemasukan ?? 0,
                  jasa,
                  jasa,
                  m.kepemilikan,
                  m.lunas ? 1 : 0,
                  m.lunasAt || null,
                  m.catatan || null,
                ],
              };
            });

            await client.batch(statements);
          }
        }
      } catch (err) {
        console.warn("Gagal seeding awal ke Turso:", err);
      }
    }
  }
}
