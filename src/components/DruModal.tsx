import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  X,
  Upload,
  Image as ImageIcon,
  Plus,
  Trash2,
  Edit2,
  Check,
  RotateCcw,
  ShieldCheck,
  Clock,
  AlertCircle,
  TrendingUp,
  DollarSign,
  Layers,
  Lock,
  Search,
  Bike,
  CalendarDays,
  Sparkles,
  ParkingMeter,
  Crop,
  CheckCircle2,
  Flame,
  Tag,
  KeyRound,
  Eye,
  EyeOff,
  Settings,
  Send,
  ArrowLeft,
  Home,
  RefreshCw
} from 'lucide-react';
import { MotorRecord, AppConfig, KepemilikanType } from '../types';
import { calculateElapsedDays, formatElapsedDays, formatRupiah, getLunasRemainingDays } from '../data/initialData';
import { changePassword, DEFAULT_PASSWORD } from '../utils/auth';
import LogoCropModal from './LogoCropModal';

interface DruModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogout?: () => void;
  config: AppConfig;
  onUpdateLogo: (logoUrl: string | null) => Promise<void> | void;
  motorData: MotorRecord[];
  onAddMotor: (newRecord: Omit<MotorRecord, 'id'>) => Promise<void> | void;
  onUpdateMotor: (id: string, updatedRecord: Partial<MotorRecord>) => Promise<void> | void;
  onDeleteMotor: (id: string) => Promise<void> | void;
  onResetMotorData: () => void;
  onToggleLunas?: (id: string, isLunas?: boolean) => void;
  onSendPemasukanToPecel?: (id: string, amount: number, notes?: string) => void;
  initialEditingId?: string | null;
}

type DruTab = 'dashboard_pecel' | 'dashboard_mamah' | 'dashboard_pribadi' | 'input_data' | 'logo' | 'pengaturan';

interface ManualPemasukanCellProps {
  motorId: string;
  currentPemasukan?: number;
  onSave: (id: string, amount: number) => void;
}

