import React, { useState, useMemo } from 'react';
import {
  X,
  UserCheck,
  BarChart3,
  Printer,
  Download,
  Clock,
  Bike,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  DollarSign,
  FileSpreadsheet,
  CalendarDays,
  Flame,
  KeyRound,
  Eye,
  EyeOff,
  Lock,
  Check,
  Settings,
  ArrowLeft,
  LogOut,
  Home
} from 'lucide-react';
import { MotorRecord } from '../types';
import { calculateElapsedDays, formatElapsedDays, formatRupiah, getLunasRemainingDays } from '../data/initialData';
import { changePassword, DEFAULT_PASSWORD } from '../utils/auth';

interface PecelPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onLogout?: () => void;
  motorData: MotorRecord[];
  onConfirmPemasukan: (recordId: string, amount: number) => void;
  onCancelConfirmPemasukan?: (recordId: string) => void;
  onToggleLunas?: (recordId: string, isLunas?: boolean) => void;
}

export default function PecelPanel({
  isOpen,
  onClose,
  onLogout,
  motorData,
  onConfirmPemasukan,
  onCancelConfirmPemasukan,
  onToggleLunas
}: PecelPanelProps) {
  const [activeTab, setActiveTab] = useState<'data' | 'pengaturan'>('data');
  const [selectedRecordForConfirm, setSelectedRecordForConfirm] = useState<MotorRecord | null>(null);
  const [inputPemasukanAmount, setInputPemasukanAmount] = useState<number>(500000);
  const [filterConfirmStatus, setFilterConfirmStatus] = useState<'all' | 'confirmed' | 'pending'>('all');

  // Change Password State for PECEL
  const [pecelOldPassword, setPecelOldPassword] = useState('');
  const [pecelNewPassword, setPecelNewPassword] = useState('');
  const [pecelConfirmPassword, setPecelConfirmPassword] = useState('');
  const [showPecelOldPass, setShowPecelOldPass] = useState(false);
  const [showPecelNewPass, setShowPecelNewPass] = useState(false);
  const [showPecelConfirmPass, setShowPecelConfirmPass] = useState(false);
  const [pecelPassError, setPecelPassError] = useState('');
  const [pecelPassSuccess, setPecelPassSuccess] = useState('');

  const handleChangePecelPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPecelPassError('');
    setPecelPassSuccess('');

    const res = changePassword('pecel', pecelOldPassword, pecelNewPassword, pecelConfirmPassword);
    if (res.success) {
      setPecelPassSuccess(res.message);
      setPecelOldPassword('');
      setPecelNewPassword('');
      setPecelConfirmPassword('');
    } else {
      setPecelPassError(res.message);
    }
  };

  // STRICT ACCESS FILTER: Hanya data dengan kepemilikan 'pecel' yang masuk ke Halaman Pecel!
  // Sesuai mandat: Jasa Parkir TIDAK DAPAT DILIHAT oleh Pecel, hanya DRU yang tahu.
  const pecelData = useMemo(() => {
    return motorData.filter((m) => (m.kepemilikan || 'pecel') === 'pecel');
  }, [motorData]);

  const filteredPecelData = useMemo(() => {
    return pecelData.filter((m) => {
      if (filterConfirmStatus === 'confirmed') return !!m.pemasukanConfirmedByPecel;
      if (filterConfirmStatus === 'pending') return !m.pemasukanConfirmedByPecel;
      return true;
    });
  }, [pecelData, filterConfirmStatus]);

  // Breakdown by duration brackets for Pecel items
  const durationSummary = useMemo(() => {
    const brackets = [
      { label: 'Hari Ini (0 Hari)', min: 0, max: 0, color: 'text-emerald-400' },
      { label: '1 - 3 Hari', min: 1, max: 3, color: 'text-teal-400' },
      { label: '4 - 7 Hari (1 Minggu)', min: 4, max: 7, color: 'text-amber-400' },
      { label: '8 - 14 Hari (2 Minggu)', min: 8, max: 14, color: 'text-amber-300' },
      { label: '15 - 30 Hari (1 Bulan)', min: 15, max: 30, color: 'text-orange-400' },
      { label: '> 30 Hari (Lebih dari 1 Bulan)', min: 31, max: 99999, color: 'text-rose-400' }
    ];

    return brackets.map((b) => {
      const items = pecelData.filter((m) => {
        const days = calculateElapsedDays(m.tanggal);
        return days >= b.min && days <= b.max;
      });
      return {
        ...b,
        count: items.length
      };
    });
  }, [pecelData]);

  const pecelMetrics = useMemo(() => {
    const totalUnits = pecelData.length;
    const totalNominal = pecelData.reduce((acc, curr) => acc + (Number(curr.nominal) || 0), 0);
    // Pemasukan hanya dihitung dari yang sudah terkonfirmasi oleh Pecel
    const confirmedItems = pecelData.filter((m) => m.pemasukanConfirmedByPecel);
    const totalPemasukan = confirmedItems.reduce((acc, curr) => acc + (Number(curr.pemasukan) || 0), 0);
    const pendingUnits = totalUnits - confirmedItems.length;

    return { totalUnits, totalNominal, totalPemasukan, confirmedCount: confirmedItems.length, pendingUnits };
  }, [pecelData]);

  if (!isOpen) return null;

  const handleOpenConfirmDialog = (item: MotorRecord) => {
    setSelectedRecordForConfirm(item);
    // Suggest amount from item or calculate a reasonable default based on nominal / elapsed days
    const elapsedDays = calculateElapsedDays(item.tanggal);
    const suggested = item.pemasukan && item.pemasukan > 0
      ? item.pemasukan
      : Math.max(250000, Math.min(2500000, Math.round((Number(item.nominal || 25000000) * 0.03) / 10000) * 10000));
    setInputPemasukanAmount(suggested);
  };

  const handleExecuteConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecordForConfirm) return;
    onConfirmPemasukan(selectedRecordForConfirm.id, Number(inputPemasukanAmount) || 0);
    setSelectedRecordForConfirm(null);
  };

  const handleExportCSV = () => {
    const headers = 'ID,Tanggal Masuk,Lama Hari,Motor,Tahun,Nopol,Nominal,Status Pemasukan,Pemasukan Dikonfirmasi,Catatan\n';
    const rows = pecelData
      .map((m) => {
        const days = formatElapsedDays(m.tanggal);
        const status = m.pemasukanConfirmedByPecel ? 'Terkonfirmasi' : 'Menunggu Konfirmasi';
        const pemasukanVal = m.pemasukanConfirmedByPecel ? m.pemasukan || 0 : 0;
        return `"${m.id}","${m.tanggal}","${days}","${m.motor}","${m.tahun}","${m.nopol}","${m.nominal || 0}","${status}","${pemasukanVal}","${m.catatan || ''}"`;
      })
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Laporan_Khusus_PECEL_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div 
      id="modal-pecel-overlay" 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md"
    >
      <div 
        id="modal-pecel-container"
        className="bg-linear-to-b from-slate-900 via-slate-925 to-slate-950 text-slate-100 rounded-2xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] w-full max-w-5xl max-h-[94vh] flex flex-col border border-teal-500/30 overflow-hidden"
      >
        {/* Luxury Teal Top Stripe */}
        <div className="h-1 w-full bg-linear-to-r from-transparent via-teal-400 to-transparent" />

        {/* Header */}
        <div className="bg-slate-950/80 px-5 sm:px-8 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <button
              id="btn-back-pecel-header"
              type="button"
              onClick={onClose}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-teal-300 hover:text-teal-200 border border-teal-500/40 transition cursor-pointer text-xs font-bold active:scale-95 shadow-xs"
              title="Kembali ke Halaman Utama"
            >
              <ArrowLeft className="w-4 h-4 text-teal-400" />
              <span>Kembali ke Halaman Utama</span>
            </button>
            <div className="p-2.5 rounded-xl bg-teal-500/15 border border-teal-500/30 text-teal-400 font-bold">
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-transparent bg-clip-text bg-linear-to-r from-teal-200 via-teal-400 to-teal-100 tracking-wide uppercase">
                  Halaman PECEL
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/15 border border-teal-500/30 text-teal-300 uppercase">
                  Khusus Unit Motor Pecel
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Pemeriksaan unit, nominal, dan konfirmasi pemasukan motor pecel (otomatis tersinkron ke Halaman DRU)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onLogout && (
              <button
                id="btn-pecel-header-logout"
                type="button"
                onClick={onLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-950/70 hover:bg-rose-900 border border-rose-500/40 text-rose-300 hover:text-white transition cursor-pointer text-xs font-bold shadow-xs active:scale-95"
                title="Logout dan langsung keluar ke halaman utama"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-400" />
                <span>Logout</span>
              </button>
            )}
            <button
              id="btn-back-pecel-modal"
              type="button"
              onClick={onClose}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-teal-500/15 hover:bg-teal-500/25 text-teal-300 hover:text-teal-200 border border-teal-500/40 transition cursor-pointer text-xs font-bold active:scale-95 shadow-xs"
              title="Kembali ke Halaman Utama"
            >
              <Home className="w-3.5 h-3.5 text-teal-400" />
              <span>Halaman Utama</span>
            </button>
            <button
              id="btn-close-pecel-modal"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              title="Tutup (Kembali ke Halaman Utama)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs PECEL */}
        <div className="bg-slate-950 border-b border-slate-800 px-5 sm:px-8 flex items-center gap-2 py-2.5">
          <button
            id="tab-pecel-data"
            onClick={() => setActiveTab('data')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              activeTab === 'data'
                ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Data Unit & Pemasukan</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-teal-950 text-teal-300 border border-teal-500/40">
              {pecelData.length}
            </span>
          </button>

          <button
            id="tab-pecel-pengaturan"
            onClick={() => {
              setActiveTab('pengaturan');
              setPecelPassError('');
              setPecelPassSuccess('');
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              activeTab === 'pengaturan'
                ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Pengaturan Password</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-8 bg-slate-900/60 space-y-6">
          {activeTab === 'data' ? (
            <>
              {/* Reassurance Notice */}
              <div className="p-3.5 rounded-xl bg-teal-950/40 border border-teal-500/25 flex items-start gap-3 text-xs text-teal-200">
            <ShieldCheck className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-teal-300">Konfirmasi Pemasukan Pecel:</span>
              <p className="text-slate-300 text-[11px] mt-0.5 leading-relaxed">
                Ketika Anda menekan <strong>Konfirmasi Pemasukan</strong> pada salah satu unit di bawah ini, nilai pemasukan akan <strong>otomatis terisi</strong> di Dashboard Motor Pecel pada Halaman DRU. (Catatan: tarif jasa parkir dirahasiakan oleh sistem DRU).
              </p>
            </div>
          </div>

          {/* Metric Cards Pecel */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 shadow-md">
              <span className="text-xs text-slate-400 block font-medium flex items-center gap-1.5">
                <Bike className="w-3.5 h-3.5 text-teal-400" />
                <span>Unit Motor Pecel</span>
              </span>
              <span className="text-2xl font-black text-slate-100 font-mono mt-1 block">
                {pecelMetrics.totalUnits} Unit
              </span>
            </div>

            <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 shadow-md">
              <span className="text-xs text-slate-400 block font-medium flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                <span>Total Nominal</span>
              </span>
              <span className="text-sm sm:text-base font-bold text-emerald-400 font-mono mt-1 block truncate">
                {formatRupiah(pecelMetrics.totalNominal)}
              </span>
            </div>

            <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 shadow-md">
              <span className="text-xs text-slate-400 block font-medium flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-teal-400" />
                <span>Pemasukan Terkonfirmasi</span>
              </span>
              <span className="text-sm sm:text-base font-bold text-teal-300 font-mono mt-1 block truncate">
                {formatRupiah(pecelMetrics.totalPemasukan)}
              </span>
            </div>

            <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 shadow-md">
              <span className="text-xs text-slate-400 block font-medium flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                <span>Belum Konfirmasi</span>
              </span>
              <span className="text-2xl font-black text-amber-300 font-mono mt-1 block">
                {pecelMetrics.pendingUnits} Unit
              </span>
            </div>
          </div>

          {/* Table: Data Motor Milik Pecel dengan Kolom Nominal & Pemasukan */}
          <div className="bg-slate-950/80 p-5 rounded-2xl border border-slate-800 shadow-lg space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-100 flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-teal-400" />
                  <span>Daftar Unit Motor Pecel ({filteredPecelData.length})</span>
                </h3>
                <span className="text-xs text-slate-400">
                  Tabel sama seperti utama dengan tambahan <strong>Nominal</strong> dan <strong>Pemasukan</strong>
                </span>
              </div>

              {/* Filter status konfirmasi & Navigasi */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  id="btn-table-home-pecel"
                  onClick={onClose}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-750 text-xs font-semibold transition cursor-pointer active:scale-95 shadow-xs"
                  title="Kembali ke Halaman Utama"
                >
                  <Home className="w-3.5 h-3.5 text-teal-400" />
                  <span>Kembali ke Halaman Utama</span>
                </button>
                <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-750 p-1 rounded-xl text-xs">
                  <button
                    onClick={() => setFilterConfirmStatus('all')}
                    className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                      filterConfirmStatus === 'all'
                        ? 'bg-teal-500/20 text-teal-300 font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Semua ({pecelData.length})
                  </button>
                  <button
                    onClick={() => setFilterConfirmStatus('confirmed')}
                    className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                      filterConfirmStatus === 'confirmed'
                        ? 'bg-emerald-500/20 text-emerald-300 font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Terkonfirmasi ({pecelMetrics.confirmedCount})
                  </button>
                  <button
                    onClick={() => setFilterConfirmStatus('pending')}
                    className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                      filterConfirmStatus === 'pending'
                        ? 'bg-amber-500/20 text-amber-300 font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Perlu Konfirmasi ({pecelMetrics.pendingUnits})
                  </button>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto max-h-[380px] border border-slate-800 rounded-xl">
              <table className="w-full text-xs text-left min-w-max">
                <thead className="bg-slate-900 text-teal-300 uppercase font-bold sticky top-0 border-b border-slate-800 z-10">
                  <tr>
                    <th className="py-3 px-3 whitespace-nowrap">Tgl Masuk</th>
                    <th className="py-3 px-3 whitespace-nowrap">Hari (Lama)</th>
                    <th className="py-3 px-3 whitespace-nowrap">Motor</th>
                    <th className="py-3 px-3 text-center whitespace-nowrap">Tahun</th>
                    <th className="py-3 px-3 text-center whitespace-nowrap">Nopol</th>
                    <th className="py-3 px-3 text-right whitespace-nowrap">Nominal</th>
                    <th className="py-3 px-3 text-right whitespace-nowrap">Pemasukan</th>
                    <th className="py-3 px-3 text-center whitespace-nowrap">Status</th>
                    <th className="py-3 px-3 text-center whitespace-nowrap">Aksi Konfirmasi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {filteredPecelData.length > 0 ? (
                    filteredPecelData.map((item) => {
                      const days = formatElapsedDays(item.tanggal);
                      const elapsed = calculateElapsedDays(item.tanggal);
                      const isConfirmed = !!item.pemasukanConfirmedByPecel;
                      return (
                        <tr key={item.id} className="hover:bg-slate-900/60 transition">
                          <td className="py-2.5 px-3 font-mono text-slate-300 whitespace-nowrap">{item.tanggal}</td>
                          <td className="py-2.5 px-3 font-mono font-bold text-teal-300 whitespace-nowrap">{days}</td>
                          <td className="py-2.5 px-3 font-semibold text-slate-100 whitespace-nowrap">
                            <div>{item.motor}</div>
                            {item.catatan && (
                              <div className="text-[10px] text-slate-400">{item.catatan}</div>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center text-slate-400 font-mono">{item.tahun}</td>
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-amber-400 whitespace-nowrap">
                            {item.nopol}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400 whitespace-nowrap">
                            {formatRupiah(item.nominal)}
                          </td>

                          {/* Kolom Pemasukan */}
                          <td className="py-2.5 px-3 text-right whitespace-nowrap">
                            {isConfirmed && item.pemasukan && item.pemasukan > 0 ? (
                              <div className="flex flex-col items-end">
                                <span className="font-mono font-bold text-teal-300">
                                  {formatRupiah(item.pemasukan)}
                                </span>
                                <span className="text-[9px] text-emerald-400 font-semibold flex items-center gap-0.5">
                                  <CheckCircle2 className="w-2.5 h-2.5" />
                                  Terkonfirmasi Pecel
                                </span>
                              </div>
                            ) : (
                              <div className="flex flex-col items-end gap-1">
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                  Pending
                                </span>
                                {item.statusKirimPecel === 'terkirim' && item.nominalKirimPecel ? (
                                  <span className="text-[9px] text-teal-300 font-mono">
                                    DRU: {formatRupiah(item.nominalKirimPecel)}
                                  </span>
                                ) : null}
                              </div>
                            )}
                          </td>

                          {/* Kolom Status (LELANG / PARKIR / LUNAS) */}
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            {item.lunas ? (
                              <div className="flex flex-col items-center gap-1">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                  <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                                  <span>LUNAS</span>
                                </span>
                                <span className="text-[9px] text-amber-300/90 font-medium">
                                  Hilang dlm {getLunasRemainingDays(item.lunasAt)} hari
                                </span>
                                {onToggleLunas && (
                                  <button
                                    type="button"
                                    onClick={() => onToggleLunas(item.id, false)}
                                    className="text-[9px] text-slate-400 hover:text-amber-300 underline cursor-pointer"
                                  >
                                    Batal Lunas
                                  </button>
                                )}
                              </div>
                            ) : (
                              <div className="flex flex-col items-center gap-1">
                                {elapsed > 90 ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                                    <Flame className="w-2.5 h-2.5 text-rose-400" />
                                    <span>LELANG</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                    <Clock className="w-2.5 h-2.5 text-amber-400" />
                                    <span>PARKIR</span>
                                  </span>
                                )}
                                {onToggleLunas && (
                                  <button
                                    type="button"
                                    onClick={() => onToggleLunas(item.id, true)}
                                    className="text-[9px] text-emerald-400 hover:text-emerald-300 underline font-medium cursor-pointer"
                                    title="Tandai Lunas (akan hilang otomatis 1 minggu setelah lunas)"
                                  >
                                    Tandai Lunas
                                  </button>
                                )}
                              </div>
                            )}
                          </td>

                          {/* Kolom Aksi Konfirmasi */}
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            {isConfirmed ? (
                              <div className="flex items-center justify-center">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px] font-bold shadow-xs">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                  <span>Terkonfirmasi</span>
                                </span>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleOpenConfirmDialog(item)}
                                className="px-3 py-1.5 rounded-lg bg-linear-to-r from-teal-600 to-teal-500 hover:from-teal-500 hover:to-teal-400 text-white font-bold text-[11px] shadow-sm shadow-teal-500/30 transition cursor-pointer flex items-center gap-1 mx-auto active:scale-95"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Konfirmasi Pemasukan</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={9} className="py-10 text-center text-slate-400">
                        Belum ada unit dengan kepemilikan Pecel. Pengelola DRU dapat menambahkan data melalui panel DRU.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Breakdown by Duration for Pecel */}
          <div className="bg-slate-950/80 p-5 sm:p-6 rounded-2xl border border-slate-800 shadow-lg space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm sm:text-base font-bold text-slate-100 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-teal-400" />
                <span>Audit Durasi Motor Masuk (Khusus Pecel)</span>
              </h3>
              <span className="text-xs text-slate-400">
                Dihitung dari tanggal masuk hingga hari ini
              </span>
            </div>

            <div className="overflow-x-auto border border-slate-800 rounded-xl">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-900 text-slate-300 uppercase font-bold border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Rentang Waktu (Hari)</th>
                    <th className="py-3 px-4 text-center">Jumlah Unit Pecel</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {durationSummary.map((item) => (
                    <tr key={item.label} className="hover:bg-slate-900/60 transition">
                      <td className={`py-3 px-4 font-bold ${item.color} flex items-center gap-2`}>
                        <Clock className="w-3.5 h-3.5 opacity-70" />
                        <span>{item.label}</span>
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-slate-300">
                        {item.count > 0 ? `${item.count} Unit` : 'Nihil'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Action Tools */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="text-xs text-slate-400 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-teal-400" />
              <span>Pemasukan yang Anda konfirmasi akan otomatis tersinkronisasi ke Dashboard Motor Pecel di Halaman DRU.</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                id="btn-print-pecel"
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-750 text-slate-300 hover:bg-slate-800 text-xs font-bold transition cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak / PDF</span>
              </button>
              <button
                id="btn-export-csv-pecel"
                onClick={handleExportCSV}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-linear-to-r from-teal-600 to-teal-700 hover:from-teal-500 hover:to-teal-600 text-white text-xs font-bold transition shadow-lg shadow-teal-600/20 active:scale-95 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Ekspor CSV Laporan Pecel</span>
              </button>
            </div>
          </div>
            </>
          ) : (
            /* TAB PENGATURAN PASSWORD PECEL */
            <div className="max-w-xl mx-auto space-y-6 animate-in fade-in duration-200">
              <div className="bg-slate-950/80 p-6 rounded-2xl border border-teal-500/30 shadow-xl space-y-5">
                <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
                  <div className="p-2.5 rounded-xl bg-teal-500/15 border border-teal-500/30 text-teal-400">
                    <KeyRound className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                      <span>Pengaturan Password Akun PECEL</span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      Ubah kata sandi akun PECEL untuk akses panel verifikasi dan konfirmasi pemasukan.
                    </p>
                  </div>
                </div>

                {/* Profil Akun PECEL */}
                <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Username Akun:</span>
                    <span className="font-mono font-bold text-teal-300 bg-teal-500/15 border border-teal-500/30 px-2.5 py-0.5 rounded-md flex items-center gap-1.5">
                      <Lock className="w-3 h-3 text-teal-400" />
                      <span>PECEL (Permanen)</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Tingkat Hak Akses:</span>
                    <span className="text-slate-200 font-semibold">Pengawas & Verifikator Unit Pecel</span>
                  </div>
                </div>

                {/* Form Ubah Password PECEL */}
                <form onSubmit={handleChangePecelPassword} className="space-y-4">
                  {/* Password Lama */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Password Saat Ini (Lama)
                    </label>
                    <div className="relative">
                      <input
                        type={showPecelOldPass ? 'text' : 'password'}
                        placeholder="Masukkan password saat ini..."
                        value={pecelOldPassword}
                        onChange={(e) => setPecelOldPassword(e.target.value)}
                        className="w-full pl-3.5 pr-11 py-2.5 text-xs sm:text-sm bg-slate-950 border border-slate-750 focus:border-teal-400 rounded-xl text-slate-100 placeholder:text-slate-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPecelOldPass(!showPecelOldPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-teal-300 p-1"
                        title={showPecelOldPass ? "Sembunyikan" : "Tampilkan"}
                      >
                        {showPecelOldPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Password Baru */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Password Baru
                    </label>
                    <div className="relative">
                      <input
                        type={showPecelNewPass ? 'text' : 'password'}
                        placeholder="Masukkan password baru (min 4 karakter)..."
                        value={pecelNewPassword}
                        onChange={(e) => setPecelNewPassword(e.target.value)}
                        className="w-full pl-3.5 pr-11 py-2.5 text-xs sm:text-sm bg-slate-950 border border-slate-750 focus:border-teal-400 rounded-xl text-slate-100 placeholder:text-slate-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPecelNewPass(!showPecelNewPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-teal-300 p-1"
                        title={showPecelNewPass ? "Sembunyikan" : "Tampilkan"}
                      >
                        {showPecelNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Konfirmasi Password Baru */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Konfirmasi Password Baru
                    </label>
                    <div className="relative">
                      <input
                        type={showPecelConfirmPass ? 'text' : 'password'}
                        placeholder="Ketik ulang password baru..."
                        value={pecelConfirmPassword}
                        onChange={(e) => setPecelConfirmPassword(e.target.value)}
                        className="w-full pl-3.5 pr-11 py-2.5 text-xs sm:text-sm bg-slate-950 border border-slate-750 focus:border-teal-400 rounded-xl text-slate-100 placeholder:text-slate-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPecelConfirmPass(!showPecelConfirmPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-teal-300 p-1"
                        title={showPecelConfirmPass ? "Sembunyikan" : "Tampilkan"}
                      >
                        {showPecelConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {pecelPassError && (
                    <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-500/50 text-rose-300 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{pecelPassError}</span>
                    </div>
                  )}

                  {pecelPassSuccess && (
                    <div className="p-3 rounded-xl bg-emerald-950/70 border border-emerald-500/50 text-emerald-300 text-xs flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>{pecelPassSuccess}</span>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
                    <button
                      type="button"
                      id="btn-pecel-password-home"
                      onClick={onClose}
                      className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-teal-300 hover:text-teal-200 border border-teal-500/40 text-xs font-bold transition cursor-pointer active:scale-95 shadow-xs"
                      title="Kembali ke Halaman Utama"
                    >
                      <Home className="w-3.5 h-3.5 text-teal-400" />
                      <span>Kembali ke Halaman Utama</span>
                    </button>
                    <button
                      type="submit"
                      id="btn-save-pecel-password"
                      className="w-full flex-1 py-2.5 px-4 rounded-xl bg-linear-to-r from-teal-600 to-teal-700 hover:from-teal-500 hover:to-teal-600 text-white font-bold text-xs sm:text-sm shadow-md shadow-teal-600/20 transition cursor-pointer active:scale-95 flex items-center justify-center gap-2"
                    >
                      <Check className="w-4 h-4" />
                      <span>Simpan Password Baru PECEL</span>
                    </button>
                  </div>
                </form>

                {/* Catatan Bantuan Pemulihan */}
                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-400 space-y-1">
                  <span className="font-semibold text-teal-300 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
                    <span>Bantuan Pemulihan Kata Sandi:</span>
                  </span>
                  <p className="text-[11px] leading-relaxed">
                    Jika sewaktu-waktu Anda lupa password, gunakan opsi <strong>"Lupa Password?"</strong> di pintu masuk login dan masukkan kode pemulihan khusus untuk mengembalikan password ke setelan normal default (<strong>123456</strong>).
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-950 px-5 sm:px-8 py-3.5 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
          <span>* Jasa parkir dan data motor pribadi/mamah dirahasiakan khusus untuk DRU.</span>
          <div className="flex items-center gap-2">
            {onLogout && (
              <button
                id="btn-pecel-bottom-logout"
                type="button"
                onClick={onLogout}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-950/70 hover:bg-rose-900 text-rose-200 hover:text-white text-xs font-bold transition cursor-pointer border border-rose-500/40 active:scale-95 shadow-xs"
                title="Logout dan langsung keluar ke halaman utama"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-400" />
                <span>Logout ke Halaman Utama</span>
              </button>
            )}
            <button
              id="btn-close-pecel-modal-bottom"
              onClick={onClose}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition cursor-pointer border border-slate-750 active:scale-95"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-teal-400" />
              <span>Kembali ke Halaman Utama</span>
            </button>
          </div>
        </div>
      </div>

      {/* Dialog Konfirmasi Pemasukan */}
      {selectedRecordForConfirm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-slate-900 border border-teal-500/40 rounded-2xl p-6 max-w-md w-full shadow-2xl text-slate-100 animate-in fade-in zoom-in duration-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-teal-500/20 text-teal-400">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-100">Konfirmasi Pemasukan Pecel</h3>
                  <p className="text-[11px] text-slate-400">Otomatis terisi ke Dashboard Halaman DRU</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedRecordForConfirm(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Motor:</span>
                <span className="font-bold text-slate-200">{selectedRecordForConfirm.motor}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Nopol:</span>
                <span className="font-mono font-bold text-amber-400">{selectedRecordForConfirm.nopol}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Nominal Motor:</span>
                <span className="font-mono font-bold text-emerald-400">
                  {formatRupiah(selectedRecordForConfirm.nominal)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Tanggal Masuk:</span>
                <span className="font-mono text-slate-300">{selectedRecordForConfirm.tanggal} ({formatElapsedDays(selectedRecordForConfirm.tanggal)})</span>
              </div>
            </div>

            <form onSubmit={handleExecuteConfirm} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>Nominal Pemasukan yang Diterima (Rp):</span>
                  {selectedRecordForConfirm.statusKirimPecel === 'terkirim' && selectedRecordForConfirm.nominalKirimPecel ? (
                    <span className="text-[10px] text-amber-300 font-semibold flex items-center gap-1">
                      <Lock className="w-3 h-3 text-amber-400" />
                      Terkunci (Dikirim oleh DRU)
                    </span>
                  ) : null}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    step={10000}
                    required
                    readOnly={!!(selectedRecordForConfirm.statusKirimPecel === 'terkirim' && selectedRecordForConfirm.nominalKirimPecel)}
                    value={inputPemasukanAmount}
                    onChange={(e) => {
                      if (!(selectedRecordForConfirm.statusKirimPecel === 'terkirim' && selectedRecordForConfirm.nominalKirimPecel)) {
                        setInputPemasukanAmount(Number(e.target.value));
                      }
                    }}
                    className={`w-full px-3 py-2.5 bg-slate-950 border rounded-xl text-teal-300 font-mono font-bold text-sm focus:outline-none ${
                      selectedRecordForConfirm.statusKirimPecel === 'terkirim' && selectedRecordForConfirm.nominalKirimPecel
                        ? 'border-amber-500/40 bg-slate-900/60 cursor-not-allowed text-teal-200'
                        : 'border-teal-500/50 focus:ring-2 focus:ring-teal-400'
                    }`}
                  />
                </div>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-[11px] text-teal-400 font-mono font-bold">
                    {formatRupiah(inputPemasukanAmount)}
                  </p>
                  {selectedRecordForConfirm.statusKirimPecel === 'terkirim' && selectedRecordForConfirm.nominalKirimPecel ? (
                    <span className="text-[10px] text-slate-400 italic">
                      * Nominal dikirim langsung dari DRU dan tidak dapat diedit
                    </span>
                  ) : null}
                </div>
              </div>

              {/* Preset buttons hanya muncul jika bukan kiriman terkunci dari DRU */}
              {!(selectedRecordForConfirm.statusKirimPecel === 'terkirim' && selectedRecordForConfirm.nominalKirimPecel) && (
                <div className="flex flex-wrap gap-1.5">
                  {[300000, 500000, 750000, 1000000, 1500000].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setInputPemasukanAmount(preset)}
                      className="px-2.5 py-1 text-[10px] rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono border border-slate-700 cursor-pointer"
                    >
                      {formatRupiah(preset)}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedRecordForConfirm(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-linear-to-r from-teal-600 to-teal-500 hover:from-teal-500 hover:to-teal-400 text-white shadow-md shadow-teal-500/30 cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Simpan & Konfirmasi</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
