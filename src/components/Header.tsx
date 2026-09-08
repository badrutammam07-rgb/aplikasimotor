import React from 'react';
import { DoorOpen, Bike, Sparkles, ShieldCheck, UserCheck, KeyRound, LogOut, Home } from 'lucide-react';
import { AppConfig } from '../types';

interface HeaderProps {
  config: AppConfig;
  activeRole: 'guest' | 'dru' | 'pecel';
  onOpenPortalDoors: () => void;
  onOpenDruPanel: () => void;
  onOpenPecelPanel: () => void;
  onLogout: () => void;
  onGoHome?: () => void;
}

export default function Header({
  config,
  activeRole,
  onOpenPortalDoors,
  onOpenDruPanel,
  onOpenPecelPanel,
  onLogout,
  onGoHome
}: HeaderProps) {
  return (
    <header 
      id="main-header" 
      className="shrink-0 w-full bg-linear-to-r from-slate-950 via-slate-900 to-slate-950 text-white shadow-2xl border-b border-amber-500/20 sticky top-0 z-30"
    >
      {/* Luxury gold accent line at top */}
      <div className="h-0.5 w-full bg-linear-to-r from-transparent via-amber-400 to-transparent opacity-80" />

      <div className="w-full px-3 sm:px-8 py-3 flex items-center justify-between gap-4">
        {/* Left: Logo (Diatur oleh DRU) + Title MOTORKU */}
        <div 
          onClick={onGoHome}
          className={`flex items-center gap-3 sm:gap-4 ${onGoHome ? 'cursor-pointer select-none group/home' : ''}`}
          title={onGoHome ? "Kembali ke Halaman Utama" : undefined}
        >
          <div 
            id="header-logo-container"
            className="relative group flex items-center justify-center h-12 w-12 sm:h-14 sm:w-14 rounded-xl bg-radial from-slate-800 to-slate-950 border border-amber-400/40 overflow-hidden shadow-lg shadow-black/60 shrink-0 transition-transform duration-300 group-hover/home:scale-105"
            title={config.logoUrl ? "Logo Eksklusif MOTORKU (Dikelola oleh DRU)" : "Logo MOTORKU (Dapat diubah melalui Halaman DRU)"}
          >
            {config.logoUrl ? (
              <img
                id="header-custom-logo"
                src={config.logoUrl}
                alt="Logo MOTORKU"
                referrerPolicy="no-referrer"
                className="h-full w-full object-contain p-1.5"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              <div id="header-default-logo" className="flex flex-col items-center justify-center text-amber-400 relative">
                <Bike className="w-7 h-7 sm:w-8 sm:h-8 drop-shadow-[0_2px_8px_rgba(245,158,11,0.5)]" />
                <Sparkles className="w-2.5 h-2.5 text-amber-300 absolute -top-1 -right-1 animate-pulse" />
              </div>
            )}
            {/* Subtle luxury sheen overlay */}
            <div className="absolute inset-0 bg-linear-to-tr from-transparent via-white/5 to-transparent pointer-events-none" />
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h1 
                id="app-title" 
                className="text-2xl sm:text-3xl md:text-4xl font-black tracking-widest text-transparent bg-clip-text bg-linear-to-r from-amber-200 via-amber-400 to-amber-100 uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
              >
                MOTORKU
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] tracking-widest uppercase px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 font-semibold">
                PREMIUM SUITE
              </span>
            </div>
            <span className="text-[11px] sm:text-xs text-slate-400 font-normal tracking-wide flex items-center gap-1.5">
              <span>Sistem Manajemen & Inventarisasi Kendaraan</span>
              <span className="w-1 h-1 rounded-full bg-amber-400/80 inline-block" />
              <span className="text-amber-400/80 font-mono">Live Sync</span>
            </span>
          </div>
        </div>

        {/* Right: HANYA SATU LOGO PINTU */}
        <div className="flex items-center gap-3">
          {activeRole === 'guest' ? (
            /* HANYA LOGO SATU PINTU: Ketika diklik baru muncul tampilan login DRU & PECEL */
            <button
              id="single-door-button"
              onClick={onOpenPortalDoors}
              className="relative group flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-linear-to-b from-slate-800 to-slate-900 hover:from-slate-750 hover:to-slate-850 border border-amber-500/40 hover:border-amber-400 text-amber-200 hover:text-amber-100 transition-all duration-200 shadow-lg shadow-black/50 hover:shadow-amber-500/10 active:scale-95"
              title="Pintu Masuk Login Portal DRU & PECEL"
            >
              {/* Luxury Illuminated Door Emblem */}
              <div className="relative p-1.5 rounded-lg bg-linear-to-b from-amber-500/20 to-amber-500/5 border border-amber-400/30 text-amber-300 group-hover:text-amber-200 transition">
                <DoorOpen className="w-5 h-5 sm:w-6 sm:h-6" />
                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,1)] animate-ping" />
              </div>

              <div className="text-left flex flex-col pr-1">
                <span className="text-[10px] uppercase font-bold text-amber-400/80 tracking-widest leading-none">
                  Pintu Akses
                </span>
                <span className="text-xs sm:text-sm font-bold text-slate-100 tracking-wide flex items-center gap-1">
                  <span>Portal</span>
                  <KeyRound className="w-3 h-3 text-amber-400 opacity-80" />
                </span>
              </div>
            </button>
          ) : (
            /* Logged in state with fast return to active panel, go home, or logout */
            <div className="flex items-center gap-2 sm:gap-3">
              {onGoHome && (
                <button
                  id="btn-header-home"
                  type="button"
                  onClick={onGoHome}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 hover:text-amber-200 border border-amber-500/30 text-xs font-semibold cursor-pointer active:scale-95 shadow-xs transition"
                  title="Kembali ke Halaman Utama"
                >
                  <Home className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">Halaman Utama</span>
                </button>
              )}

              {activeRole === 'dru' ? (
                <button
                  id="btn-active-dru"
                  onClick={onOpenDruPanel}
                  className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-sm transition shadow-lg shadow-amber-500/20"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Panel DRU</span>
                </button>
              ) : (
                <button
                  id="btn-active-pecel"
                  onClick={onOpenPecelPanel}
                  className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm transition shadow-lg shadow-emerald-600/20"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>Panel PECEL</span>
                </button>
              )}

              {/* Also allow opening the other door or logout */}
              <button
                id="btn-switch-portal"
                onClick={onOpenPortalDoors}
                className="p-2 rounded-lg bg-slate-800 border border-slate-700 hover:border-amber-400/40 text-slate-300 hover:text-amber-300 transition"
                title="Ganti Pintu Masuk Portal"
              >
                <DoorOpen className="w-4 h-4" />
              </button>

              <button
                id="btn-header-logout"
                type="button"
                onClick={onLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-950/70 hover:bg-rose-900 border border-rose-500/40 hover:border-rose-500/60 text-rose-300 hover:text-white text-xs font-bold transition cursor-pointer active:scale-95 shadow-xs"
                title="Logout dan langsung keluar ke halaman utama"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-400" />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