const ManualPemasukanCell: React.FC<ManualPemasukanCellProps> = ({
  motorId,
  currentPemasukan = 0,
  onSave
}) => {
  const [val, setVal] = useState<string>(currentPemasukan > 0 ? currentPemasukan.toLocaleString('id-ID') : '');
  const [isSaved, setIsSaved] = useState(false);

  // Sync state if currentPemasukan changes externally
  React.useEffect(() => {
    setVal(currentPemasukan > 0 ? currentPemasukan.toLocaleString('id-ID') : '');
  }, [currentPemasukan]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, '');
    if (!raw) {
      setVal('');
    } else {
      const num = parseInt(raw, 10);
      setVal(num.toLocaleString('id-ID'));
    }
    setIsSaved(false);
  };

  const handleSave = () => {
    const cleanNum = parseInt(val.replace(/[^0-9]/g, ''), 10) || 0;
    onSave(motorId, cleanNum);
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
    }, 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-1.5 justify-end">
        <div className="relative">
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-400 select-none pointer-events-none">
            Rp
          </span>
          <input
            type="text"
            inputMode="numeric"
            value={val}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="0"
            className="w-24 sm:w-28 pl-7 pr-2 py-1 bg-slate-900 border border-slate-700 hover:border-slate-600 focus:border-teal-400 rounded-lg text-xs font-mono font-bold text-teal-300 text-right focus:outline-none transition shadow-inner"
            title="Ketik nominal pemasukan manual, lalu klik tombol Simpan atau tekan Enter"
          />
        </div>
        <button
          type="button"
          onClick={handleSave}
          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer flex items-center gap-1 active:scale-95 shadow-xs whitespace-nowrap ${
            isSaved
              ? 'bg-emerald-600 text-white'
              : 'bg-teal-600 hover:bg-teal-500 text-white'
          }`}
          title="Simpan pemasukan ke motor ini"
        >
          <Check className="w-3 h-3" />
          <span>{isSaved ? 'Tersimpan' : 'Simpan'}</span>
        </button>
      </div>
      {currentPemasukan > 0 && !isSaved && (
        <span className="text-[10px] text-teal-400/80 font-mono">
          Tersimpan: {formatRupiah(currentPemasukan)}
        </span>
      )}
    </div>
  );
};

export default function DruModal({
  isOpen,
  onClose,
  onLogout,
  config,
  onUpdateLogo,
  motorData,
  onAddMotor,
  onUpdateMotor,
  onDeleteMotor,
  onResetMotorData,
  onToggleLunas,
  onSendPemasukanToPecel,
  initialEditingId
}: DruModalProps) {
  // Default to the first requested dashboard: MOTOR PECEL
  const [activeTab, setActiveTab] = useState<DruTab>('dashboard_pecel');

  // Search filter inside active dashboard
  const [dashboardSearch, setDashboardSearch] = useState('');

  // State for Sending Nominal Pemasukan to Pecel (Logo Kirim disebelah tong sampah)
  const [itemToSendPecel, setItemToSendPecel] = useState<MotorRecord | null>(null);
  const [sendPemasukanAmount, setSendPemasukanAmount] = useState<number>(500000);
  const [sendPemasukanNotes, setSendPemasukanNotes] = useState<string>('');
  const [sendSuccessToast, setSendSuccessToast] = useState<string>('');

  // Handler Logout otomatis dan kembali ke halaman utama yang public
  const handleExitAndLogout = () => {
    if (onLogout) {
      onLogout();
    } else {
      onClose();
    }
  };

  const handleOpenSendPecel = (item: MotorRecord) => {
    setItemToSendPecel(item);
    setSendPemasukanAmount(item.nominalKirimPecel || item.nominal || item.pemasukan || 500000);
    setSendPemasukanNotes(item.catatanKirimPecel || '');
  };

  const handleExecuteSendPecel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemToSendPecel) return;

    const amount = Number(sendPemasukanAmount);
    if (amount <= 0) return;

    if (onSendPemasukanToPecel) {
      onSendPemasukanToPecel(itemToSendPecel.id, amount, sendPemasukanNotes);
    } else {
      onUpdateMotor(itemToSendPecel.id, {
        nominalKirimPecel: amount,
        statusKirimPecel: 'terkirim',
        tanggalKirimPecel: new Date().toISOString().split('T')[0],
        catatanKirimPecel: sendPemasukanNotes,
        pemasukanConfirmedByPecel: false
      });
    }

    setSendSuccessToast(`Nominal pemasukan ${formatRupiah(amount)} untuk ${itemToSendPecel.motor} (${itemToSendPecel.nopol}) berhasil dikirim ke Halaman Pecel!`);
    setItemToSendPecel(null);

    setTimeout(() => {
      setSendSuccessToast('');
    }, 4500);
  };

  // Form State for Adding/Editing Record
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formTanggal, setFormTanggal] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [formHari, setFormHari] = useState<string>(() => {
    return formatElapsedDays(new Date().toISOString().split('T')[0]);
  });
  const [formMotor, setFormMotor] = useState<string>('');
  const [formTahun, setFormTahun] = useState<number | string>(new Date().getFullYear());
  const [formNopol, setFormNopol] = useState<string>('');
  const [formNominal, setFormNominal] = useState<number | string>('');
  const [formPemasukan, setFormPemasukan] = useState<number | string>('');
  const [formJasaParkir, setFormJasaParkir] = useState<number | string>('');
  const [formKepemilikan, setFormKepemilikan] = useState<KepemilikanType>('pecel');
  const [formLunas, setFormLunas] = useState<boolean>(false);
  const [formCatatan, setFormCatatan] = useState<string>('');
  const [formError, setFormError] = useState<string>('');
  const [formSuccess, setFormSuccess] = useState<string>('');

  // Delete Confirmation State (Bypasses window.confirm for iframe safety)
  const [itemToDelete, setItemToDelete] = useState<MotorRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [deleteNotice, setDeleteNotice] = useState<string>('');

  // Logo input state
  const [customLogoUrl, setCustomLogoUrl] = useState<string>(config.logoUrl || '');
  const [logoMessage, setLogoMessage] = useState<string>('');
  const [isSavingLogo, setIsSavingLogo] = useState<boolean>(false);
  const [isCropModalOpen, setIsCropModalOpen] = useState<boolean>(false);
  const [imageToCrop, setImageToCrop] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync logo when updated from Firestore on any device
  useEffect(() => {
    if (config?.logoUrl !== undefined) {
      setCustomLogoUrl(config.logoUrl || '');
    }
  }, [config?.logoUrl, isOpen]);

  // Handle external editing trigger
  useEffect(() => {
    if (initialEditingId && isOpen) {
      const target = motorData.find((m) => m.id === initialEditingId);
      if (target) {
        handleStartEdit(target);
      }
    }
  }, [initialEditingId, isOpen, motorData]);

  // Change Password State for DRU
  const [druOldPassword, setDruOldPassword] = useState('');
  const [druNewPassword, setDruNewPassword] = useState('');
  const [druConfirmPassword, setDruConfirmPassword] = useState('');
  const [showDruOldPass, setShowDruOldPass] = useState(false);
  const [showDruNewPass, setShowDruNewPass] = useState(false);
  const [showDruConfirmPass, setShowDruConfirmPass] = useState(false);
  const [druPassError, setDruPassError] = useState('');
  const [druPassSuccess, setDruPassSuccess] = useState('');

  const handleChangeDruPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setDruPassError('');
    setDruPassSuccess('');

    const res = changePassword('dru', druOldPassword, druNewPassword, druConfirmPassword);
    if (res.success) {
      setDruPassSuccess(res.message);
      setDruOldPassword('');
      setDruNewPassword('');
      setDruConfirmPassword('');
    } else {
      setDruPassError(res.message);
    }
  };

  // Group motors by ownership for the 3 distinct dashboards
  const pecelMotors = useMemo(() => {
    return motorData.filter((m) => (m.kepemilikan || 'pecel') === 'pecel');
  }, [motorData]);

  const mamahMotors = useMemo(() => {
    return motorData.filter((m) => m.kepemilikan === 'mamah');
  }, [motorData]);

  const pribadiMotors = useMemo(() => {
    return motorData.filter((m) => m.kepemilikan === 'pribadi');
  }, [motorData]);

  // Financial metrics for each dashboard
  const getDashboardMetrics = (records: MotorRecord[]) => {
    const count = records.length;
    const totalNominal = records.reduce((acc, curr) => acc + (Number(curr.nominal) || 0), 0);
    const totalPemasukan = records.reduce((acc, curr) => acc + (Number(curr.pemasukan) || 0), 0);
    const totalJasaParkir = records.reduce((acc, curr) => acc + (Number(curr.jasaParkir ?? curr.tarifJasa) || 0), 0);
    return { count, totalNominal, totalPemasukan, totalJasaParkir };
  };

  const pecelMetrics = useMemo(() => getDashboardMetrics(pecelMotors), [pecelMotors]);
  const mamahMetrics = useMemo(() => getDashboardMetrics(mamahMotors), [mamahMotors]);
  const pribadiMetrics = useMemo(() => getDashboardMetrics(pribadiMotors), [pribadiMotors]);

  if (!isOpen) return null;

  // Auto set Hari: jumlah hari dari saat motor masuk sampai hari ini
  const handleTanggalChange = (val: string) => {
    setFormTanggal(val);
    const calculatedDays = formatElapsedDays(val);
    setFormHari(calculatedDays);
  };

  const handleStartEdit = (record: MotorRecord) => {
    setEditingId(record.id);
    setFormTanggal(record.tanggal);
    setFormHari(formatElapsedDays(record.tanggal));
    setFormMotor(record.motor);
    setFormTahun(record.tahun);
    setFormNopol(record.nopol);
    setFormNominal(record.nominal !== undefined ? record.nominal : '');
    setFormPemasukan(record.pemasukan !== undefined ? record.pemasukan : '');
    setFormJasaParkir(record.jasaParkir !== undefined ? record.jasaParkir : record.tarifJasa || '');
    setFormKepemilikan(record.kepemilikan || 'pecel');
    setFormLunas(!!record.lunas);
    setFormCatatan(record.catatan || '');
    setFormError('');
    setFormSuccess('');
    setActiveTab('input_data');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    resetFormFields();
  };

  const resetFormFields = (preselectKepemilikan?: KepemilikanType) => {
    const today = new Date().toISOString().split('T')[0];
    setFormTanggal(today);
    setFormHari(formatElapsedDays(today));
    setFormMotor('');
    setFormTahun(new Date().getFullYear());
    setFormNopol('');
    setFormNominal('');
    setFormPemasukan('');
    setFormJasaParkir('');
    setFormKepemilikan(preselectKepemilikan || 'pecel');
    setFormLunas(false);
    setFormCatatan('');
  };

  const handleOpenAddWithOwnership = (type: KepemilikanType) => {
    setEditingId(null);
    resetFormFields(type);
    setActiveTab('input_data');
  };

  const handleSaveMotor = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!formTanggal) {
      setFormError('Tanggal masuk motor harus diisi.');
      return;
    }
    if (!formMotor.trim()) {
      setFormError('Nama Motor harus diisi.');
      return;
    }
    if (!formNopol.trim()) {
      setFormError('Nomor Polisi (Nopol) harus diisi.');
      return;
    }

    const jasaParkirNum = formJasaParkir !== '' && !isNaN(Number(formJasaParkir)) ? Number(formJasaParkir) : 0;

    if (jasaParkirNum < 15000) {
      setFormError('Jasa Parkir minimal Rp 15.000.');
      return;
    }
    if (jasaParkirNum % 1000 !== 0) {
      setFormError('Jasa Parkir harus kelipatan Rp 1.000 (contoh: 15.000, 16.000, 20.000).');
      return;
    }

    const nominalPokokNum = formNominal !== '' && !isNaN(Number(formNominal)) ? Number(formNominal) : 0;

    if (!editingId && nominalPokokNum <= 0) {
      setFormError('Nominal Pokok harus diisi untuk pendaftaran motor baru.');
      return;
    }

    const currentRecord = editingId ? motorData.find((m) => m.id === editingId) : null;
    const payload = {
      tanggal: formTanggal,
      hari: formatElapsedDays(formTanggal),
      motor: formMotor.trim(),
      tahun: Number(formTahun) || formTahun,
      nopol: formNopol.trim().toUpperCase(),
      nominal: editingId ? (currentRecord?.nominal || 0) : nominalPokokNum,
      pemasukan: editingId ? (currentRecord?.pemasukan || 0) : 0,
      jasaParkir: jasaParkirNum,
      tarifJasa: jasaParkirNum,
      pemasukanConfirmedByPecel: editingId ? !!currentRecord?.pemasukanConfirmedByPecel : false,
      statusKirimPecel: editingId ? currentRecord?.statusKirimPecel : undefined,
      nominalKirimPecel: editingId ? currentRecord?.nominalKirimPecel : undefined,
      tanggalKirimPecel: editingId ? currentRecord?.tanggalKirimPecel : undefined,
      catatanKirimPecel: editingId ? currentRecord?.catatanKirimPecel : undefined,
      kepemilikan: formKepemilikan,
      lunas: editingId ? !!currentRecord?.lunas : false,
      lunasAt: editingId ? currentRecord?.lunasAt : undefined,
      catatan: formCatatan.trim()
    };

    if (editingId) {
      onUpdateMotor(editingId, payload);
      setFormSuccess(`Unit motor ${payload.nopol} berhasil diperbarui!`);
      setEditingId(null);
    } else {
      onAddMotor(payload);
      setFormSuccess(`Unit motor ${payload.nopol} berhasil ditambahkan ke sistem!`);
    }

    resetFormFields(formKepemilikan);
  };

  // Handle Logo Update
  const handleSaveLogoUrl = async () => {
    setIsSavingLogo(true);
    setLogoMessage('Sedang menyimpan logo ke database...');
    try {
      await onUpdateLogo(customLogoUrl.trim() || null);
      setLogoMessage('Logo berhasil disimpan & tersinkronkan ke seluruh perangkat!');
    } catch (err: any) {
      console.error('Failed to save logo:', err);
      setLogoMessage('Gagal menyimpan logo: ' + (err?.message || 'Periksa koneksi'));
    } finally {
      setIsSavingLogo(false);
      setTimeout(() => setLogoMessage(''), 4000);
    }
  };

  const handleLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setLogoMessage('Ukuran file maksimal 5MB.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        // Buka modal crop agar DRU dapat menyesuaikan ukuran dan posisi logo
        setImageToCrop(base64);
        setIsCropModalOpen(true);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveCroppedLogo = async (croppedDataUrl: string) => {
    setCustomLogoUrl(croppedDataUrl);
    setIsSavingLogo(true);
    setLogoMessage('Sedang menyimpan logo cropped ke database...');
    try {
      await onUpdateLogo(croppedDataUrl);
      setLogoMessage('Logo berhasil disimpan & tersinkronkan ke seluruh perangkat!');
    } catch (err: any) {
      console.error('Failed to save cropped logo:', err);
      setLogoMessage('Gagal menyimpan logo: ' + (err?.message || 'Periksa koneksi'));
    } finally {
      setIsSavingLogo(false);
      setIsCropModalOpen(false);
      setTimeout(() => setLogoMessage(''), 4000);
    }
  };

  const handleOpenCropCurrentLogo = () => {
    if (customLogoUrl) {
      setImageToCrop(customLogoUrl);
      setIsCropModalOpen(true);
    }
  };

  const handleCropFromUrl = () => {
    if (!customLogoUrl.trim()) {
      setLogoMessage('Masukkan alamat URL gambar logo terlebih dahulu.');
      return;
    }
    setImageToCrop(customLogoUrl.trim());
    setIsCropModalOpen(true);
  };

  const handleRemoveLogo = async () => {
    setCustomLogoUrl('');
    setIsSavingLogo(true);
    try {
      await onUpdateLogo(null);
      setLogoMessage('Logo berhasil dihapus, kembali ke ikon default.');
    } catch (err: any) {
      console.error('Failed to remove logo:', err);
      setLogoMessage('Gagal menghapus logo.');
    } finally {
      setIsSavingLogo(false);
      setTimeout(() => setLogoMessage(''), 3000);
    }
  };

  // Helper renderer for Dashboard Table
  const renderDashboardTable = (
    records: MotorRecord[],
    dashboardType: 'pecel' | 'mamah' | 'pribadi',
    title: string,
    metrics: { count: number; totalNominal: number; totalPemasukan: number; totalJasaParkir: number }
  ) => {
    const filteredRecords = records.filter((item) => {
      const q = dashboardSearch.toLowerCase();
      return (
        item.motor.toLowerCase().includes(q) ||
        item.nopol.toLowerCase().includes(q) ||
        item.tanggal.toLowerCase().includes(q) ||
        (item.catatan && item.catatan.toLowerCase().includes(q))
      );
    });

    const isPecel = dashboardType === 'pecel';
    const isMamah = dashboardType === 'mamah';

    const themeBorder = isPecel
      ? 'border-teal-500/30'
      : isMamah
      ? 'border-purple-500/30'
      : 'border-amber-500/30';

    const themeBadge = isPecel
      ? 'bg-teal-500/15 border-teal-500/30 text-teal-300'
      : isMamah
      ? 'bg-purple-500/15 border-purple-500/30 text-purple-300'
      : 'bg-amber-500/15 border-amber-500/30 text-amber-300';

    return (
      <div className="space-y-5">
        {/* Banner Notifikasi Hapus Berhasil */}
        {deleteNotice && (
          <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between gap-2 animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-semibold">{deleteNotice}</span>
            </div>
            <button
              onClick={() => setDeleteNotice('')}
              className="text-slate-400 hover:text-white p-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Tombol Tambah & Navigasi */}
        <div className={`p-4 rounded-2xl bg-slate-950/80 border ${themeBorder} flex flex-wrap items-center justify-end gap-3 shadow-lg`}>
          <div className="flex items-center gap-2">
            <button
              type="button"
              id={`btn-table-home-${dashboardType}`}
              onClick={handleExitAndLogout}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-750 text-xs font-semibold transition cursor-pointer active:scale-95 shadow-xs"
              title="Kembali ke Halaman Utama (Logout)"
            >
              <Home className="w-3.5 h-3.5 text-amber-400" />
              <span>Kembali ke Halaman Utama</span>
            </button>
            <button
              onClick={() => handleOpenAddWithOwnership(dashboardType)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-linear-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-bold shadow-md shadow-amber-500/20 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Motor {dashboardType === 'pecel' ? 'Pecel' : dashboardType === 'mamah' ? 'Mamah' : 'Pribadi'}</span>
            </button>
          </div>
        </div>

        {/* 4 Financial Metric Cards: Total Unit, Total Nominal, Total Pemasukan, Total Jasa Parkir */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 shadow-md">
            <span className="text-xs text-slate-400 block font-medium flex items-center gap-1.5">
              <Bike className="w-3.5 h-3.5 text-amber-400" />
              <span>Total Unit</span>
            </span>
            <span className="text-2xl font-black text-slate-100 font-mono mt-1 block">
              {metrics.count} Unit
            </span>
          </div>

          <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 shadow-md">
            <span className="text-xs text-slate-400 block font-medium flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
              <span>Total Nominal</span>
            </span>
            <span className="text-sm sm:text-base font-bold text-emerald-400 font-mono mt-1 block truncate">
              {formatRupiah(metrics.totalNominal)}
            </span>
          </div>

          <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 shadow-md">
            <span className="text-xs text-slate-400 block font-medium flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-teal-400" />
              <span>Total Pemasukan</span>
            </span>
            <span className="text-sm sm:text-base font-bold text-teal-300 font-mono mt-1 block truncate">
              {formatRupiah(metrics.totalPemasukan)}
            </span>
            <span className="text-[10px] text-teal-400/80 block mt-0.5">
              * Input manual DRU
            </span>

          </div>

          <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 shadow-md">
            <span className="text-xs text-slate-400 block font-medium flex items-center gap-1.5">
              <ParkingMeter className="w-3.5 h-3.5 text-amber-400" />
              <span>Total Jasa Parkir</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                DRU Only
              </span>
            </span>
            <span className="text-sm sm:text-base font-bold text-amber-300 font-mono mt-1 block truncate">
              {formatRupiah(metrics.totalJasaParkir)}
            </span>
            <span className="text-[10px] text-amber-400/70 block mt-0.5">
              * Dirahasiakan dari Pecel
            </span>
          </div>
        </div>

        {/* Search inside dashboard */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder={`Cari motor di ${title.toLowerCase()}...`}
            value={dashboardSearch}
            onChange={(e) => setDashboardSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-950 border border-slate-750 focus:border-amber-400 rounded-xl text-slate-100 placeholder:text-slate-500 focus:outline-none"
          />
        </div>

        {/* Tabel Dashboard (Sama seperti Halaman Utama + Tambahan: Nominal, Pemasukan, Jasa Parkir) */}
        <div className="bg-slate-950/80 rounded-2xl border border-slate-800 overflow-hidden shadow-lg">
          <div className="overflow-x-auto max-h-[440px]">
            <table className="w-full text-xs text-left border-collapse min-w-max">
              <thead className="sticky top-0 bg-slate-900 text-amber-300 uppercase font-bold border-b border-slate-800 z-10 select-none">
                <tr>
                  <th className="py-3 px-3.5 whitespace-nowrap">Tanggal Masuk</th>
                  <th className="py-3 px-3.5 whitespace-nowrap">Hari (Lama)</th>
                  <th className="py-3 px-3.5 whitespace-nowrap">Motor</th>
                  <th className="py-3 px-3.5 text-center whitespace-nowrap">Tahun</th>
                  <th className="py-3 px-3.5 text-center whitespace-nowrap">Nopol</th>
                  <th className="py-3 px-3.5 text-right whitespace-nowrap">Nominal</th>
                  <th className="py-3 px-3.5 text-right whitespace-nowrap">Pemasukan</th>
                  <th className="py-3 px-3.5 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      <span>Jasa Parkir</span>
                      <Lock className="w-3 h-3 text-amber-400" />
                    </div>
                  </th>
                  <th className="py-3 px-3.5 text-center whitespace-nowrap">Status</th>
                  <th className="py-3 px-3.5 text-center whitespace-nowrap">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredRecords.length > 0 ? (
                  filteredRecords.map((item) => {
                    const elapsed = calculateElapsedDays(item.tanggal);
                    const daysDisplay = formatElapsedDays(item.tanggal);
                    const isPecelConfirmed = isPecel && item.pemasukanConfirmedByPecel;
                    const parkirVal = item.jasaParkir !== undefined ? item.jasaParkir : item.tarifJasa || 0;

                    return (
                      <tr key={item.id} className="hover:bg-slate-900/60 transition group">
                        {/* 1. Tanggal */}
                        <td className="py-3 px-3.5 font-mono text-slate-300 whitespace-nowrap">
                          {item.tanggal}
                        </td>

                        {/* 2. Hari */}
                        <td className="py-3 px-3.5 font-mono font-bold text-teal-300 whitespace-nowrap">
                          {daysDisplay}
                        </td>

                        {/* 3. Motor */}
                        <td className="py-3 px-3.5 font-semibold text-slate-100 whitespace-nowrap">
                          <div>{item.motor}</div>
                          {item.catatan && (
                            <div className="text-[10px] text-slate-400 mt-0.5">{item.catatan}</div>
                          )}
                        </td>

                        {/* 4. Tahun */}
                        <td className="py-3 px-3.5 text-center text-slate-300 font-mono whitespace-nowrap">
                          {item.tahun}
                        </td>

                        {/* 5. Nopol */}
                        <td className="py-3 px-3.5 text-center font-mono font-bold text-amber-400 whitespace-nowrap">
                          {item.nopol}
                        </td>

                        {/* 6. Nominal (Tambahan) */}
                        <td className="py-3 px-3.5 text-right font-mono font-bold text-emerald-400 whitespace-nowrap">
                          {formatRupiah(item.nominal)}
                        </td>

                        {/* 7. Pemasukan */}
                        <td className="py-3 px-3.5 text-right whitespace-nowrap">
                          {/* Semua dashboard: pemasukan diisi manual oleh DRU + tombol simpan */}
                          <ManualPemasukanCell
                            motorId={item.id}
                            currentPemasukan={item.pemasukan}
                            onSave={(id, amount) => onUpdateMotor(id, { pemasukan: amount })}
                          />
                        </td>


                        {/* 8. Jasa Parkir (Tambahan - Hanya DRU yang tahu) */}
                        <td className="py-3 px-3.5 text-right whitespace-nowrap">
                          <span className="font-mono font-bold text-amber-300">
                            {formatRupiah(parkirVal)}
                          </span>
                        </td>

                        {/* 9. Status (LELANG / PARKIR / LUNAS) */}
                        <td className="py-3 px-3.5 text-center whitespace-nowrap">
                          {item.lunas ? (
                            <div className="flex flex-col items-center gap-1">
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                <span>LUNAS</span>
                              </span>
                              <span className="text-[9px] text-amber-300/90 font-medium">
                                Hilang dlm {getLunasRemainingDays(item.lunasAt)} hari
                              </span>
                              <button
                                type="button"
                                onClick={() => onToggleLunas ? onToggleLunas(item.id, false) : onUpdateMotor(item.id, { lunas: false })}
                                className="text-[9px] text-slate-400 hover:text-amber-300 underline cursor-pointer"
                                title="Kembalikan motor ke status aktif (akan tampil kembali di halaman utama)"
                              >
                                Batal Lunas
                              </button>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center gap-1">
                              {elapsed > 90 ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                                  <Flame className="w-3 h-3 text-rose-400" />
                                  <span>LELANG</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                  <ParkingMeter className="w-3 h-3 text-amber-400" />
                                  <span>PARKIR</span>
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => onToggleLunas ? onToggleLunas(item.id, true) : onUpdateMotor(item.id, { lunas: true, lunasAt: new Date().toISOString() })}
                                className="text-[9px] text-emerald-400 hover:text-emerald-300 underline font-medium cursor-pointer"
                                title="Tandai Lunas (motor akan hilang otomatis 1 minggu setelah lunas)"
                              >
                                Tandai Lunas
                              </button>
                            </div>
                          )}
                        </td>

                        {/* 10. Aksi */}
                        <td className="py-3 px-3.5 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleStartEdit(item)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 transition cursor-pointer"
                              title="Edit Data Motor"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            {/* Logo Tong Sampah */}
                            <button
                              type="button"
                              id={`btn-delete-motor-${item.id}`}
                              onClick={() => setItemToDelete(item)}
                              className="p-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/80 border border-rose-500/40 hover:border-rose-400 text-rose-300 hover:text-white transition cursor-pointer active:scale-95 shadow-xs"
                              title={`Hapus Unit ${item.motor} (${item.nopol})`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-400">
                      Tidak ada data unit di {title}. Silakan klik tombol <strong>+ Tambah Motor</strong> di atas.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div 
      id="modal-dru-overlay" 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md"
    >
      <div 
        id="modal-dru-container"
        className="bg-linear-to-b from-slate-900 via-slate-925 to-slate-950 text-slate-100 rounded-2xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] w-full max-w-6xl max-h-[94vh] flex flex-col border border-amber-500/30 overflow-hidden"
      >
        {/* Luxury Gold Stripe */}
        <div className="h-1 w-full bg-linear-to-r from-transparent via-amber-400 to-transparent" />

        {/* Header Halaman DRU: dasboard pecel, mamah, pribadi, pengaturan, ubah logo */}
        <div className="bg-slate-950 px-4 sm:px-6 py-2.5 flex items-center justify-between border-b border-slate-800 gap-3">
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto py-1">
            {/* 1. Dasboard Pecel */}
            <button
              id="tab-dashboard-pecel"
              type="button"
              onClick={() => {
                setActiveTab('dashboard_pecel');
                setDashboardSearch('');
              }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition whitespace-nowrap cursor-pointer ${
                activeTab === 'dashboard_pecel'
                  ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
              }`}
            >
              <span>Dasboard Pecel</span>
            </button>

            {/* 2. Mamah */}
            <button
              id="tab-dashboard-mamah"
              type="button"
              onClick={() => {
                setActiveTab('dashboard_mamah');
                setDashboardSearch('');
              }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition whitespace-nowrap cursor-pointer ${
                activeTab === 'dashboard_mamah'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
              }`}
            >
              <span>Mamah</span>
            </button>

            {/* 3. Pribadi */}
            <button
              id="tab-dashboard-pribadi"
              type="button"
              onClick={() => {
                setActiveTab('dashboard_pribadi');
                setDashboardSearch('');
              }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition whitespace-nowrap cursor-pointer ${
                activeTab === 'dashboard_pribadi'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
              }`}
            >
              <span>Pribadi</span>
            </button>

            <div className="h-4 w-px bg-slate-800 mx-1 shrink-0" />

            {/* 4. Pengaturan */}
            <button
              id="tab-pengaturan-dru"
              type="button"
              onClick={() => {
                setActiveTab('pengaturan');
                setDruPassError('');
                setDruPassSuccess('');
              }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition whitespace-nowrap cursor-pointer ${
                activeTab === 'pengaturan'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
              }`}
            >
              <span>Pengaturan</span>
            </button>

            {/* 5. Ubah Logo */}
            <button
              id="tab-logo"
              type="button"
              onClick={() => setActiveTab('logo')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition whitespace-nowrap cursor-pointer ${
                activeTab === 'logo'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
              }`}
            >
              <span>Ubah Logo</span>
            </button>
          </div>

          {/* Tombol Tutup / Logout */}
          <div className="flex items-center shrink-0">
            <button
              id="btn-close-dru-modal"
              type="button"
              onClick={handleExitAndLogout}
              className="text-slate-400 hover:text-white hover:bg-slate-800 p-1.5 rounded-lg transition cursor-pointer"
              title="Logout dan Kembali ke Halaman Utama"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-8 bg-slate-900/60">
          {/* TAB 1: DASHBOARD PECEL */}
          {activeTab === 'dashboard_pecel' &&
            renderDashboardTable(
              pecelMotors,
              'pecel',
              'PECEL',
              pecelMetrics
            )}

          {/* TAB 2: DASHBOARD MOTOR MAMAH */}
          {activeTab === 'dashboard_mamah' &&
            renderDashboardTable(
              mamahMotors,
              'mamah',
              'MAMAH',
              mamahMetrics
            )}

          {/* TAB 3: DASHBOARD PRIBADI */}
          {activeTab === 'dashboard_pribadi' &&
            renderDashboardTable(
              pribadiMotors,
              'pribadi',
              'PRIBADI',
              pribadiMetrics
            )}

          {/* TAB 4: FORM INPUT / EDIT DATA MOTOR */}
          {activeTab === 'input_data' && (
            <div className="max-w-3xl mx-auto space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                    <Plus className="w-4 h-4 text-amber-400" />
                    <span>{editingId ? 'Edit Data Motor' : 'Input Data Motor Baru'}</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Semua motor yang diinput akan otomatis masuk ke tabel halaman utama.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    id="btn-form-home"
                    onClick={() => {
                      handleCancelEdit();
                      handleExitAndLogout();
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 hover:text-amber-200 text-xs font-semibold transition cursor-pointer border border-amber-500/40 active:scale-95 shadow-xs"
                    title="Logout dan Kembali ke Halaman Utama"
                  >
                    <Home className="w-3.5 h-3.5 text-amber-400" />
                    <span>Kembali ke Halaman Utama</span>
                  </button>
                  <button
                    type="button"
                    id="btn-back-from-form"
                    onClick={() => {
                      handleCancelEdit();
                      setActiveTab(formKepemilikan === 'mamah' ? 'dashboard_mamah' : formKepemilikan === 'pribadi' ? 'dashboard_pribadi' : 'dashboard_pecel');
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition cursor-pointer border border-slate-700"
                    title="Kembali ke Dashboard Tabel"
                  >
                    <ArrowLeft className="w-3.5 h-3.5 text-amber-400" />
                    <span>Kembali ke Dashboard</span>
                  </button>
                  {editingId && (
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-medium cursor-pointer border border-slate-700"
                    >
                      Batal Edit
                    </button>
                  )}
                </div>
              </div>

              {formSuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{formSuccess}</span>
                </div>
              )}
              {formError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleSaveMotor} className="bg-slate-950/80 p-6 rounded-2xl border border-slate-800 space-y-5 shadow-xl">
                {/* PILIHAN DASHBOARD KEPEMILIKAN */}
                <div>
                  <label className="block text-xs font-bold text-amber-300 mb-2 uppercase tracking-wide">
                    Pilih Dashboard Kepemilikan:
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setFormKepemilikan('pecel')}
                      className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                        formKepemilikan === 'pecel'
                          ? 'bg-teal-950/80 border-teal-400 text-teal-200 ring-1 ring-teal-400'
                          : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="font-bold text-xs flex items-center justify-between">
                        <span>MOTOR PECEL</span>
                        {formKepemilikan === 'pecel' && <Check className="w-3.5 h-3.5 text-teal-400" />}
                      </div>
                      <p className="text-[10px] mt-1 opacity-80">
                        Masuk ke Halaman Pecel & Halaman Utama.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormKepemilikan('mamah')}
                      className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                        formKepemilikan === 'mamah'
                          ? 'bg-purple-950/80 border-purple-400 text-purple-200 ring-1 ring-purple-400'
                          : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="font-bold text-xs flex items-center justify-between">
                        <span>MOTOR MAMAH</span>
                        {formKepemilikan === 'mamah' && <Check className="w-3.5 h-3.5 text-purple-400" />}
                      </div>
                      <p className="text-[10px] mt-1 opacity-80">
                        Dashboard Mamah DRU & Halaman Utama.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormKepemilikan('pribadi')}
                      className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                        formKepemilikan === 'pribadi'
                          ? 'bg-amber-950/80 border-amber-400 text-amber-200 ring-1 ring-amber-400'
                          : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="font-bold text-xs flex items-center justify-between">
                        <span>PRIBADI</span>
                        {formKepemilikan === 'pribadi' && <Check className="w-3.5 h-3.5 text-amber-400" />}
                      </div>
                      <p className="text-[10px] mt-1 opacity-80">
                        Dashboard Pribadi DRU & Halaman Utama.
                      </p>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* 1. Tanggal Masuk */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Tanggal Masuk:
                    </label>
                    <input
                      type="date"
                      required
                      value={formTanggal}
                      onChange={(e) => handleTanggalChange(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-750 focus:border-amber-400 rounded-xl text-slate-100 text-xs focus:outline-none"
                    />
                    <div className="mt-1 flex items-center gap-1 text-[11px] text-amber-400 font-mono">
                      <Clock className="w-3 h-3" />
                      <span>{formHari}</span>
                    </div>
                  </div>

                  {/* 2. Nama Motor */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Motor:
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Honda Vario 160 ABS"
                      value={formMotor}
                      onChange={(e) => setFormMotor(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-750 focus:border-amber-400 rounded-xl text-slate-100 text-xs focus:outline-none"
                    />
                  </div>

                  {/* 3. Tahun */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Tahun:
                    </label>
                    <input
                      type="number"
                      required
                      min={1990}
                      max={2035}
                      value={formTahun}
                      onChange={(e) => setFormTahun(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-750 focus:border-amber-400 rounded-xl text-slate-100 text-xs focus:outline-none"
                    />
                  </div>

                  {/* 4. Nopol */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Nopol:
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: B 1234 XYZ"
                      value={formNopol}
                      onChange={(e) => setFormNopol(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-750 focus:border-amber-400 rounded-xl text-amber-300 font-mono font-bold text-xs uppercase focus:outline-none"
                    />
                  </div>

                  {/* 5. Nominal Pokok (hanya saat pendaftaran motor baru) */}
                  {!editingId && (
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Nominal Pokok (Rp):</span>
                        </div>
                        <span className="text-[11px] text-emerald-400 font-mono font-bold">
                          {formNominal !== '' && !isNaN(Number(formNominal)) ? formatRupiah(Number(formNominal)) : ''}
                        </span>
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="Contoh: 3000000"
                        value={formNominal}
                        onChange={(e) => setFormNominal(e.target.value.replace(/[^0-9]/g, ''))}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-750 focus:border-emerald-400 rounded-xl text-slate-100 text-xs focus:outline-none"
                      />
                      <p className="text-[11px] text-slate-400 mt-1">
                        * Nominal pokok langsung tersimpan tanpa perlu konfirmasi Pecel. Konfirmasi Pecel hanya diperlukan saat ada pemasukan pembayaran baru.
                      </p>
                    </div>
                  )}

                  {/* 6. Jasa Parkir */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <ParkingMeter className="w-3.5 h-3.5 text-amber-400" />
                        <span>Jasa Parkir (Rp):</span>
                      </div>
                      <span className="text-[11px] text-amber-400 font-mono font-bold">
                        {formJasaParkir !== '' && !isNaN(Number(formJasaParkir)) ? formatRupiah(Number(formJasaParkir)) : ''}
                      </span>
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="Minimal 15000, kelipatan 1000"
                      value={formJasaParkir}
                      onChange={(e) => setFormJasaParkir(e.target.value.replace(/[^0-9]/g, ''))}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-750 focus:border-amber-400 rounded-xl text-slate-100 text-xs focus:outline-none"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      * Minimal Rp 15.000 dan harus kelipatan Rp 1.000. Hanya DRU yang dapat melihat nilai ini.
                    </p>
                  </div>

                  {/* 7. Catatan Unit (Opsional, dapat dihapus/dikosongkan) */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Catatan / Keterangan Unit (Opsional):
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Kondisi mulus orisinil / warna hitam doff"
                      value={formCatatan}
                      onChange={(e) => setFormCatatan(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-750 focus:border-amber-400 rounded-xl text-slate-100 text-xs focus:outline-none"
                    />
                  </div>


                  {/* 6. Catatan Unit (Opsional, dapat dihapus/dikosongkan) */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Catatan / Keterangan Unit (Opsional):
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Kondisi mulus orisinil / warna hitam doff"
                      value={formCatatan}
                      onChange={(e) => setFormCatatan(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-750 focus:border-amber-400 rounded-xl text-slate-100 text-xs focus:outline-none"
                    />
                  </div>

                  {/* Informasi Nominal Terkunci saat Edit (Sesuai Aturan: Nominal Tidak Dapat Diedit) */}
                  {editingId && (
                    <div className="sm:col-span-2 p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2.5">
                      <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                        <Lock className="w-3.5 h-3.5" />
                        <span>Status Nominal (Terkunci & Tidak Dapat Diedit)</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                          <span className="text-slate-400 block text-[11px]">Nominal Motor:</span>
                          <span className="font-mono font-bold text-emerald-400 text-sm mt-0.5 block">
                            {formatRupiah(Number(formNominal) || 0)}
                          </span>
                          <span className="text-[10px] text-slate-500 italic mt-0.5 block">
                            * Tidak dapat diubah
                          </span>
                        </div>
                        <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                          <span className="text-slate-400 block text-[11px]">Nominal Pemasukan:</span>
                          <span className="font-mono font-bold text-teal-300 text-sm mt-0.5 block">
                            {Number(formPemasukan) > 0 ? formatRupiah(Number(formPemasukan)) : 'Pending (Belum Dikonfirmasi)'}
                          </span>
                          <span className="text-[10px] text-slate-500 italic mt-0.5 block">
                            * Terisi otomatis via konfirmasi Pecel
                          </span>
                        </div>
                      </div>
                      <p className="text-[10px] text-amber-300/80">
                        Catatan: Nominal pinjaman/motor dan pemasukan tidak dapat diedit. Informasi lainnya (tanggal masuk, nama motor, tahun, nopol, dan jasa parkir) dapat diubah bebas.
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-800">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      id="btn-bottom-home-from-form"
                      onClick={() => {
                        handleCancelEdit();
                        handleExitAndLogout();
                      }}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-amber-300 hover:text-amber-200 border border-amber-500/40 transition cursor-pointer active:scale-95 shadow-xs"
                      title="Kembali ke Halaman Utama"
                    >
                      <Home className="w-3.5 h-3.5 text-amber-400" />
                      <span>Kembali ke Halaman Utama</span>
                    </button>

                    <button
                      type="button"
                      id="btn-bottom-back-from-form"
                      onClick={() => {
                        handleCancelEdit();
                        setActiveTab(formKepemilikan === 'mamah' ? 'dashboard_mamah' : formKepemilikan === 'pribadi' ? 'dashboard_pribadi' : 'dashboard_pecel');
                      }}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-750 transition cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5 text-amber-400" />
                      <span>Kembali ke Dashboard</span>
                    </button>

                    {editingId && (
                      <button
                        type="button"
                        id="btn-delete-editing-motor"
                        onClick={() => {
                          const currentItem = motorData.find((m) => m.id === editingId);
                          if (currentItem) {
                            setItemToDelete(currentItem);
                          }
                        }}
                        className="px-3 py-2 rounded-xl text-xs font-bold bg-rose-950/60 hover:bg-rose-900 border border-rose-500/50 text-rose-300 hover:text-white transition cursor-pointer flex items-center gap-1.5 active:scale-95"
                        title="Hapus motor yang sedang diedit"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Hapus Motor Ini</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {editingId && (
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 cursor-pointer border border-slate-700"
                      >
                        Batal Edit
                      </button>
                    )}
                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-xl bg-linear-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 active:scale-95 transition cursor-pointer flex items-center gap-1.5"
                    >
                      <Check className="w-4 h-4" />
                      <span>{editingId ? 'Simpan Perubahan' : 'Tambahkan Motor'}</span>
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* TAB 5: PENGATURAN LOGO HEADER */}
          {activeTab === 'logo' && (
            <div className="max-w-xl mx-auto space-y-6">
              <div>
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-amber-400" />
                  <span>Pengaturan Logo Header (Input oleh DRU)</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Logo yang Anda tentukan di sini akan tampil di header halaman utama sebelah kiri judul MOTORKU.
                </p>
              </div>

              {logoMessage && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{logoMessage}</span>
                </div>
              )}

              {/* Logo Preview with Crop Action */}
              <div className="p-6 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col items-center justify-center gap-3 text-center">
                <span className="text-xs text-slate-400 font-medium">Pratinjau Logo Saat Ini:</span>
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-radial from-slate-800 to-slate-950 border-2 border-amber-500/50 p-2 flex items-center justify-center shadow-lg shadow-black/60 overflow-hidden relative group">
                  {customLogoUrl ? (
                    <img
                      src={customLogoUrl}
                      alt="Pratinjau Logo"
                      className="w-full h-full object-contain"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-amber-400">
                      <Bike className="w-9 h-9" />
                      <span className="text-[9px] font-mono mt-1 font-bold">DEFAULT</span>
                    </div>
                  )}
                </div>

                {/* Button to re-crop/adjust current logo */}
                {customLogoUrl && (
                  <button
                    type="button"
                    onClick={handleOpenCropCurrentLogo}
                    className="mt-1 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-xs font-semibold transition cursor-pointer"
                  >
                    <Crop className="w-3.5 h-3.5" />
                    <span>Sesuaikan / Crop Ukuran Logo Ini</span>
                  </button>
                )}
              </div>

              {/* Upload or Link Input */}
              <div className="bg-slate-950/80 p-5 rounded-2xl border border-slate-800 space-y-4 shadow-lg">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Unggah Berkas Gambar Logo (PNG, JPG, SVG, WebP):
                  </label>
                  <p className="text-[11px] text-amber-400/80 mb-2">
                    * Saat memilih gambar, jendela penyesuaian/crop akan otomatis terbuka agar Anda dapat menyesuaikan ukuran dan posisinya.
                  </p>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleLogoFileUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-3 px-4 rounded-xl border border-dashed border-amber-500/50 hover:border-amber-400 bg-slate-900 hover:bg-slate-850 text-xs text-amber-300 font-semibold flex items-center justify-center gap-2 transition cursor-pointer shadow-inner"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Pilih Berkas Logo & Sesuaikan Ukuran (Crop)</span>
                  </button>
                </div>

                <div className="relative flex items-center justify-center">
                  <div className="border-t border-slate-800 w-full" />
                  <span className="bg-slate-950 px-2 text-[10px] text-slate-500 uppercase font-bold">atau link URL</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Alamat URL Gambar Logo:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      placeholder="https://example.com/logo.png"
                      value={customLogoUrl}
                      onChange={(e) => setCustomLogoUrl(e.target.value)}
                      className="flex-1 px-3 py-2 bg-slate-900 border border-slate-750 focus:border-amber-400 rounded-xl text-slate-100 text-xs focus:outline-none font-mono"
                    />
                    {customLogoUrl && (
                      <button
                        type="button"
                        onClick={handleCropFromUrl}
                        className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-amber-300 border border-amber-500/30 text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                        title="Crop dari URL gambar ini"
                      >
                        <Crop className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Crop</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      id="btn-logo-home"
                      onClick={handleExitAndLogout}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-amber-300 hover:text-amber-200 border border-amber-500/40 transition cursor-pointer active:scale-95 shadow-xs"
                      title="Kembali ke Halaman Utama"
                    >
                      <Home className="w-3.5 h-3.5 text-amber-400" />
                      <span>Kembali ke Halaman Utama</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="px-3 py-2 rounded-xl text-xs text-rose-400 hover:bg-rose-950/40 border border-rose-500/20 font-medium transition cursor-pointer"
                    >
                      Reset Logo Default
                    </button>
                  </div>
                  <button
                    type="button"
                    id="btn-apply-logo"
                    onClick={handleSaveLogoUrl}
                    disabled={isSavingLogo}
                    className="px-5 py-2 rounded-xl bg-linear-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                  >
                    {isSavingLogo ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Menyimpan...</span>
                      </>
                    ) : (
                      <span>Terapkan Logo</span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: PENGATURAN PASSWORD AKUN DRU */}
          {activeTab === 'pengaturan' && (
            <div className="max-w-xl mx-auto space-y-6 animate-in fade-in duration-200">
              <div className="bg-slate-950/80 p-6 rounded-2xl border border-amber-500/30 shadow-xl space-y-5">
                <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
                  <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
                    <KeyRound className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                      <span>Pengaturan Password Akun DRU</span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      Ubah kata sandi akun DRU untuk menjaga keamanan hak akses inventaris.
                    </p>
                  </div>
                </div>

                {/* Profil Akun DRU */}
                <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Username Akun:</span>
                    <span className="font-mono font-bold text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 rounded-md flex items-center gap-1.5">
                      <Lock className="w-3 h-3 text-amber-400" />
                      <span>DRU (Permanen)</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Tingkat Hak Akses:</span>
                    <span className="text-slate-200 font-semibold">Administrator & Pemilik Usaha</span>
                  </div>
                </div>

                {/* Form Ubah Password DRU */}
                <form onSubmit={handleChangeDruPassword} className="space-y-4">
                  {/* Password Lama */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Password Saat Ini (Lama)
                    </label>
                    <div className="relative">
                      <input
                        type={showDruOldPass ? 'text' : 'password'}
                        placeholder="Masukkan password saat ini..."
                        value={druOldPassword}
                        onChange={(e) => setDruOldPassword(e.target.value)}
                        className="w-full pl-3.5 pr-11 py-2.5 text-xs sm:text-sm bg-slate-950 border border-slate-750 focus:border-amber-400 rounded-xl text-slate-100 placeholder:text-slate-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowDruOldPass(!showDruOldPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-amber-300 p-1"
                        title={showDruOldPass ? "Sembunyikan" : "Tampilkan"}
                      >
                        {showDruOldPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
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
                        type={showDruNewPass ? 'text' : 'password'}
                        placeholder="Masukkan password baru (min 4 karakter)..."
                        value={druNewPassword}
                        onChange={(e) => setDruNewPassword(e.target.value)}
                        className="w-full pl-3.5 pr-11 py-2.5 text-xs sm:text-sm bg-slate-950 border border-slate-750 focus:border-amber-400 rounded-xl text-slate-100 placeholder:text-slate-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowDruNewPass(!showDruNewPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-amber-300 p-1"
                        title={showDruNewPass ? "Sembunyikan" : "Tampilkan"}
                      >
                        {showDruNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
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
                        type={showDruConfirmPass ? 'text' : 'password'}
                        placeholder="Ketik ulang password baru..."
                        value={druConfirmPassword}
                        onChange={(e) => setDruConfirmPassword(e.target.value)}
                        className="w-full pl-3.5 pr-11 py-2.5 text-xs sm:text-sm bg-slate-950 border border-slate-750 focus:border-amber-400 rounded-xl text-slate-100 placeholder:text-slate-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowDruConfirmPass(!showDruConfirmPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-amber-300 p-1"
                        title={showDruConfirmPass ? "Sembunyikan" : "Tampilkan"}
                      >
                        {showDruConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {druPassError && (
                    <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-500/50 text-rose-300 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{druPassError}</span>
                    </div>
                  )}

                  {druPassSuccess && (
                    <div className="p-3 rounded-xl bg-emerald-950/70 border border-emerald-500/50 text-emerald-300 text-xs flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>{druPassSuccess}</span>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
                    <button
                      type="button"
                      id="btn-password-home"
                      onClick={handleExitAndLogout}
                      className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 hover:text-amber-200 border border-amber-500/40 text-xs font-bold transition cursor-pointer active:scale-95 shadow-xs"
                      title="Kembali ke Halaman Utama"
                    >
                      <Home className="w-3.5 h-3.5 text-amber-400" />
                      <span>Kembali ke Halaman Utama</span>
                    </button>
                    <button
                      type="submit"
                      id="btn-save-dru-password"
                      className="w-full flex-1 py-2.5 px-4 rounded-xl bg-linear-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs sm:text-sm shadow-md shadow-amber-500/20 transition cursor-pointer active:scale-95 flex items-center justify-center gap-2"
                    >
                      <Check className="w-4 h-4" />
                      <span>Simpan Password Baru DRU</span>
                    </button>
                  </div>
                </form>

                {/* Catatan Bantuan Pemulihan */}
                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-400 space-y-1">
                  <span className="font-semibold text-amber-300 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                    <span>Bantuan Pemulihan Kata Sandi:</span>
                  </span>
                  <p className="text-[11px] leading-relaxed">
                    Jika sewaktu-waktu Anda lupa password, gunakan fitur <strong>"Lupa Password?"</strong> di pintu masuk login dan masukkan kode pemulihan khusus untuk mengembalikan password ke setelan normal default (<strong>123456</strong>).
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* In-App Confirmation Modal for Delete (100% iframe-safe, bypasses browser confirm) */}
      {itemToDelete && (
        <div
          id="modal-confirm-delete"
          className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm"
        >
          <div className="bg-slate-900 border border-rose-500/50 rounded-2xl p-6 max-w-md w-full shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] text-slate-100 animate-in fade-in zoom-in duration-150 space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
              <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-100">Konfirmasi Hapus Motor</h3>
                <p className="text-[11px] text-slate-400">Data akan dihapus permanen dari sistem & tabel utama</p>
              </div>
            </div>

            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Nama Motor:</span>
                <span className="font-bold text-slate-100">{itemToDelete.motor}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Nomor Polisi:</span>
                <span className="font-mono font-bold text-amber-400">{itemToDelete.nopol}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Kategori Dashboard:</span>
                <span className="font-bold uppercase text-teal-300">
                  {itemToDelete.kepemilikan === 'mamah' ? 'MOTOR MAMAH' : itemToDelete.kepemilikan === 'pribadi' ? 'PRIBADI' : 'MOTOR PECEL'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Tanggal Masuk:</span>
                <span className="font-mono text-slate-300">{itemToDelete.tanggal}</span>
              </div>
            </div>

            <p className="text-xs text-rose-300/90 leading-relaxed">
              Apakah Anda yakin ingin menghapus data motor ini? Data yang terhapus tidak dapat dikembalikan.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
              <button
                type="button"
                id="btn-cancel-delete"
                onClick={() => setItemToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                id="btn-confirm-delete"
                disabled={isDeleting}
                onClick={async () => {
                  if (isDeleting || !itemToDelete) return;
                  const deletedName = itemToDelete.motor;
                  const deletedNopol = itemToDelete.nopol;
                  const targetId = itemToDelete.id;
                  setIsDeleting(true);
                  if (editingId === targetId) {
                    handleCancelEdit();
                  }
                  try {
                    await onDeleteMotor(targetId);
                    setItemToDelete(null);
                    setDeleteNotice(`Unit motor ${deletedName} (${deletedNopol}) berhasil dihapus permanen dari sistem & database.`);
                  } catch (err) {
                    console.error('Failed to delete motor:', err);
                    setDeleteNotice(`Gagal menghapus unit motor ${deletedName}. Silakan coba lagi.`);
                  } finally {
                    setIsDeleting(false);
                  }
                  setTimeout(() => setDeleteNotice(''), 4500);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-linear-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 disabled:opacity-50 text-white shadow-lg shadow-rose-600/30 transition cursor-pointer flex items-center gap-1.5 active:scale-95"
              >
                {isDeleting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Menghapus...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus Sekarang</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dialog Kirim Nominal Pemasukan ke Pecel */}
      {itemToSendPecel && (
        <div
          id="modal-send-pemasukan-pecel"
          className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm"
        >
          <div className="bg-slate-900 border border-teal-500/50 rounded-2xl p-6 max-w-md w-full shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] text-slate-100 animate-in fade-in zoom-in duration-150 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  <Send className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-100">Kirim Nominal Pemasukan</h3>
                  <p className="text-[11px] text-slate-400">Kirim nominal ke Halaman Pecel untuk dikonfirmasi</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setItemToSendPecel(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Info Unit Motor */}
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Unit Motor:</span>
                <span className="font-bold text-slate-100">{itemToSendPecel.motor}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Nomor Polisi:</span>
                <span className="font-mono font-bold text-amber-400">{itemToSendPecel.nopol}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Jasa Parkir DRU:</span>
                <span className="font-mono text-amber-300">
                  {formatRupiah(itemToSendPecel.jasaParkir || itemToSendPecel.tarifJasa || 0)}
                </span>
              </div>
            </div>

            {/* Form Input Nominal & Kirim */}
            <form onSubmit={handleExecuteSendPecel} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1.5 flex items-center justify-between">
                  <span>Nominal Pemasukan (Rp):</span>
                  <span className="font-mono text-teal-300 font-bold text-xs">
                    {formatRupiah(sendPemasukanAmount)}
                  </span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    autoFocus
                    placeholder="Contoh: 500000"
                    value={sendPemasukanAmount || ''}
                    onChange={(e) => setSendPemasukanAmount(Number(e.target.value.replace(/[^0-9]/g, '')) || 0)}

                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-teal-500/50 rounded-xl text-teal-300 font-mono font-bold text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Catatan / Keterangan (Opsional):
                </label>
                <input
                  type="text"
                  placeholder="Keterangan tambahan untuk bagian Pecel..."
                  value={sendPemasukanNotes}
                  onChange={(e) => setSendPemasukanNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-750 focus:border-teal-400 rounded-xl text-slate-100 text-xs focus:outline-none"
                />
              </div>

              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-[11px] text-amber-300/95 leading-relaxed">
                * Sebelum Halaman Pecel mengonfirmasi, status pemasukan akan tetap bertuliskan <strong>Pending</strong>. Setelah dikonfirmasi Pecel, nominal akan terisi otomatis ke sistem.
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setItemToSendPecel(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  id="btn-submit-send-pecel"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-linear-to-r from-teal-600 to-teal-500 hover:from-teal-500 hover:to-teal-400 text-white shadow-lg shadow-teal-500/30 transition cursor-pointer flex items-center gap-1.5 active:scale-95"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Kirim</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Interactive Logo Crop & Resize Modal */}
      <LogoCropModal
        isOpen={isCropModalOpen}
        imageSrc={imageToCrop}
        onClose={() => setIsCropModalOpen(false)}
        onSaveCropped={handleSaveCroppedLogo}
      />
    </div>
  );
}
