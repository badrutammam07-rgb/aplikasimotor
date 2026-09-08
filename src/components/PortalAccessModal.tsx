import React, { useState } from 'react';
import {
  DoorOpen,
  X,
  ShieldCheck,
  UserCheck,
  KeyRound,
  Eye,
  EyeOff,
  ArrowRight,
  Sparkles,
  HelpCircle,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Lock,
  ArrowLeft,
  Home
} from 'lucide-react';
import {
  verifyLoginPassword,
  resetPasswordWithMasterCode,
  RoleType,
  DEFAULT_PASSWORD
} from '../utils/auth';

interface PortalAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginDruSuccess: () => void;
  onLoginPecelSuccess: () => void;
}

export default function PortalAccessModal({
  isOpen,
  onClose,
  onLoginDruSuccess,
  onLoginPecelSuccess
}: PortalAccessModalProps) {
  // Active selected portal tab: 'dru' | 'pecel' | 'both'
  const [activeTab, setActiveTab] = useState<RoleType>('dru');

  // DRU login state
  const [druPassword, setDruPassword] = useState('');
  const [showDruPassword, setShowDruPassword] = useState(false);
  const [druError, setDruError] = useState('');
  const [druSuccess, setDruSuccess] = useState('');

  // PECEL login state
  const [pecelPassword, setPecelPassword] = useState('');
  const [showPecelPassword, setShowPecelPassword] = useState(false);
  const [pecelError, setPecelError] = useState('');
  const [pecelSuccess, setPecelSuccess] = useState('');

  // Forgot password modal / state
  const [recoveryRole, setRecoveryRole] = useState<RoleType | null>(null);
  const [recoveryCode, setRecoveryCode] = useState('');
  const [showRecoveryCode, setShowRecoveryCode] = useState(false);
  const [recoveryError, setRecoveryError] = useState('');
  const [recoverySuccess, setRecoverySuccess] = useState('');

  if (!isOpen) return null;

  // Handler for DRU Login
  const handleDruSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDruError('');
    setDruSuccess('');

    if (!druPassword) {
      setDruError('Password DRU harus diisi.');
      return;
    }

    const isValid = verifyLoginPassword('dru', druPassword);
    if (isValid) {
      setDruSuccess('Login DRU berhasil. Membuka panel pengelola...');
      setTimeout(() => {
        onLoginDruSuccess();
      }, 300);
    } else {
      setDruError('Password DRU salah! Periksa kembali atau klik "Lupa Password?".');
    }
  };

  // Handler for PECEL Login
  const handlePecelSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPecelError('');
    setPecelSuccess('');

    if (!pecelPassword) {
      setPecelError('Password PECEL harus diisi.');
      return;
    }

    const isValid = verifyLoginPassword('pecel', pecelPassword);
    if (isValid) {
      setPecelSuccess('Login PECEL berhasil. Membuka panel pecel...');
      setTimeout(() => {
        onLoginPecelSuccess();
      }, 300);
    } else {
      setPecelError('Password PECEL salah! Periksa kembali atau klik "Lupa Password?".');
    }
  };

  // Handler for Forgot Password / Reset
  const handleRecoverySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryRole) return;

    setRecoveryError('');
    setRecoverySuccess('');

    const res = resetPasswordWithMasterCode(recoveryRole, recoveryCode);
    if (res.success) {
      setRecoverySuccess(res.message);
      if (recoveryRole === 'dru') {
        setDruPassword(DEFAULT_PASSWORD);
        setDruError('');
        setDruSuccess('Password kembali ke 123456');
      } else {
        setPecelPassword(DEFAULT_PASSWORD);
        setPecelError('');
        setPecelSuccess('Password kembali ke 123456');
      }
      setTimeout(() => {
        setRecoveryRole(null);
        setRecoveryCode('');
        setRecoverySuccess('');
      }, 2200);
    } else {
      setRecoveryError(res.message);
    }
  };

  return (
    <div 
      id="portal-access-modal-overlay" 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md overflow-y-auto"
    >
      <div 
        id="portal-access-modal-container"
        className="relative bg-linear-to-b from-slate-900 via-slate-925 to-slate-950 text-slate-100 rounded-2xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.95)] w-full max-w-3xl border border-amber-500/30 overflow-hidden my-auto"
      >
        {/* Luxury Gold Top Line */}
        <div className="h-1 w-full bg-linear-to-r from-transparent via-amber-400 to-transparent" />

        {/* Modal Header */}
        <div className="px-5 sm:px-8 py-4 sm:py-5 flex items-center justify-between border-b border-slate-800/80 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shadow-inner">
              <DoorOpen className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black tracking-wide text-transparent bg-clip-text bg-linear-to-r from-amber-200 via-amber-400 to-amber-100 uppercase">
                Portal Login Akses
              </h2>
              <p className="text-xs text-slate-400">
                Pilih akun masuk: Pengelola <strong>DRU</strong> atau Pengawas <strong>PECEL</strong>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              id="btn-back-portal-modal"
              type="button"
              onClick={onClose}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 hover:text-amber-200 border border-amber-500/40 transition cursor-pointer text-xs font-bold active:scale-95 shadow-xs"
              title="Kembali ke Halaman Utama"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-amber-400" />
              <span>Kembali ke Halaman Utama</span>
            </button>
            <button
              id="btn-close-portal-modal"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              title="Tutup (Kembali ke Halaman Utama)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Role Selector Tabs */}
        <div className="bg-slate-950 border-b border-slate-800 px-5 sm:px-8 pt-3 flex gap-2">
          <button
            id="tab-select-dru"
            type="button"
            onClick={() => {
              setActiveTab('dru');
              setDruError('');
            }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-t-xl text-xs sm:text-sm font-bold transition border-t border-x ${
              activeTab === 'dru'
                ? 'bg-slate-900 border-amber-500/40 text-amber-300 shadow-sm'
                : 'bg-slate-950/60 border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <span>Login DRU</span>
          </button>

          <button
            id="tab-select-pecel"
            type="button"
            onClick={() => {
              setActiveTab('pecel');
              setPecelError('');
            }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-t-xl text-xs sm:text-sm font-bold transition border-t border-x ${
              activeTab === 'pecel'
                ? 'bg-slate-900 border-emerald-500/40 text-emerald-300 shadow-sm'
                : 'bg-slate-950/60 border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
            }`}
          >
            <UserCheck className="w-4 h-4 text-emerald-400" />
            <span>Login PECEL</span>
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5 sm:p-8 bg-slate-900/70">
          {activeTab === 'dru' ? (
            /* =================== DRU LOGIN FORM =================== */
            <form onSubmit={handleDruSubmit} className="space-y-4 max-w-md mx-auto">
              <div className="text-center mb-5">
                <div className="inline-flex p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 mb-2 shadow-inner">
                  <ShieldCheck className="w-7 h-7" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-amber-200">
                  Halaman Pengelola DRU
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Kendali utama inventaris, manajemen logo, dan data motor
                </p>
              </div>

              {/* Username Permanen: DRU */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-amber-400" />
                    <span>Username (Permanen)</span>
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 font-mono font-bold">
                    Terkunci
                  </span>
                </label>
                <div className="relative">
                  <input
                    id="input-dru-username"
                    type="text"
                    value="DRU"
                    disabled
                    readOnly
                    className="w-full pl-3.5 pr-10 py-2.5 text-sm bg-slate-950 border border-amber-500/30 rounded-xl text-amber-300 font-mono font-bold tracking-wider cursor-not-allowed select-all shadow-inner"
                  />
                  <ShieldCheck className="w-4 h-4 text-amber-400/70 absolute right-3.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              {/* Password DRU (Default 123456, toggle show/hide) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                    <span>Password</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setRecoveryRole('dru');
                      setRecoveryError('');
                      setRecoverySuccess('');
                      setRecoveryCode('');
                    }}
                    className="text-xs text-amber-400 hover:text-amber-300 hover:underline flex items-center gap-1 transition"
                  >
                    <HelpCircle className="w-3 h-3" />
                    <span>Lupa Password?</span>
                  </button>
                </div>

                <div className="relative">
                  <input
                    id="input-dru-password"
                    type={showDruPassword ? 'text' : 'password'}
                    placeholder="Masukkan password..."
                    value={druPassword}
                    onChange={(e) => {
                      setDruPassword(e.target.value);
                      setDruError('');
                    }}
                    autoFocus
                    className="w-full pl-3.5 pr-12 py-2.5 text-sm bg-slate-950 border border-slate-700 focus:border-amber-400 focus:ring-1 focus:ring-amber-400/30 rounded-xl text-slate-100 placeholder:text-slate-500 focus:outline-none transition shadow-inner"
                  />
                  <button
                    type="button"
                    onClick={() => setShowDruPassword(!showDruPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-amber-300 transition p-1"
                    title={showDruPassword ? "Sembunyikan Password" : "Tampilkan Password"}
                  >
                    {showDruPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {druError && (
                <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-500/50 text-rose-300 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{druError}</span>
                </div>
              )}

              {/* Success Message */}
              {druSuccess && (
                <div className="p-3 rounded-xl bg-emerald-950/70 border border-emerald-500/50 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{druSuccess}</span>
                </div>
              )}

              {/* Submit Button */}
              <button
                id="btn-submit-login-dru"
                type="submit"
                className="w-full py-3 px-4 bg-linear-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 cursor-pointer mt-2"
              >
                <span>Masuk ke Halaman DRU</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            /* =================== PECEL LOGIN FORM =================== */
            <form onSubmit={handlePecelSubmit} className="space-y-4 max-w-md mx-auto">
              <div className="text-center mb-5">
                <div className="inline-flex p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 mb-2 shadow-inner">
                  <UserCheck className="w-7 h-7" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-emerald-200">
                  Halaman Pengawas PECEL
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Verifikasi durasi menginap motor dan konfirmasi pemasukan
                </p>
              </div>

              {/* Username Permanen: PECEL */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Username (Permanen)</span>
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-mono font-bold">
                    Terkunci
                  </span>
                </label>
                <div className="relative">
                  <input
                    id="input-pecel-username"
                    type="text"
                    value="PECEL"
                    disabled
                    readOnly
                    className="w-full pl-3.5 pr-10 py-2.5 text-sm bg-slate-950 border border-emerald-500/30 rounded-xl text-emerald-300 font-mono font-bold tracking-wider cursor-not-allowed select-all shadow-inner"
                  />
                  <UserCheck className="w-4 h-4 text-emerald-400/70 absolute right-3.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              {/* Password PECEL (Default 123456, toggle show/hide) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Password</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setRecoveryRole('pecel');
                      setRecoveryError('');
                      setRecoverySuccess('');
                      setRecoveryCode('');
                    }}
                    className="text-xs text-emerald-400 hover:text-emerald-300 hover:underline flex items-center gap-1 transition"
                  >
                    <HelpCircle className="w-3 h-3" />
                    <span>Lupa Password?</span>
                  </button>
                </div>

                <div className="relative">
                  <input
                    id="input-pecel-password"
                    type={showPecelPassword ? 'text' : 'password'}
                    placeholder="Masukkan password..."
                    value={pecelPassword}
                    onChange={(e) => {
                      setPecelPassword(e.target.value);
                      setPecelError('');
                    }}
                    autoFocus
                    className="w-full pl-3.5 pr-12 py-2.5 text-sm bg-slate-950 border border-slate-700 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/30 rounded-xl text-slate-100 placeholder:text-slate-500 focus:outline-none transition shadow-inner"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPecelPassword(!showPecelPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-300 transition p-1"
                    title={showPecelPassword ? "Sembunyikan Password" : "Tampilkan Password"}
                  >
                    {showPecelPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {pecelError && (
                <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-500/50 text-rose-300 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{pecelError}</span>
                </div>
              )}

              {/* Success Message */}
              {pecelSuccess && (
                <div className="p-3 rounded-xl bg-emerald-950/70 border border-emerald-500/50 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{pecelSuccess}</span>
                </div>
              )}

              {/* Submit Button */}
              <button
                id="btn-submit-login-pecel"
                type="submit"
                className="w-full py-3 px-4 bg-linear-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-bold rounded-xl text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 active:scale-95 cursor-pointer mt-2"
              >
                <span>Masuk ke Halaman PECEL</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 sm:px-8 py-3.5 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Sistem Akses Keamanan MOTORKU</span>
          </span>
          <button
            id="btn-cancel-portal-modal"
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700 text-xs font-semibold cursor-pointer active:scale-95 transition"
            title="Kembali ke Halaman Utama"
          >
            <Home className="w-3.5 h-3.5 text-amber-400" />
            <span>Kembali ke Halaman Utama</span>
          </button>
        </div>
      </div>

      {/* ================= MODAL LUPA PASSWORD (RESET DENGAN KODE KHUSUS) ================= */}
      {recoveryRole && (
        <div 
          id="modal-recovery-overlay"
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        >
          <div className="bg-slate-900 border border-amber-500/40 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-100">
                    Pemulihan Password {recoveryRole.toUpperCase()}
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Reset password kembali ke normal: <strong>{DEFAULT_PASSWORD}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRecoveryRole(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRecoverySubmit} className="space-y-3.5">
              <p className="text-xs text-slate-300 leading-relaxed">
                Silakan masukkan <strong>Kode Pemulihan Rahasia</strong>. Jika kode valid, password akun <strong>{recoveryRole.toUpperCase()}</strong> akan otomatis dikembalikan ke normal (<strong>{DEFAULT_PASSWORD}</strong>).
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Kode Pemulihan
                </label>
                <div className="relative">
                  <input
                    id="input-recovery-code"
                    type={showRecoveryCode ? 'text' : 'password'}
                    placeholder="Masukkan kode khusus..."
                    value={recoveryCode}
                    onChange={(e) => {
                      setRecoveryCode(e.target.value);
                      setRecoveryError('');
                    }}
                    autoFocus
                    className="w-full pl-3.5 pr-11 py-2.5 text-sm bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl text-slate-100 placeholder:text-slate-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRecoveryCode(!showRecoveryCode)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-amber-300 p-1"
                    title={showRecoveryCode ? "Sembunyikan Kode" : "Tampilkan Kode"}
                  >
                    {showRecoveryCode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {recoveryError && (
                <div className="p-2.5 rounded-lg bg-rose-950/70 border border-rose-500/50 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{recoveryError}</span>
                </div>
              )}

              {recoverySuccess && (
                <div className="p-2.5 rounded-lg bg-emerald-950/70 border border-emerald-500/50 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{recoverySuccess}</span>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRecoveryRole(null)}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  id="btn-submit-recovery-code"
                  className="flex-1 py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-md shadow-amber-500/20"
                >
                  Pulihkan Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
