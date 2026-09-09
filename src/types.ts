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
  pemasukan?: number; // Pemasukan (diisi manual oleh DRU)
  jasaParkir?: number; // Jasa Parkir (Hanya DRU)
  tarifJasa?: number; // Kompatibilitas alias untuk jasa
  pemasukanConfirmedByPecel?: boolean; // Legacy field
  pemasukanConfirmedAt?: string;
  kepemilikan: KepemilikanType; // 'pecel' | 'pribadi' | 'mamah'
  lunas?: boolean; // Jika motor sudah lunas, tidak lagi ditampilkan pada halaman utama
  lunasAt?: string;
  catatan?: string;
  nominalKirimPecel?: number; // Legacy field
  statusKirimPecel?: 'draft' | 'terkirim' | 'dikonfirmasi'; // Legacy field
  tanggalKirimPecel?: string;
  catatanKirimPecel?: string;
}

export interface AppConfig {
  logoUrl: string | null;
  appTitle: string;
}

export type ActiveModal = 'none' | 'dru_login' | 'dru_panel';
