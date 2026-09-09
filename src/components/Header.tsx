import React, { useRef } from 'react';
import { Bike, Sparkles, ShieldCheck, LogOut, Home } from 'lucide-react';
import { AppConfig } from '../types';

interface HeaderProps {
  config: AppConfig;
  activeRole: 'guest' | 'dru';
  onOpenPortalDoors: () => void;
  onOpenDruPanel: () => void;
  onLogout: () => void;
  onGoHome?: () => void;
}

export default function Header({
  config,
  activeRole,
  onOpenPortalDoors,
  onOpenDruPanel,
  onLogout,
  onGoHome
}: HeaderProps) {
  // Hidden access: tap the logo 3 times to reveal the DRU login
  const tapCount = useRef(0);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSecretTap = () => {
    tapCount.current += 1;

    if (tapTimer.current) {
      clearTimeout(tapTimer.current);
    }

    if (tapCount.current >= 3) {
      tapCount.current = 0;
      onOpenPortalDoors();
      return;
    }

    tapTimer.current = setTimeout(() => {
      tapCount.current = 0;
    }, 900);
  };

  return (
    <header
      id="main-header"
      className="shrink-0 w-full bg-linear-to-r from-slate-950 via-slate-900 to-slate-950 text-white shadow-2xl border-b border-amber-500/20 sticky top-0 z-30"
    >
      <div className="h-0.5 w-full bg-linear-to-r from-transparent via-amber-400 to-transparent opacity-80" />

      <div className="w-full px-3 sm:px-8 py-3 flex items-center justify-between gap-4">
        {/* Left: Logo (hidden 3x tap access) + Judul EL-GHIGHAIS */}
        <div className="flex items-center gap-3 sm:gap-4">
          <div
            id="header-logo-container"
            onClick={handleSecretTap}
            className="relative group flex items-center justify-center h-12 w-12 sm:h-14 sm:w-14 rounded-xl bg-radial from-slate-800 to-slate-950 border border-amber-400/40 overflow-hidden shadow-lg shadow-black/60 shrink-0 cursor-pointer select-none transition-transform duration-300 active:scale-95"
            title="EL-GHIGHAIS MOTOR"
          >
            {config.logoUrl ? (
              <img
                id="header-custom-logo"
                src={config.logoUrl}
                alt="Logo EL-GHIGHAIS MOTOR"
                referrerPolicy="no-referrer"
                className="h-full w-full object-contain p-1.5 pointer-events-none"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              <div id="header-default-logo" className="flex flex-col items-center justify-center text-amber-400 relative pointer-events-none">
                <Bike className="w-7 h-7 sm:w-8 sm:h-8 drop-shadow-[0_2px_8px_rgba(245,158,11,0.5)]" />
                <Sparkles className="w-2.5 h-2.5 text-amber-300 absolute -top-1 -right-1 animate-pulse" />
              </div>
            )}
            <div className="absolute inset-0 bg-linear-to-tr from-transparent via-white/5 to-transparent pointer-events-none" />
          </div>

          <div
            onClick={onGoHome}
            className={`flex flex-col leading-none ${onGoHome ? 'cursor-pointer select-none' : ''}`}
          >
            <h1
              id="app-title"
              className="text-xl sm:text-3xl md:text-4xl font-black tracking-widest text-transparent bg-clip-text bg-linear-to-r from-amber-200 via-amber-400 to-amber-100 uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
            >
              EL-GHIGHAIS
            </h1>
            <span
              id="app-subtitle-motor"
              className="text-sm sm:text-lg font-bold tracking-[0.45em] text-amber-100/90 uppercase mt-1"
            >
              MOTOR
            </span>
            <span
              id="app-subtitle-city"
              className="text-[10px] sm:text-xs text-slate-400 tracking-[0.3em] uppercase mt-0.5"
            >
              Jakarta
            </span>
          </div>
        </div>

        {/* Right: hanya tampil setelah login DRU */}
        <div className="flex items-center gap-2 sm:gap-3">
          {activeRole === 'dru' && (
            <>
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

              <button
                id="btn-active-dru"
                onClick={onOpenDruPanel}
                className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-sm transition shadow-lg shadow-amber-500/20"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Panel DRU</span>
              </button>

              <button
                id="btn-header-logout"
                type="button"
                onClick={onLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-950/70 hover:bg-rose-900 border border-rose-500/40 hover:border-rose-500/60 text-rose-300 hover:text-white text-xs font-bold transition cursor-pointer active:scale-95 shadow-xs"
                title="Logout dan keluar ke halaman utama"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-400" />
                <span>Logout</span>
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
