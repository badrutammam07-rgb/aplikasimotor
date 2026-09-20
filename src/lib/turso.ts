import { createClient, Client } from "@libsql/client/web";

const STORAGE_KEY_TURSO_URL = "motorku_turso_url";
const STORAGE_KEY_TURSO_TOKEN = "motorku_turso_token";

export interface TursoConfig {
  url: string;
  authToken?: string;
}

let cachedClient: Client | null = null;
let cachedConfigKey = "";
let schemaInitialized = false;
let hasAuthError = false;

export function isTursoAuthError(): boolean {
  return hasAuthError;
}

export function resetTursoAuthError(): void {
  hasAuthError = false;
}

/**
 * Mendapatkan konfigurasi Turso dari Environment Variable atau LocalStorage
 */
export function getTursoConfig(): TursoConfig | null {
  // 1. Cek Vite env / process env
  const envUrl =
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_TURSO_DATABASE_URL) ||
    (typeof process !== "undefined" && process.env?.VITE_TURSO_DATABASE_URL) ||
    (typeof process !== "undefined" && process.env?.TURSO_DATABASE_URL);

  const envToken =
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_TURSO_AUTH_TOKEN) ||
    (typeof process !== "undefined" && process.env?.VITE_TURSO_AUTH_TOKEN) ||
    (typeof process !== "undefined" && process.env?.TURSO_AUTH_TOKEN);

  // 2. Cek LocalStorage (opsional user override via pengaturan DRU)
  let storedUrl = "";
  let storedToken = "";
  if (typeof window !== "undefined") {
    try {
      storedUrl = localStorage.getItem(STORAGE_KEY_TURSO_URL) || "";
      storedToken = localStorage.getItem(STORAGE_KEY_TURSO_TOKEN) || "";
    } catch (e) {
      console.warn("Gagal membaca konfigurasi Turso dari localStorage:", e);
    }
  }

  const rawUrl = (storedUrl.trim() || (envUrl ? String(envUrl).trim() : "")).trim();
  const rawToken = (storedToken.trim() || (envToken ? String(envToken).trim() : "")).trim();

  if (!rawUrl) {
    return null;
  }

  return {
    url: rawUrl,
    authToken: rawToken ? rawToken : undefined,
  };
}

/**
 * Menyimpan konfigurasi Turso kustom ke LocalStorage
 */
export function saveTursoConfig(url: string, authToken?: string): void {
  if (typeof window === "undefined") return;
  try {
    if (url.trim()) {
      localStorage.setItem(STORAGE_KEY_TURSO_URL, url.trim());
    } else {
      localStorage.removeItem(STORAGE_KEY_TURSO_URL);
    }

    if (authToken && authToken.trim()) {
      localStorage.setItem(STORAGE_KEY_TURSO_TOKEN, authToken.trim());
    } else {
      localStorage.removeItem(STORAGE_KEY_TURSO_TOKEN);
    }

    // Reset cache agar client baru dibuat
    cachedClient = null;
    cachedConfigKey = "";
    schemaInitialized = false;
    hasAuthError = false;
  } catch (e) {
    console.error("Gagal menyimpan konfigurasi Turso:", e);
  }
}

/**
 * Cek apakah Turso telah dikonfigurasi dengan benar
 */
export function isTursoConfigured(): boolean {
  const config = getTursoConfig();
  if (!config || !config.url) return false;
  // Jika URL database Turso Cloud (*.turso.io), token otentikasi wajib ada
  if (config.url.includes("turso.io") && !config.authToken) {
    return false;
  }
  return true;
}

/**
 * Mengembalikan instance LibSQL Client untuk Turso (lazy initialization)
 */
