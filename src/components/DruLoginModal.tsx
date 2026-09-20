import React, { useState } from "react";
import {
  X,
  ShieldCheck,
  KeyRound,
  Eye,
  EyeOff,
  ArrowRight,
  HelpCircle,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Lock,
  ArrowLeft,
} from "lucide-react";
import { verifyLoginPassword, resetPasswordWithMasterCode, DEFAULT_PASSWORD } from "../utils/auth";

interface DruLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginDruSuccess: () => void;
}

export default function DruLoginModal({ isOpen, onClose, onLoginDruSuccess }: DruLoginModalProps) {
  const [druPassword, setDruPassword] = useState("");
  const [showDruPassword, setShowDruPassword] = useState(false);
  const [druError, setDruError] = useState("");
  const [druSuccess, setDruSuccess] = useState("");

  const [isRecovery, setIsRecovery] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState("");
  const [showRecoveryCode, setShowRecoveryCode] = useState(false);
  const [recoveryError, setRecoveryError] = useState("");
  const [recoverySuccess, setRecoverySuccess] = useState("");

  if (!isOpen) return null;

  const handleDruSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDruError("");
    setDruSuccess("");

    if (!druPassword) {
      setDruError("Password DRU harus diisi.");
      return;
    }

    if (verifyLoginPassword("dru", druPassword)) {
      setDruSuccess("Login DRU berhasil. Membuka panel pengelola...");
      setTimeout(() => {
        onLoginDruSuccess();
      }, 300);
    } else {
      setDruError('Password DRU salah! Periksa kembali atau klik "Lupa Password?".');
    }
  };

  const handleRecoverySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError("");
    setRecoverySuccess("");

    const res = resetPasswordWithMasterCode("dru", recoveryCode);
    if (res.success) {
      setRecoverySuccess(res.message);
      setDruPassword(DEFAULT_PASSWORD);
      setDruError("");
      setDruSuccess("Password kembali ke " + DEFAULT_PASSWORD);
      setTimeout(() => {
        setIsRecovery(false);
        setRecoveryCode("");
        setRecoverySuccess("");
      }, 2200);
    } else {
      setRecoveryError(res.message);
    }
  };

  return (
    <div
      id="dru-login-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/90 backdrop-blur-md overflow-y-auto"
    >
      <div
        id="dru-login-modal-container"
        className="relative bg-linear-to-b from-slate-900 to-slate-950 text-slate-100 rounded-2xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.95)] w-full max-w-md border border-amber-500/30 overflow-hidden my-auto"
      >
        <div className="h-1 w-full bg-linear-to-r from-transparent via-amber-400 to-transparent" />

        <div className="px-5 py-4 flex items-center justify-between border-b border-slate-800/80 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shadow-inner">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-wide text-transparent bg-clip-text bg-linear-to-r from-amber-200 via-amber-400 to-amber-100 uppercase">
                Akses DRU
              </h2>
              <p className="text-[11px] text-slate-400">Pintu masuk khusus pengelola</p>
            </div>
          </div>
          <button
            id="btn-close-dru-login"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition cursor-pointer"
            title="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 sm:p-7 bg-slate-900/70">
          {!isRecovery ? (
            <form onSubmit={handleDruSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-amber-400" />
                    <span>Username (Permanen)</span>
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 font-mono font-bold">
                    Terkunci
                  </span>
                </label>
                <input
                  id="input-dru-username"
                  type="text"
                  value="DRU"
                  disabled
                  readOnly
                  className="w-full pl-3.5 pr-10 py-2.5 text-sm bg-slate-950 border border-amber-500/30 rounded-xl text-amber-300 font-mono font-bold tracking-wider cursor-not-allowed shadow-inner"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                    <span>Password</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsRecovery(true);
                      setRecoveryError("");
                      setRecoverySuccess("");
                      setRecoveryCode("");
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
                    type={showDruPassword ? "text" : "password"}
                    placeholder="Masukkan password..."
                    value={druPassword}
                    onChange={(e) => {
                      setDruPassword(e.target.value);
                      setDruError("");
                    }}
                    autoFocus
                    className="w-full pl-3.5 pr-12 py-2.5 text-sm bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl text-slate-100 placeholder:text-slate-500 focus:outline-none transition shadow-inner"
                  />
                  <button
                    type="button"
                    onClick={() => setShowDruPassword(!showDruPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-amber-300 transition p-1"
                    title={showDruPassword ? "Sembunyikan Password" : "Tampilkan Password"}
                  >
                    {showDruPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {druError && (
                <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-500/50 text-rose-300 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{druError}</span>
                </div>
              )}

              {druSuccess && (
                <div className="p-3 rounded-xl bg-emerald-950/70 border border-emerald-500/50 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{druSuccess}</span>
                </div>
              )}

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
            <form onSubmit={handleRecoverySubmit} className="space-y-4">
              <div className="flex items-center gap-2 text-amber-300 text-sm font-bold">
                <RotateCcw className="w-4 h-4" />
                <span>Pemulihan Password DRU</span>
              </div>
              <p className="text-xs text-slate-400">
                Masukkan kode pemulihan rahasia untuk mengembalikan password ke default.
              </p>

              <div className="relative">
                <input
                  id="input-recovery-code"
                  type={showRecoveryCode ? "text" : "password"}
                  placeholder="Kode pemulihan..."
                  value={recoveryCode}
                  onChange={(e) => {
                    setRecoveryCode(e.target.value);
                    setRecoveryError("");
                  }}
                  autoFocus
                  className="w-full pl-3.5 pr-12 py-2.5 text-sm bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl text-slate-100 placeholder:text-slate-500 focus:outline-none transition shadow-inner"
                />
                <button
                  type="button"
                  onClick={() => setShowRecoveryCode(!showRecoveryCode)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-amber-300 transition p-1"
                >
                  {showRecoveryCode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {recoveryError && (
                <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-500/50 text-rose-300 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{recoveryError}</span>
                </div>
              )}

              {recoverySuccess && (
                <div className="p-3 rounded-xl bg-emerald-950/70 border border-emerald-500/50 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{recoverySuccess}</span>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsRecovery(false)}
                  className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-xs font-bold cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Kembali</span>
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs cursor-pointer active:scale-95"
                >
                  Reset Password
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
