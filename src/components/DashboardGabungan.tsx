import React, { useState, useMemo, useRef } from "react";
import {
  Search,
  ArrowUpDown,
  CalendarDays,
  Bike,
  DollarSign,
  TrendingUp,
  ParkingMeter,
  Calculator,
  Layers,
  FileSpreadsheet,
  Eye,
  CheckCircle2,
  Flame,
  Home,
  MoveHorizontal,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { MotorRecord, KepemilikanType } from "../types";
import { calculateElapsedDays, formatElapsedDays, formatRupiah } from "../data/initialData";

interface DashboardGabunganProps {
  data: MotorRecord[];
  isLoading?: boolean;
  onGoHome?: () => void;
}

type SortField =
  "tanggal" | "motor" | "nopol" | "nominal" | "hari" | "pemasukan" | "jasaParkirTotal" | "total";

type SortOrder = "asc" | "desc";

export default function DashboardGabungan({
  data,
  isLoading = false,
  onGoHome,
}: DashboardGabunganProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [kepemilikanFilter, setKepemilikanFilter] = useState<"all" | KepemilikanType>("all");
  const [sortField, setSortField] = useState<SortField>("tanggal");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  // Mouse Drag-to-Scroll State (both X and Y)
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);
  const [scrollLeftPos, setScrollLeftPos] = useState(0);
  const [scrollTopPos, setScrollTopPos] = useState(0);
  const hasDraggedRef = useRef(false);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // Hanya klik kiri
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (
      target.closest("button") ||
      target.closest("input") ||
      target.closest("select") ||
      target.closest("a")
    ) {
      return;
    }
    if (!tableContainerRef.current) return;
    setIsDragging(true);
    hasDraggedRef.current = false;
    setStartX(e.pageX - tableContainerRef.current.offsetLeft);
    setStartY(e.pageY - tableContainerRef.current.offsetTop);
    setScrollLeftPos(tableContainerRef.current.scrollLeft);
    setScrollTopPos(tableContainerRef.current.scrollTop);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !tableContainerRef.current) return;
    const x = e.pageX - tableContainerRef.current.offsetLeft;
    const y = e.pageY - tableContainerRef.current.offsetTop;
    const walkX = (x - startX) * 1.5;
    const walkY = (y - startY) * 1.5;
    if (Math.abs(x - startX) > 4 || Math.abs(y - startY) > 4) {
      hasDraggedRef.current = true;
    }
    tableContainerRef.current.scrollLeft = scrollLeftPos - walkX;
    tableContainerRef.current.scrollTop = scrollTopPos - walkY;
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  const scrollTableHorizontal = (direction: "left" | "right") => {
    if (!tableContainerRef.current) return;
    const scrollAmount = 350;
    tableContainerRef.current.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  const scrollTableVertical = (direction: "up" | "down") => {
    if (!tableContainerRef.current) return;
    const scrollAmount = 260;
    tableContainerRef.current.scrollBy({
      top: direction === "up" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  // Format and calculate rows for Dashboard Gabungan
  // Formula:
  // - hari: tanggal saat di-input sudah dianggap 1 hari bukan 0 (via calculateElapsedDays)
  // - jasa parkir: jumlah hari x jasa parkir yang tercantum pada motor
  // - total: nominal + jasa parkir - pemasukan
  const processedData = useMemo(() => {
    return data.map((item) => {
      const days = calculateElapsedDays(item.tanggal);
      const rateJasa = item.jasaParkir !== undefined ? item.jasaParkir : item.tarifJasa || 0;
      const totalJasaParkir = days * rateJasa;
      const nominalVal = Number(item.nominal) || 0;
      const pemasukanVal = Number(item.pemasukan) || 0;
      const totalVal = nominalVal + totalJasaParkir - pemasukanVal;
      const kepemilikanVal: KepemilikanType = item.kepemilikan || "pecel";

      return {
        ...item,
        daysCount: days,
        daysDisplay: formatElapsedDays(item.tanggal),
        rateJasa,
        totalJasaParkir,
        nominalVal,
        pemasukanVal,
        totalVal,
        kepemilikanVal,
      };
    });
  }, [data]);

  // Filter and sort data
  const filteredData = useMemo(() => {
    return processedData
      .filter((item) => {
        const q = searchTerm.toLowerCase();
        const matchSearch =
          item.motor.toLowerCase().includes(q) ||
          item.nopol.toLowerCase().includes(q) ||
          item.tanggal.toLowerCase().includes(q) ||
          item.daysDisplay.toLowerCase().includes(q) ||
          item.kepemilikanVal.toLowerCase().includes(q);

        const matchKepemilikan =
          kepemilikanFilter === "all" || item.kepemilikanVal === kepemilikanFilter;

        return matchSearch && matchKepemilikan;
      })
      .sort((a, b) => {
        let valA: number | string = 0;
        let valB: number | string = 0;

        switch (sortField) {
          case "tanggal":
            valA = a.tanggal;
            valB = b.tanggal;
            break;
          case "motor":
            valA = a.motor.toLowerCase();
            valB = b.motor.toLowerCase();
            break;
          case "nopol":
            valA = a.nopol.toLowerCase();
            valB = b.nopol.toLowerCase();
            break;
          case "nominal":
            valA = a.nominalVal;
            valB = b.nominalVal;
            break;
          case "hari":
            valA = a.daysCount;
            valB = b.daysCount;
            break;
          case "pemasukan":
            valA = a.pemasukanVal;
            valB = b.pemasukanVal;
            break;
          case "jasaParkirTotal":
            valA = a.totalJasaParkir;
            valB = b.totalJasaParkir;
            break;
          case "total":
            valA = a.totalVal;
            valB = b.totalVal;
            break;
        }

        if (typeof valA === "string" && typeof valB === "string") {
          return sortOrder === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        if (typeof valA === "number" && typeof valB === "number") {
          return sortOrder === "asc" ? valA - valB : valB - valA;
        }
        return 0;
      });
  }, [processedData, searchTerm, kepemilikanFilter, sortField, sortOrder]);

  // Overall Financial Totals
  const totals = useMemo(() => {
    return filteredData.reduce(
      (acc, item) => {
        acc.count += 1;
        acc.nominal += item.nominalVal;
        acc.pemasukan += item.pemasukanVal;
        acc.jasaParkir += item.totalJasaParkir;
        acc.total += item.totalVal;
        return acc;
      },
      { count: 0, nominal: 0, pemasukan: 0, jasaParkir: 0, total: 0 },
    );
  }, [filteredData]);

  const handleSort = (field: SortField) => {
    if (hasDraggedRef.current) {
      return;
    }
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const getKepemilikanBadge = (type: KepemilikanType) => {
    switch (type) {
      case "pecel":
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-teal-500/15 border border-teal-500/30 text-teal-300">
            PECEL
          </span>
        );
      case "mamah":
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-500/15 border border-purple-500/30 text-purple-300">
            MAMAH
          </span>
        );
      case "pribadi":
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/15 border border-amber-500/30 text-amber-300">
            PRIBADI
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div
      id="dashboard-gabungan-container"
      className="flex-1 min-h-0 flex flex-col w-full bg-slate-950 text-slate-100 overflow-hidden relative"
    >
      {/* Top Header / Bar */}
      <div
        id="gabungan-toolbar"
        className="shrink-0 w-full bg-linear-to-r from-slate-900 via-slate-925 to-slate-900 border-b border-amber-500/20 px-4 sm:px-8 py-3 flex flex-wrap items-center justify-between gap-3 shadow-md z-20"
      >
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-black text-amber-300 tracking-wide">
                DASHBOARD GABUNGAN
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1">
                <Eye className="w-3 h-3 text-amber-400" />
                <span>Mode Lihat Saja</span>
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Rekapitulasi terpadu unit Pecel, Mamah, dan Pribadi dengan perhitungan real-time.
            </p>
          </div>
        </div>

        {/* Filter Kepemilikan & Search */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Kepemilikan Filter */}
          <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-750 px-2.5 py-1.5 rounded-xl text-xs">
            <span className="text-slate-400 text-[11px]">Kepemilikan:</span>
            <select
              id="select-gabungan-kepemilikan"
              value={kepemilikanFilter}
              onChange={(e) => setKepemilikanFilter(e.target.value as "all" | KepemilikanType)}
              className="bg-slate-950 border border-amber-500/30 rounded-lg px-2 py-1 text-amber-300 text-xs focus:outline-none cursor-pointer"
            >
              <option value="all">Semua (Pecel, Mamah, Pribadi)</option>
              <option value="pecel">Pecel Saja</option>
              <option value="mamah">Mamah Saja</option>
              <option value="pribadi">Pribadi Saja</option>
            </select>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              id="search-input-gabungan"
              placeholder="Cari motor, nopol..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8.5 pr-3 py-1.5 text-xs bg-slate-900 border border-slate-750 focus:border-amber-400 rounded-xl text-slate-100 placeholder:text-slate-500 focus:outline-none w-44 sm:w-56"
            />
          </div>

          {/* Optional Kembali ke Halaman Utama */}
          {onGoHome && (
            <button
              type="button"
              id="btn-gabungan-home"
              onClick={onGoHome}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-750 text-xs font-semibold transition cursor-pointer active:scale-95 shadow-xs"
              title="Kembali ke Halaman Utama (Logout)"
            >
              <Home className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Halaman Utama</span>
            </button>
          )}
        </div>
      </div>

      {/* 5 Financial Summary Metric Cards */}
      <div
        id="gabungan-summary-metrics"
        className="shrink-0 w-full px-4 sm:px-8 py-3 bg-slate-950 border-b border-slate-800/80 grid grid-cols-2 sm:grid-cols-5 gap-2.5 sm:gap-3.5"
      >
        {/* 1. Total Unit */}
        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5">
            <Bike className="w-3.5 h-3.5 text-amber-400" />
            <span>Total Unit</span>
          </span>
          <div className="mt-1">
            <span className="text-lg sm:text-xl font-black font-mono text-slate-100">
              {totals.count}
            </span>
            <span className="text-xs text-slate-400 ml-1">Motor</span>
          </div>
        </div>

        {/* 2. Total Nominal */}
        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5">
            <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
            <span>Total Nominal</span>
          </span>
          <div className="mt-1">
            <span className="text-xs sm:text-sm font-black font-mono text-emerald-400 truncate block">
              {formatRupiah(totals.nominal)}
            </span>
          </div>
        </div>

        {/* 3. Total Pemasukan */}
        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-teal-400" />
            <span>Total Pemasukan</span>
          </span>
          <div className="mt-1">
            <span className="text-xs sm:text-sm font-black font-mono text-teal-300 truncate block">
              {formatRupiah(totals.pemasukan)}
            </span>
          </div>
        </div>

        {/* 4. Total Jasa Parkir (Hari x Tarif) */}
        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5">
            <ParkingMeter className="w-3.5 h-3.5 text-amber-400" />
            <span>Total Jasa Parkir</span>
          </span>
          <div className="mt-1">
            <span className="text-xs sm:text-sm font-black font-mono text-amber-300 truncate block">
              {formatRupiah(totals.jasaParkir)}
            </span>
            <span className="text-[9px] text-slate-400 block mt-0.5">Akumulasi (Hari × Jasa)</span>
          </div>
        </div>

        {/* 5. Grand Total (Nominal + Jasa Parkir - Pemasukan) */}
        <div className="col-span-2 sm:col-span-1 p-3 rounded-xl bg-linear-to-br from-amber-500/15 via-slate-900 to-slate-900 border border-amber-500/40 shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-bold text-amber-300 flex items-center gap-1.5">
            <Calculator className="w-3.5 h-3.5 text-amber-400" />
            <span>Grand Total</span>
          </span>
          <div className="mt-1">
            <span className="text-xs sm:text-sm font-black font-mono text-amber-200 truncate block">
              {formatRupiah(totals.total)}
            </span>
            <span className="text-[9px] text-amber-400/80 block mt-0.5">
              Nominal + Jasa - Masuk
            </span>
          </div>
        </div>
      </div>

      {/* Main Table View */}
      <div
        id="gabungan-table-wrapper"
        className="flex-1 min-h-0 flex flex-col bg-slate-950 px-3 sm:px-6 py-3 min-w-0"
      >
        {/* Navigation & Scroll Controls Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5 px-1 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-400 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 font-medium">
              <MoveHorizontal className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Tabel Dapat Di-scroll Ke Bawah & Ke Samping</span>
            </span>
            <span className="hidden md:inline text-[11px] text-slate-500">
              (Roda mouse, swipe layar sentuh, seret mouse, atau tombol navigasi)
            </span>
          </div>

          {/* Quick Scroll Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Scroll Vertical Buttons */}
            <div className="flex items-center gap-1 bg-slate-900/90 p-0.5 rounded-xl border border-slate-800 shadow-xs">
              <button
                type="button"
                id="btn-scroll-up-gabungan"
                onClick={() => scrollTableVertical("up")}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-slate-800 active:scale-95 text-slate-300 hover:text-amber-300 text-xs font-semibold transition cursor-pointer"
                title="Scroll tabel ke atas"
              >
                <ChevronUp className="w-3.5 h-3.5 text-amber-400" />
                <span>Ke Atas</span>
              </button>
              <button
                type="button"
                id="btn-scroll-down-gabungan"
                onClick={() => scrollTableVertical("down")}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-slate-800 active:scale-95 text-slate-300 hover:text-amber-300 text-xs font-semibold transition cursor-pointer"
                title="Scroll tabel ke bawah untuk melihat semua unit"
              >
                <ChevronDown className="w-3.5 h-3.5 text-amber-400" />
                <span>Ke Bawah</span>
              </button>
            </div>

            {/* Scroll Horizontal Buttons */}
            <div className="flex items-center gap-1 bg-slate-900/90 p-0.5 rounded-xl border border-slate-800 shadow-xs">
              <button
                type="button"
                id="btn-scroll-left-gabungan"
                onClick={() => scrollTableHorizontal("left")}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-slate-800 active:scale-95 text-slate-300 hover:text-amber-300 text-xs font-semibold transition cursor-pointer"
                title="Geser tabel ke kiri"
              >
                <ChevronLeft className="w-3.5 h-3.5 text-amber-400" />
                <span>Geser Kiri</span>
              </button>
              <button
                type="button"
                id="btn-scroll-right-gabungan"
                onClick={() => scrollTableHorizontal("right")}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-slate-800 active:scale-95 text-slate-300 hover:text-amber-300 text-xs font-semibold transition cursor-pointer"
                title="Geser tabel ke kanan untuk melihat Jasa Parkir & Total"
              >
                <span>Geser Kanan</span>
                <ChevronRight className="w-3.5 h-3.5 text-amber-400" />
              </button>
            </div>
          </div>
        </div>

        {/* Outer Card with border & shadow */}
        <div className="rounded-2xl border border-slate-800 shadow-xl bg-slate-950/80 overflow-hidden flex flex-col flex-1 min-h-0 min-w-0">
          {/* Scrollable & Draggable Viewport */}
          <div
            ref={tableContainerRef}
            id="gabungan-table-scroll"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
            className={`overflow-auto flex-1 min-h-[250px] w-full select-text custom-table-scrollbar overscroll-contain ${
              isDragging ? "cursor-grabbing select-none" : "cursor-grab"
            }`}
          >
            <table className="w-full text-xs text-left border-collapse min-w-[1200px]">
              <thead className="sticky top-0 bg-slate-900 text-amber-300 uppercase font-bold border-b border-slate-800 z-20 select-none shadow-sm">
                <tr>
                  {/* 1. Tanggal Masuk */}
                  <th
                    onClick={() => handleSort("tanggal")}
                    className="py-3.5 px-3.5 whitespace-nowrap cursor-pointer hover:text-amber-200 transition min-w-[130px]"
                  >
                    <div className="flex items-center gap-1.5">
                      <CalendarDays className="w-3.5 h-3.5 text-amber-400" />
                      <span>Tanggal Masuk</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-500" />
                    </div>
                  </th>

                  {/* 2. Jenis Motor */}
                  <th
                    onClick={() => handleSort("motor")}
                    className="py-3.5 px-3.5 whitespace-nowrap cursor-pointer hover:text-amber-200 transition min-w-[200px]"
                  >
                    <div className="flex items-center gap-1.5">
                      <Bike className="w-3.5 h-3.5 text-amber-400" />
                      <span>Jenis Motor</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-500" />
                    </div>
                  </th>

                  {/* 3. Plat Nomor */}
                  <th
                    onClick={() => handleSort("nopol")}
                    className="py-3.5 px-3.5 text-center whitespace-nowrap cursor-pointer hover:text-amber-200 transition min-w-[120px]"
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      <span>Plat Nomor</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-500" />
                    </div>
                  </th>

                  {/* Kepemilikan Tag */}
                  <th className="py-3.5 px-3 text-center whitespace-nowrap min-w-[100px]">
                    <span>Kepemilikan</span>
                  </th>

                  {/* 4. Nominal */}
                  <th
                    onClick={() => handleSort("nominal")}
                    className="py-3.5 px-3.5 text-right whitespace-nowrap cursor-pointer hover:text-amber-200 transition min-w-[130px]"
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Nominal</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-500" />
                    </div>
                  </th>

                  {/* 5. Hari (tanggal input = 1 hari) */}
                  <th
                    onClick={() => handleSort("hari")}
                    className="py-3.5 px-3.5 text-center whitespace-nowrap cursor-pointer hover:text-amber-200 transition min-w-[90px]"
                  >
                    <div
                      className="flex items-center justify-center gap-1.5"
                      title="Tanggal saat di-input sudah dianggap 1 hari bukan 0"
                    >
                      <span>Hari</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-500" />
                    </div>
                  </th>

                  {/* 6. Pemasukan */}
                  <th
                    onClick={() => handleSort("pemasukan")}
                    className="py-3.5 px-3.5 text-right whitespace-nowrap cursor-pointer hover:text-amber-200 transition min-w-[130px]"
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-teal-400" />
                      <span>Pemasukan</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-500" />
                    </div>
                  </th>

                  {/* 7. Jasa Parkir (jumlah hari x jasa parkir motor) */}
                  <th
                    onClick={() => handleSort("jasaParkirTotal")}
                    className="py-3.5 px-3.5 text-right whitespace-nowrap cursor-pointer hover:text-amber-200 transition min-w-[150px]"
                  >
                    <div
                      className="flex items-center justify-end gap-1.5"
                      title="Formula: Jumlah Hari x Jasa Parkir yang tercantum pada motor"
                    >
                      <ParkingMeter className="w-3.5 h-3.5 text-amber-400" />
                      <span>Jasa Parkir</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-500" />
                    </div>
                  </th>

                  {/* 8. Total (nominal + jasa parkir - pemasukan) */}
                  <th
                    onClick={() => handleSort("total")}
                    className="py-3.5 px-3.5 text-right whitespace-nowrap cursor-pointer hover:text-amber-200 transition min-w-[170px]"
                  >
                    <div
                      className="flex items-center justify-end gap-1.5"
                      title="Formula: Nominal + Jasa Parkir - Pemasukan"
                    >
                      <Calculator className="w-3.5 h-3.5 text-amber-400" />
                      <span>Total</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-500" />
                    </div>
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800/80">
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400 text-xs">
                      Memuat data dashboard gabungan...
                    </td>
                  </tr>
                ) : filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400 text-xs">
                      Tidak ada unit motor yang cocok dengan pencarian atau filter.
                    </td>
                  </tr>
                ) : (
                  filteredData.map((row) => {
                    return (
                      <tr key={row.id} className="hover:bg-slate-900/60 transition group text-xs">
                        {/* 1. Tanggal Masuk */}
                        <td className="py-3 px-3.5 font-mono text-slate-300 whitespace-nowrap">
                          {row.tanggal}
                        </td>

                        {/* 2. Jenis Motor */}
                        <td className="py-3 px-3.5 font-semibold text-slate-100 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span>{row.motor}</span>
                            {row.tahun && (
                              <span className="text-[10px] text-slate-400 font-mono">
                                ({row.tahun})
                              </span>
                            )}
                          </div>
                          {row.catatan && (
                            <div className="text-[10px] text-slate-400 mt-0.5 truncate max-w-xs">
                              {row.catatan}
                            </div>
                          )}
                        </td>

                        {/* 3. Plat Nomor */}
                        <td className="py-3 px-3.5 text-center font-mono font-bold text-amber-400 whitespace-nowrap">
                          {row.nopol}
                        </td>

                        {/* Kepemilikan */}
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          {getKepemilikanBadge(row.kepemilikanVal)}
                        </td>

                        {/* 4. Nominal */}
                        <td className="py-3 px-3.5 text-right font-mono font-bold text-emerald-400 whitespace-nowrap">
                          {formatRupiah(row.nominalVal)}
                        </td>

                        {/* 5. Hari (tanggal di-input = 1 hari) */}
                        <td className="py-3 px-3.5 text-center font-mono font-bold text-teal-300 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-md bg-teal-500/10 border border-teal-500/30">
                            {row.daysDisplay}
                          </span>
                        </td>

                        {/* 6. Pemasukan */}
                        <td className="py-3 px-3.5 text-right font-mono text-teal-300 whitespace-nowrap">
                          {row.pemasukanVal > 0 ? (
                            <span className="font-bold">{formatRupiah(row.pemasukanVal)}</span>
                          ) : (
                            <span className="text-slate-500">Rp 0</span>
                          )}
                        </td>

                        {/* 7. Jasa Parkir (jumlah hari x tarif per motor) */}
                        <td className="py-3 px-3.5 text-right font-mono whitespace-nowrap">
                          <div className="font-bold text-amber-300">
                            {formatRupiah(row.totalJasaParkir)}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {row.daysCount} hr × {formatRupiah(row.rateJasa)}
                          </div>
                        </td>

                        {/* 8. Total (nominal + jasa parkir - pemasukan) */}
                        <td className="py-3 px-3.5 text-right font-mono font-bold text-amber-200 whitespace-nowrap bg-amber-500/5">
                          <div className="text-sm font-black text-amber-300">
                            {formatRupiah(row.totalVal)}
                          </div>
                          <div className="text-[9px] text-slate-400 font-normal">
                            {formatRupiah(row.nominalVal)} + {formatRupiah(row.totalJasaParkir)} -{" "}
                            {formatRupiah(row.pemasukanVal)}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>

              {/* Sticky Table Footer with Summary Row */}
              {filteredData.length > 0 && (
                <tfoot className="sticky bottom-0 bg-slate-900 text-slate-100 font-bold border-t-2 border-amber-500/40 shadow-md z-20">
                  <tr>
                    <td
                      colSpan={4}
                      className="py-3 px-3.5 text-right uppercase text-amber-300 text-xs tracking-wider"
                    >
                      Total ({totals.count} Motor):
                    </td>
                    <td className="py-3 px-3.5 text-right font-mono text-emerald-400 font-bold whitespace-nowrap">
                      {formatRupiah(totals.nominal)}
                    </td>
                    <td className="py-3 px-3.5 text-center text-slate-400 text-[11px]">—</td>
                    <td className="py-3 px-3.5 text-right font-mono text-teal-300 font-bold whitespace-nowrap">
                      {formatRupiah(totals.pemasukan)}
                    </td>
                    <td className="py-3 px-3.5 text-right font-mono text-amber-300 font-bold whitespace-nowrap">
                      {formatRupiah(totals.jasaParkir)}
                    </td>
                    <td className="py-3 px-3.5 text-right font-mono text-amber-300 font-black text-sm whitespace-nowrap bg-amber-500/10">
                      {formatRupiah(totals.total)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
