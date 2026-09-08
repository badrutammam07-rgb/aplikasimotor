import React from 'react';

export default function Footer() {
  return (
    <footer 
      id="app-footer" 
      className="shrink-0 sticky bottom-0 w-full bg-slate-950/95 backdrop-blur-md text-slate-400 py-3 px-4 text-center border-t border-slate-900/90 text-xs tracking-wide select-none font-medium z-30 shadow-lg"
    >
      <div className="flex items-center justify-center flex-wrap gap-2 text-[11px] sm:text-xs">
        <span className="uppercase text-slate-500">support by ghighais development</span>
        <span className="text-slate-600 hidden sm:inline">•</span>
        <span className="text-slate-400 font-semibold tracking-normal">© ghighais development</span>
      </div>
    </footer>
  );
}