export function getTursoClient(): Client | null {
  const config = getTursoConfig();
  if (!config || !config.url) {
    return null;
  }

  // Jika URL cloud Turso tapi token belum ada, jangan buat client unauthenticated
  if (config.url.includes("turso.io") && !config.authToken) {
    return null;
  }

  // Normalisasi URL untuk Web Client:
  // Jika menggunakan libsql://, @libsql/client/web mendukung https://
  let clientUrl = config.url;
  if (clientUrl.startsWith("libsql://")) {
    clientUrl = clientUrl.replace(/^libsql:\/\//, "https://");
  }

  const currentKey = `${clientUrl}::${config.authToken || ""}`;
  if (cachedClient && cachedConfigKey === currentKey) {
    return cachedClient;
  }

  try {
    cachedClient = createClient({
      url: clientUrl,
      authToken: config.authToken,
    });
    cachedConfigKey = currentKey;
    return cachedClient;
  } catch (err) {
    console.warn("Inisialisasi Turso Client gagal:", err);
    return null;
  }
}

/**
 * Inisialisasi skema tabel SQLite di Turso secara otomatis
 */
export async function ensureTursoSchema(): Promise<boolean> {
  if (schemaInitialized) return true;
  if (hasAuthError) return false;

  const config = getTursoConfig();
  if (!config || !config.url) return false;

  // Cloud Turso requires auth token
  if (config.url.includes("turso.io") && !config.authToken) {
    return false;
  }

  const client = getTursoClient();
  if (!client) return false;

  try {
    await client.batch([
      `CREATE TABLE IF NOT EXISTS motors (
        id TEXT PRIMARY KEY,
        tanggal TEXT NOT NULL,
        motor TEXT NOT NULL,
        tahun TEXT,
        nopol TEXT NOT NULL,
        hari TEXT,
        nominal REAL DEFAULT 0,
        pemasukan REAL DEFAULT 0,
        jasa_parkir REAL DEFAULT 0,
        tarif_jasa REAL DEFAULT 0,
        kepemilikan TEXT DEFAULT 'pecel',
        lunas INTEGER DEFAULT 0,
        lunas_at TEXT,
        catatan TEXT,
        status_kirim_pecel TEXT,
        nominal_kirim_pecel REAL,
        tanggal_kirim_pecel TEXT,
        catatan_kirim_pecel TEXT,
        pemasukan_confirmed_by_pecel INTEGER DEFAULT 0,
        pemasukan_confirmed_at TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );`,
      `CREATE TABLE IF NOT EXISTS app_config (
        id TEXT PRIMARY KEY,
        logo_url TEXT,
        app_title TEXT DEFAULT 'EL-GHIGHAIS MOTOR',
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );`,
    ]);

    schemaInitialized = true;
    hasAuthError = false;
    return true;
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    if (errMsg.includes("401") || errMsg.includes("Unauthorized") || errMsg.includes("JWT")) {
      hasAuthError = true;
      console.warn(
        "Turso 401 Unauthorized: Auth Token tidak valid atau kedaluwarsa. Menggunakan penyimpanan lokal sinkron.",
      );
    } else {
      console.warn("Gagal inisialisasi skema Turso, fallback ke lokal:", errMsg);
    }
    return false;
  }
}

/**
 * Uji koneksi ke database Turso
 */
export async function testTursoConnection(): Promise<{
  connected: boolean;
  message: string;
}> {
  const config = getTursoConfig();
  if (!config || !config.url) {
    return {
      connected: false,
      message: "Database Turso belum dikonfigurasi. Menggunakan penyimpanan lokal sinkron.",
    };
  }

  if (config.url.includes("turso.io") && !config.authToken) {
    return {
      connected: false,
      message:
        "Database Turso Cloud (*.turso.io) memerlukan Auth Token. Masukkan TURSO_AUTH_TOKEN Anda.",
    };
  }

  // Reset auth error flag saat pengujian eksplisit
  hasAuthError = false;

  const client = getTursoClient();
  if (!client) {
    return {
      connected: false,
      message: "Gagal membuat koneksi klien Turso libSQL.",
    };
  }

  try {
    const res = await client.execute("SELECT 1 as ping;");
    if (res.rows && res.rows.length > 0) {
      const schemaOk = await ensureTursoSchema();
      if (!schemaOk && hasAuthError) {
        return {
          connected: false,
          message: "Autentikasi Turso gagal (HTTP 401): Auth Token tidak valid atau kedaluwarsa.",
        };
      }
      return {
        connected: true,
        message: `Koneksi database Turso libSQL aktif: ${config.url}`,
      };
    }
    return {
      connected: false,
      message: "Respon tidak valid dari server Turso.",
    };
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    if (errMsg.includes("401") || errMsg.includes("Unauthorized") || errMsg.includes("JWT")) {
      hasAuthError = true;
      return {
        connected: false,
        message: "Autentikasi Turso gagal (HTTP 401): Auth Token tidak valid atau kedaluwarsa.",
      };
    }
    return {
      connected: false,
      message: `Koneksi Turso bermasalah: ${errMsg}`,
    };
  }
}
