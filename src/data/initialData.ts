import { MotorRecord, MotorStatusType } from "../types";

export function getDateDaysAgo(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function calculateElapsedDays(tanggalMasukStr: string): number {
  try {
    const entryDate = new Date(tanggalMasukStr);
    const today = new Date();

    // Normalize both to midnight to count calendar days accurately
    entryDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    const diffTime = today.getTime() - entryDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    // Tanggal saat di-input sudah dianggap 1 hari bukan 0
    return Math.max(1, diffDays + 1);
  } catch (e) {
    return 1;
  }
}

export function formatElapsedDays(tanggalMasukStr: string): string {
  const days = calculateElapsedDays(tanggalMasukStr);
  return `${days} Hari`;
}

/**
 * Aturan Status:
 * - Jika motor sudah lunas -> 'LUNAS' (tidak ditampilkan pada tabel halaman utama)
 * - Motor berstatus LUNAS akan hilang otomatis 1 Minggu (7 hari) setelah lunas
 * - Jika sudah lebih dari 3 bulan (> 90 hari) -> 'LELANG'
 * - Jika di bawah itu (<= 90 hari) -> 'PARKIR'
 */
export function getMotorStatus(tanggalMasukStr: string, isLunas?: boolean): MotorStatusType {
  if (isLunas) return "LUNAS";
  const days = calculateElapsedDays(tanggalMasukStr);
  return days > 90 ? "LELANG" : "PARKIR";
}

/**
 * Menghitung selisih hari sejak motor berstatus lunas
 */
export function calculateLunasDays(lunasAt?: string): number {
  if (!lunasAt) return 0;
  try {
    const lDate = new Date(lunasAt);
    const today = new Date();
    lDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    const diff = today.getTime() - lDate.getTime();
    return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
  } catch {
    return 0;
  }
}

/**
 * Motor berstatus lunas akan hilang otomatis 1 Minggu (7 hari) setelah lunas
 */
export function isLunasExpired(lunasAt?: string): boolean {
  if (!lunasAt) return false;
  return calculateLunasDays(lunasAt) >= 7;
}

/**
 * Sisa hari sebelum motor berstatus lunas otomatis terhapus dari database (maksimal 7 hari)
 */
export function getLunasRemainingDays(lunasAt?: string): number {
  if (!lunasAt) return 7;
  const elapsed = calculateLunasDays(lunasAt);
  return Math.max(0, 7 - elapsed);
}

export const INITIAL_MOTOR_DATA: MotorRecord[] = [
  {
    id: "rec-1",
    tanggal: getDateDaysAgo(1),
    hari: "1 Hari",
    motor: "Honda Vario 160 ABS",
    tahun: 2024,
    nopol: "B 3819 KZW",
    nominal: 29500000,
    pemasukan: 850000,
    jasaParkir: 250000,
    tarifJasa: 850000,
    pemasukanConfirmedByPecel: true,
    pemasukanConfirmedAt: getDateDaysAgo(0),
    kepemilikan: "pecel",
    catatan: "Kondisi mulus orisinil",
  },
  {
    id: "rec-2",
    tanggal: getDateDaysAgo(3),
    hari: "3 Hari",
    motor: "Yamaha NMAX 155 Connected",
    tahun: 2024,
    nopol: "D 4912 ADM",
    nominal: 33200000,
    pemasukan: 0,
    jasaParkir: 350000,
    tarifJasa: 1000000,
    pemasukanConfirmedByPecel: false,
    kepemilikan: "pecel",
    catatan: "Service resmi berkala",
  },
  {
    id: "rec-3",
    tanggal: getDateDaysAgo(5),
    hari: "5 Hari",
    motor: "Vespa Primavera 150 i-get",
    tahun: 2023,
    nopol: "B 1109 SQA",
    nominal: 52000000,
    pemasukan: 1750000,
    jasaParkir: 500000,
    tarifJasa: 1750000,
    pemasukanConfirmedByPecel: true,
    kepemilikan: "pribadi",
    catatan: "Warna White Innocenza",
  },
  {
    id: "rec-4",
    tanggal: getDateDaysAgo(7),
    hari: "7 Hari",
    motor: "Kawasaki Ninja ZX-25R",
    tahun: 2023,
    nopol: "B 4401 KPL",
    nominal: 107500000,
    pemasukan: 3500000,
    jasaParkir: 1200000,
    tarifJasa: 3500000,
    pemasukanConfirmedByPecel: true,
    kepemilikan: "mamah",
    catatan: "4 Silinder Suara Moge",
  },
  {
    id: "rec-5",
    tanggal: getDateDaysAgo(9),
    hari: "9 Hari",
    motor: "Honda Scoopy Prestige",
    tahun: 2024,
    nopol: "AB 2714 PX",
    nominal: 22800000,
    pemasukan: 650000,
    jasaParkir: 200000,
    tarifJasa: 650000,
    pemasukanConfirmedByPecel: true,
    pemasukanConfirmedAt: getDateDaysAgo(2),
    kepemilikan: "pecel",
    catatan: "Smart Key & Ban Tubeless",
  },
  {
    id: "rec-6",
    tanggal: getDateDaysAgo(12),
    hari: "12 Hari",
    motor: "Yamaha Aerox 155 CyberCity",
    tahun: 2023,
    nopol: "L 5508 ZY",
    nominal: 28750000,
    pemasukan: 950000,
    jasaParkir: 300000,
    tarifJasa: 950000,
    pemasukanConfirmedByPecel: true,
    kepemilikan: "pribadi",
    catatan: "Livery Sporty CyberCity",
  },
  {
    id: "rec-7",
    tanggal: getDateDaysAgo(15),
    hari: "15 Hari",
    motor: "Honda ADV 160 ABS",
    tahun: 2024,
    nopol: "D 6042 VBN",
    nominal: 39400000,
    pemasukan: 0,
    jasaParkir: 450000,
    tarifJasa: 1200000,
    pemasukanConfirmedByPecel: false,
    kepemilikan: "pecel",
    catatan: "Adventure Edition",
  },
  {
    id: "rec-8",
    tanggal: getDateDaysAgo(18),
    hari: "18 Hari",
    motor: "Honda PCX 160 CBS",
    tahun: 2023,
    nopol: "F 3329 RT",
    nominal: 32600000,
    pemasukan: 1100000,
    jasaParkir: 350000,
    tarifJasa: 1100000,
    pemasukanConfirmedByPecel: true,
    kepemilikan: "mamah",
    catatan: "Kompartemen Luas",
  },
  {
    id: "rec-9",
    tanggal: getDateDaysAgo(22),
    hari: "22 Hari",
    motor: "Yamaha XSR 155 Heritage",
    tahun: 2023,
    nopol: "B 4733 KDJ",
    nominal: 37800000,
    pemasukan: 1250000,
    jasaParkir: 400000,
    tarifJasa: 1250000,
    pemasukanConfirmedByPecel: true,
    pemasukanConfirmedAt: getDateDaysAgo(5),
    kepemilikan: "pecel",
    catatan: "Custom Cafe Racer Acc",
  },
  {
    id: "rec-10",
    tanggal: getDateDaysAgo(26),
    hari: "26 Hari",
    motor: "Vespa Sprint S 150",
    tahun: 2024,
    nopol: "B 5519 GTR",
    nominal: 56000000,
    pemasukan: 1850000,
    jasaParkir: 600000,
    tarifJasa: 1850000,
    pemasukanConfirmedByPecel: true,
    kepemilikan: "pribadi",
    catatan: "TFT Edition Matt Black",
  },
  {
    id: "rec-11",
    tanggal: getDateDaysAgo(31),
    hari: "31 Hari",
    motor: "Honda BeAT Deluxe SmartKey",
    tahun: 2023,
    nopol: "B 6231 TGH",
    nominal: 18400000,
    pemasukan: 0,
    jasaParkir: 200000,
    tarifJasa: 550000,
    pemasukanConfirmedByPecel: false,
    kepemilikan: "pecel",
    catatan: "Sangat Irit BBM",
  },
  {
    id: "rec-12",
    tanggal: getDateDaysAgo(37),
    hari: "37 Hari",
    motor: "Yamaha Fazzio Hybrid Lux",
    tahun: 2023,
    nopol: "B 6820 WLM",
    nominal: 23150000,
    pemasukan: 750000,
    jasaParkir: 250000,
    tarifJasa: 750000,
    pemasukanConfirmedByPecel: true,
    kepemilikan: "mamah",
    catatan: "Hybrid Connected",
  },
  {
    id: "rec-13",
    tanggal: getDateDaysAgo(45),
    hari: "45 Hari",
    motor: "Suzuki Satria F150 Fi Predator",
    tahun: 2022,
    nopol: "H 5910 CG",
    nominal: 21500000,
    pemasukan: 700000,
    jasaParkir: 220000,
    tarifJasa: 700000,
    pemasukanConfirmedByPecel: true,
    kepemilikan: "pribadi",
    catatan: "DOHC 6-Speed",
  },
  {
    id: "rec-14",
    tanggal: getDateDaysAgo(54),
    hari: "54 Hari",
    motor: "Honda CBR150R Repsol Edition",
    tahun: 2023,
    nopol: "N 2280 AB",
    nominal: 36200000,
    pemasukan: 1200000,
    jasaParkir: 400000,
    tarifJasa: 1200000,
    pemasukanConfirmedByPecel: true,
    pemasukanConfirmedAt: getDateDaysAgo(10),
    kepemilikan: "pecel",
    catatan: "Assist & Slipper Clutch",
  },
  {
    id: "rec-15",
    tanggal: getDateDaysAgo(60),
    hari: "60 Hari",
    motor: "Yamaha Grand Filano Hybrid Lux",
    tahun: 2024,
    nopol: "B 3192 FRX",
    nominal: 27500000,
    pemasukan: 900000,
    jasaParkir: 300000,
    tarifJasa: 900000,
    pemasukanConfirmedByPecel: true,
    kepemilikan: "mamah",
    catatan: "Classy Scooter White",
  },
  {
    id: "rec-16",
    tanggal: getDateDaysAgo(98),
    hari: "98 Hari",
    motor: "Yamaha MT-25 Dark Night",
    tahun: 2021,
    nopol: "B 4120 KLP",
    nominal: 42000000,
    pemasukan: 1500000,
    jasaParkir: 500000,
    tarifJasa: 1500000,
    pemasukanConfirmedByPecel: true,
    kepemilikan: "pecel",
    lunas: false,
    catatan: "Durasi masuk > 3 bulan (Status: LELANG)",
  },
  {
    id: "rec-17",
    tanggal: getDateDaysAgo(115),
    hari: "115 Hari",
    motor: "Honda CBR250RR SP Tri-Color",
    tahun: 2022,
    nopol: "D 3099 URT",
    nominal: 68000000,
    pemasukan: 2200000,
    jasaParkir: 800000,
    tarifJasa: 2200000,
    pemasukanConfirmedByPecel: true,
    kepemilikan: "pribadi",
    lunas: false,
    catatan: "Durasi masuk > 3 bulan (Status: LELANG)",
  },
  {
    id: "rec-18",
    tanggal: getDateDaysAgo(70),
    hari: "70 Hari",
    motor: "Yamaha Jupiter Z1 Fi",
    tahun: 2020,
    nopol: "B 6612 SXY",
    nominal: 12000000,
    pemasukan: 450000,
    jasaParkir: 150000,
    tarifJasa: 450000,
    pemasukanConfirmedByPecel: true,
    kepemilikan: "pecel",
    lunas: true,
    lunasAt: getDateDaysAgo(2),
    catatan: "Unit sudah lunas (Otomatis tidak tampil di tabel halaman utama)",
  },
];

export function formatRupiah(amount: number | undefined | null): string {
  if (amount === undefined || amount === null || isNaN(amount)) return "Rp 0";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}
