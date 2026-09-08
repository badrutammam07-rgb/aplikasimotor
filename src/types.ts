export type KepemilikanType = 'pecel' | 'pribadi' | 'mamah';
export type MotorStatusType = 'PARKIR' | 'LELANG' | 'LUNAS';

export interface MotorRecord {
  id: string;
  tanggal: string; // YYYY-MM-DD (tanggal masuk)
  motor: string;
  tahun: number | string;
  nopol: string;
  hari: string; // Otomatis terisi jumlah hari sejak motor masuk sampai hari ini
  nominal?: number; // Nominal nilai motor / pinjaman
  pemasukan?: number; // Pemasukan (untuk pecel terisi otomatis setelah dikonfirmasi pecel)
  jasaParkir?: number; // Jasa Parkir (Hanya DRU yang tahu, tidak tampil di pecel)
  tarifJasa?: number; // Kompatibilitas alias untuk jasa
  pemasukanConfirmedByPecel?: boolean; // Konfirmasi pemasukan dari halaman Pecel
  pemasukanConfirmedAt?: string;
  kepemilikan: KepemilikanType; // 'pecel' | 'pribadi' | 'mamah'
  lunas?: boolean; // Jika motor sudah lunas, tidak lagi ditampilkan pada halaman utama
  lunasAt?: string;
  catatan?: string;
  nominalKirimPecel?: number; // Nominal pemasukan yang dikirim oleh DRU ke Halaman Pecel
  statusKirimPecel?: 'draft' | 'terkirim' | 'dikonfirmasi'; // Status kiriman pemasukan ke pecel
  tanggalKirimPecel?: string;
  catatanKirimPecel?: string;
}

export interface AppConfig {
  logoUrl: string | null;
  appTitle: string;
}

export type ActiveModal = 'none' | 'portal_doors' | 'dru_login' | 'dru_panel' | 'pecel_login' | 'pecel_panel';
