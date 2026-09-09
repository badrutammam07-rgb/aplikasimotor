import React, { useState, useMemo } from 'react';
import { Search, ArrowUpDown, ShieldAlert, Sparkles, Clock, CalendarDays, Bike, Lock, ShieldCheck, Layers, Tag, Flame, ParkingMeter, Edit2, Trash2, AlertTriangle } from 'lucide-react';
import { MotorRecord, KepemilikanType } from '../types';
import { calculateElapsedDays, formatElapsedDays } from '../data/initialData';

interface MotorTableProps {
  data: MotorRecord[];
  activeRole?: 'guest' | 'dru' | 'pecel';
  isLoading?: boolean;
  onOpenPortalDoors: () => void;
  onStartEditMotor?: (record: MotorRecord) => void;
  onDeleteMotor?: (id: string) => Promise<void> | void;
}

type SortField = 'tanggal' | 'motor' | 'tahun' | 'nopol' | 'hari' | 'status';
type SortOrder = 'asc' | 'desc';

export default function MotorTable({
  data,
  activeRole = 'guest',
  isLoading = false,
  onOpenPortalDoors,
  onStartEditMotor,
  onDeleteMotor
}: MotorTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [kepemilikanFilter, setKepemilikanFilter] = useState<'all' | KepemilikanType>('all');
  const [sortField, setSortField] = useState<SortField>('tanggal');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [itemToDelete, setItemToDelete] = useState<MotorRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteNotice, setDeleteNotice] = useState('');

  // "Namun untuk semua motor yang terinput akan masuk ke halaman utama untuk tabel tetap sama"
  // Mandat: jika motor sudah lunas maka motor tersebut tidak lagi ditampilkan pada halaman utama
  const allDataProcessed = useMemo(() => {
    return data
      .filter((item) => !item.lunas) // Motor yang sudah lunas tidak ditampilkan di halaman utama
      .map((item) => {
        const elapsed = calculateElapsedDays(item.tanggal);
        // Aturan Status: Jika sudah lebih dari 3 bulan (> 90 hari) maka LELANG, jika dibawah itu maka PARKIR
        const status = elapsed > 90 ? 'LELANG' : 'PARKIR';
        return {
          ...item,
          elapsedDays: elapsed,
          hariDisplay: formatElapsedDays(item.tanggal),
          status,
          kepemilikanVal: item.kepemilikan || 'pecel'
        };
      });
  }, [data]);

  // Total counts for Parkir and Lelang
  const statusCounts = useMemo(() => {
    let parkir = 0;
    let lelang = 0;
    allDataProcessed.forEach((item) => {
      if (item.status === 'LELANG') {
        lelang++;
      } else {
        parkir++;
      }
    });
    return { parkir, lelang };
  }, [allDataProcessed]);

  // Filtered & Sorted data
  const filteredData = useMemo(() => {
    return allDataProcessed
      .filter((item) => {
        const matchSearch =
          item.motor.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.nopol.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.tanggal.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.hariDisplay.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.status.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.kepemilikanVal.toLowerCase().includes(searchTerm.toLowerCase());

        let matchKepemilikan = true;
        if (kepemilikanFilter !== 'all') {
          matchKepemilikan = item.kepemilikanVal === kepemilikanFilter;
        }

        return matchSearch && matchKepemilikan;
      })
      .sort((a, b) => {
        if (sortField === 'hari') {
          return sortOrder === 'asc' ? a.elapsedDays - b.elapsedDays : b.elapsedDays - a.elapsedDays;
        }
        const valA = a[sortField];
        const valB = b[sortField];

        if (typeof valA === 'string' && typeof valB === 'string') {
          return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortOrder === 'asc' ? valA - valB : valB - valA;
        }
        return 0;
      });
  }, [allDataProcessed, searchTerm, kepemilikanFilter, sortField, sortOrder, activeRole]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  return (
    <div 
      id="motor-table-section" 
      className="flex-1 min-h-0 flex flex-col w-full bg-slate-950 text-slate-100 overflow-hidden relative"
    >
      {/* Luxury Filter & Search Toolbar (Statik / Tidak Bergerak) */}
      <div 
        id="table-toolbar" 
        className="shrink-0 w-full bg-linear-to-r from-slate-900 via-slate-925 to-slate-900 border-b border-amber-500/20 px-4 sm:px-8 py-3 flex flex-wrap items-center justify-between gap-3 shadow-md z-20"
      >
        {/* Left: Search box */}
        <div className="relative flex-1 max-w-sm sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400/70" />
          <input
            id="input-search-table"
            type="text"
            placeholder="Cari nopol kendaraan, motor, tanggal, hari..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-950 border border-slate-750 focus:border-amber-400/80 rounded-xl text-slate-100 placeholder:text-slate-500 focus:outline-none shadow-inner transition"
          />
        </div>

        {/* Middle / Right: Status Counts & Filters */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Quick Status Badges */}
          <div className="flex items-center gap-2">
            <span 
              title="Unit motor dengan status PARKIR (≤ 90 hari / 3 bulan)"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 whitespace-nowrap"
            >
              <ParkingMeter className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Parkir: <strong className="font-mono text-emerald-200">{statusCounts.parkir}</strong></span>
            </span>

            <span 
              title="Unit motor dengan status LELANG (> 90 hari / 3 bulan)"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-500/15 border border-rose-500/30 text-rose-300 whitespace-nowrap"
            >
              <Flame className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span>Lelang: <strong className="font-mono text-rose-200">{statusCounts.lelang}</strong></span>
            </span>
          </div>

          {/* DRU Ownership Filter (Only available when logged in as DRU) */}
          {activeRole === 'dru' && (
            <div className="flex items-center gap-1.5 text-xs text-slate-300">
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline font-medium">Hak:</span>
              <select
                id="select-filter-kepemilikan"
                value={kepemilikanFilter}
                onChange={(e) => setKepemilikanFilter(e.target.value as any)}
                className="px-2.5 py-1.5 text-xs bg-slate-950 border border-amber-500/40 rounded-xl text-amber-300 focus:outline-none cursor-pointer"
              >
                <option value="all">Semua Kepemilikan</option>
                <option value="pecel">Pecel</option>
                <option value="pribadi">Pribadi</option>
                <option value="mamah">Mamah</option>
              </select>
            </div>
          )}

          {/* Role Status Tag */}
          {activeRole === 'dru' ? (
            <span className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/15 border border-amber-500/40 text-amber-300">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Akses DRU</span>
            </span>
          ) : (
            <span className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-teal-500/15 border border-teal-500/40 text-teal-300">
              <Lock className="w-3.5 h-3.5" />
              <span>Unit Pecel</span>
            </span>
          )}
        </div>
      </div>

      {/* Main Luxury Table: Seluruh 6 kolom (Tanggal, Motor, Tahun, Nopol, Hari, Status) tampil jelas */}
      <div 
        id="table-scroll-container" 
        className="flex-1 min-h-0 w-full overflow-y-auto relative scroll-smooth bg-slate-950 p-2.5 sm:p-5"
      >
        <div className="w-full max-w-7xl mx-auto rounded-2xl border border-slate-800 shadow-2xl shadow-black/80 bg-slate-950 overflow-x-auto">
          <table 
            id="main-motor-table" 
            className="w-full text-left border-collapse table-auto min-w-[680px]"
          >
            {/* Sticky Luxury Header */}
            <thead className="sticky top-0 z-10 bg-linear-to-b from-slate-900 to-slate-950 text-amber-200/90 text-xs uppercase tracking-wider select-none shadow-lg shadow-black/60 border-b border-amber-500/30">
              <tr className="divide-x divide-slate-800">
                {/* 1. Tanggal Masuk */}
                <th 
                  id="th-tanggal" 
                  onClick={() => handleSort('tanggal')}
                  className="py-3 px-3 sm:px-4 font-bold cursor-pointer hover:bg-slate-800/80 hover:text-amber-300 transition whitespace-nowrap"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5">
                      <CalendarDays className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>Tanggal</span>
                    </span>
                    <ArrowUpDown className="w-3 h-3 opacity-60 shrink-0" />
                  </div>
                </th>

                {/* 2. Motor */}
                <th 
                  id="th-motor" 
                  onClick={() => handleSort('motor')}
                  className="py-3 px-3 sm:px-4 font-bold cursor-pointer hover:bg-slate-800/80 hover:text-amber-300 transition whitespace-nowrap"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5">
                      <Bike className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>Motor</span>
                    </span>
                    <ArrowUpDown className="w-3 h-3 opacity-60 shrink-0" />
                  </div>
                </th>

                {/* 3. Tahun */}
                <th 
                  id="th-tahun" 
                  onClick={() => handleSort('tahun')}
                  className="py-3 px-2 sm:px-3 font-bold cursor-pointer hover:bg-slate-800/80 hover:text-amber-300 transition whitespace-nowrap text-center"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Tahun</span>
                    <ArrowUpDown className="w-3 h-3 opacity-60 shrink-0" />
                  </div>
                </th>

                {/* 4. Nopol */}
                <th 
                  id="th-nopol" 
                  onClick={() => handleSort('nopol')}
                  className="py-3 px-3 sm:px-4 font-bold cursor-pointer hover:bg-slate-800/80 hover:text-amber-300 transition whitespace-nowrap text-center"
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span>Nopol</span>
                    <ArrowUpDown className="w-3 h-3 opacity-60 shrink-0" />
                  </div>
                </th>

                {/* 5. Hari (Otomatis Dihitung dari Tanggal Motor Masuk Sampai Hari Ini) */}
                <th 
                  id="th-hari" 
                  onClick={() => handleSort('hari')}
                  className="py-3 px-3 sm:px-4 font-bold cursor-pointer hover:bg-slate-800/80 hover:text-amber-300 transition whitespace-nowrap text-center bg-slate-900/60"
                  title="Dihitung otomatis: jumlah hari sejak tanggal motor masuk sampai hari ini"
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>Hari</span>
                    <ArrowUpDown className="w-3 h-3 opacity-60 shrink-0" />
                  </div>
                </th>

                {/* 6. Status (LELANG jika > 3 bulan, PARKIR jika ≤ 3 bulan) */}
                <th 
                  id="th-status" 
                  onClick={() => handleSort('status')}
                  className="py-3 px-3 sm:px-4 font-bold cursor-pointer hover:bg-slate-800/80 hover:text-amber-300 transition whitespace-nowrap text-center bg-slate-900/60"
                  title="Status: LELANG jika > 3 bulan (> 90 hari), PARKIR jika ≤ 3 bulan"
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>Status</span>
                    <ArrowUpDown className="w-3 h-3 opacity-60 shrink-0" />
                  </div>
                </th>

                {/* 7. DRU Admin Actions: Edit & Hapus Motor */}
                {activeRole === 'dru' && (
                  <th
                    id="th-dru-action"
                    className="py-3 px-3 sm:px-4 font-bold text-center bg-slate-900/80 text-amber-400 whitespace-nowrap border-l border-slate-800"
                  >
                    Aksi
                  </th>
                )}
              </tr>
            </thead>

            {/* Striped and Bordered Luxury Body */}
            <tbody className="divide-y divide-slate-800/90 text-xs sm:text-sm">
              {filteredData.length > 0 ? (
                filteredData.map((row) => {
                  const isFresh = row.elapsedDays <= 3;
                  const isMedium = row.elapsedDays > 3 && row.elapsedDays <= 14;

                  return (
                    <tr
                      key={row.id}
                      id={`table-row-${row.id}`}
                      className="even:bg-slate-900/50 odd:bg-slate-950/80 hover:bg-amber-500/10 transition-colors duration-150 divide-x divide-slate-800/80 group"
                    >
                      {/* 1. Tanggal */}
                      <td className="py-3 px-3 sm:px-4 font-mono text-xs sm:text-sm text-slate-300 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-200">{row.tanggal}</span>
                          <span className="text-[10px] text-slate-500">Tgl Masuk</span>
                        </div>
                      </td>

                      {/* 2. Motor */}
                      <td className="py-3 px-3 sm:px-4 font-semibold text-slate-100">
                        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                          <span className="text-slate-100 group-hover:text-amber-300 transition font-bold text-xs sm:text-sm whitespace-nowrap">
                            {row.motor}
                          </span>

                          {/* DRU Mode Kepemilikan Tag */}
                          {activeRole === 'dru' && (
                            <span
                              className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-md border whitespace-nowrap ${
                                row.kepemilikanVal === 'pecel'
                                  ? 'bg-teal-950/60 border-teal-500/40 text-teal-300'
                                  : row.kepemilikanVal === 'pribadi'
                                  ? 'bg-amber-950/60 border-amber-500/40 text-amber-300'
                                  : 'bg-purple-950/60 border-purple-500/40 text-purple-300'
                              }`}
                            >
                              {row.kepemilikanVal}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 3. Tahun */}
                      <td className="py-3 px-2 sm:px-3 text-center font-medium whitespace-nowrap">
                        <span className="inline-block px-2.5 py-1 rounded-md bg-slate-900 border border-slate-750 text-slate-300 font-mono text-xs font-semibold shadow-xs">
                          {row.tahun}
                        </span>
                      </td>

                      {/* 4. Nopol */}
                      <td className="py-3 px-3 sm:px-4 text-center whitespace-nowrap">
                        <span className="inline-block bg-linear-to-b from-slate-950 to-slate-900 text-amber-300 border border-amber-500/40 px-3 py-1 rounded-md text-xs sm:text-sm font-mono font-bold tracking-wider shadow-inner">
                          {row.nopol}
                        </span>
                      </td>

                      {/* 5. Hari: Otomatis terisi jumlah hari dari saat motor masuk sampai hari ini */}
                      <td className="py-3 px-3 sm:px-4 text-center whitespace-nowrap bg-slate-900/30">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold font-mono tracking-tight shadow-xs whitespace-nowrap ${
                            isFresh
                              ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/40'
                              : isMedium
                              ? 'bg-amber-500/15 text-amber-300 border border-amber-500/40'
                              : 'bg-rose-500/15 text-rose-300 border border-rose-500/40'
                          }`}
                        >
                          <Clock className="w-3.5 h-3.5 opacity-80 shrink-0" />
                          <span>{row.hariDisplay}</span>
                        </span>
                      </td>

                      {/* 6. Status: LELANG jika sudah lebih dari 3 bulan (>90 hari), PARKIR jika dibawah itu */}
                      <td className="py-3 px-3 sm:px-4 text-center whitespace-nowrap bg-slate-900/30">
                        {row.status === 'LELANG' ? (
                          <span
                            id={`badge-status-${row.id}`}
                            title="Sudah lebih dari 3 bulan (> 90 hari): Status LELANG"
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black font-mono tracking-wider uppercase bg-rose-500/20 text-rose-300 border border-rose-500/50 shadow-sm shadow-rose-950/60 whitespace-nowrap"
                          >
                            <Flame className="w-3.5 h-3.5 text-rose-400 animate-pulse shrink-0" />
                            <span>LELANG</span>
                          </span>
                        ) : (
                          <span
                            id={`badge-status-${row.id}`}
                            title="Di bawah 3 bulan (≤ 90 hari): Status PARKIR"
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black font-mono tracking-wider uppercase bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 shadow-xs whitespace-nowrap"
                          >
                            <ParkingMeter className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span>PARKIR</span>
                          </span>
                        )}
                      </td>

                      {/* 7. DRU Admin Actions */}
                      {activeRole === 'dru' && (
                        <td className="py-3 px-3 sm:px-4 text-center whitespace-nowrap bg-slate-900/40 border-l border-slate-800">
                          <div className="flex items-center justify-center gap-1.5">
                            {onStartEditMotor && (
                              <button
                                type="button"
                                id={`btn-edit-motor-${row.id}`}
                                onClick={() => onStartEditMotor(row)}
                                className="p-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 transition cursor-pointer"
                                title={`Edit data ${row.motor}`}
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {onDeleteMotor && (
                              <button
                                type="button"
                                id={`btn-delete-motor-${row.id}`}
                                onClick={() => setItemToDelete(row)}
                                className="p-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 transition cursor-pointer"
                                title={`Hapus data ${row.motor}`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={activeRole === 'dru' ? 7 : 6} className="py-16 text-center text-slate-400">
                    {isLoading && data.length === 0 ? (
                      <div className="flex flex-col items-center justify-center gap-3 py-6">
                        <div className="w-8 h-8 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
                        <p className="font-bold text-slate-200 text-sm">Menghubungkan ke Database Real-Time...</p>
                        <p className="text-xs text-slate-400">Sedang menyinkronkan data unit motor...</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                          <ShieldAlert className="w-8 h-8" />
                        </div>
                        <p className="font-bold text-slate-200 text-base">Tidak ada data motor ditemukan</p>
                        <p className="text-xs text-slate-400 max-w-md">
                          {searchTerm
                            ? 'Coba sesuaikan kata kunci pencarian atau filter Anda.'
                            : 'Belum ada unit motor yang terdaftar.'}
                        </p>

                      </div>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Notification Toast */}
      {deleteNotice && (
        <div className="fixed bottom-6 right-6 z-90 p-4 rounded-xl bg-slate-900 border border-rose-500/50 text-rose-300 shadow-xl flex items-center gap-2.5 animate-in slide-in-from-bottom-2 text-xs font-semibold">
          <Trash2 className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{deleteNotice}</span>
        </div>
      )}

      {/* Delete Confirmation Modal for MotorTable */}
      {itemToDelete && (
        <div
          id="table-modal-confirm-delete"
          className="fixed inset-0 z-80 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-150"
        >
          <div className="bg-slate-900 border border-rose-500/50 rounded-2xl p-6 max-w-md w-full shadow-2xl text-slate-100 space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
              <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-100">Konfirmasi Hapus Motor</h3>
                <p className="text-[11px] text-slate-400">Data akan dihapus permanen dari Firestore & semua perangkat</p>
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
            </div>

            <p className="text-xs text-rose-300/90 leading-relaxed">
              Apakah Anda yakin ingin menghapus data motor ini? Data yang terhapus akan otomatis terhapus untuk semua perangkat yang membuka aplikasi ini.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                id="btn-confirm-table-delete"
                onClick={async () => {
                  if (!onDeleteMotor || !itemToDelete) return;
                  const targetId = itemToDelete.id;
                  const motorName = itemToDelete.motor;
                  setIsDeleting(true);
                  try {
                    await onDeleteMotor(targetId);
                    setItemToDelete(null);
                    setDeleteNotice(`Unit motor ${motorName} berhasil dihapus dari sistem.`);
                    setTimeout(() => setDeleteNotice(''), 4500);
                  } catch (err) {
                    console.error('Failed to delete motor from table:', err);
                    setDeleteNotice(`Gagal menghapus unit motor ${motorName}.`);
                    setTimeout(() => setDeleteNotice(''), 4500);
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-linear-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white shadow-lg shadow-rose-600/30 transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? 'Menghapus...' : 'Hapus Sekarang'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
