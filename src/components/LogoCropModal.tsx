import React, { useState, useEffect, useRef } from 'react';
import { Crop, ZoomIn, ZoomOut, RotateCw, Move, Check, X, Sparkles, RefreshCw, Eye, ArrowLeft } from 'lucide-react';

interface LogoCropModalProps {
  isOpen: boolean;
  imageSrc: string;
  onClose: () => void;
  onSaveCropped: (croppedDataUrl: string) => void;
}

const PREVIEW_SIZE = 240; // Size of the interactive crop box in pixels
const EXPORT_SIZE = 240; // 240x240 px optimal for crisp, lightweight real-time header sync

export default function LogoCropModal({
  isOpen,
  imageSrc,
  onClose,
  onSaveCropped
}: LogoCropModalProps) {
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [rotation, setRotation] = useState<number>(0);
  const [imgNaturalSize, setImgNaturalSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [currentPanAtDragStart, setCurrentPanAtDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [bgChoice, setBgChoice] = useState<'transparent' | 'dark' | 'white'>('transparent');
  const [previewDataUrl, setPreviewDataUrl] = useState<string>('');

  const imgRef = useRef<HTMLImageElement | null>(null);

  // Initialize or reset when a new image is loaded
  useEffect(() => {
    if (!imageSrc || !isOpen) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const naturalW = img.naturalWidth || img.width;
      const naturalH = img.naturalHeight || img.height;
      setImgNaturalSize({ width: naturalW, height: naturalH });

      // Calculate initial zoom so image fits well with padding in 240px container
      const maxDim = Math.max(naturalW, naturalH);
      const initialZoom = maxDim > 0 ? (PREVIEW_SIZE * 0.85) / maxDim : 1;
      setZoom(initialZoom);
      setPan({ x: 0, y: 0 });
      setRotation(0);
    };
    img.src = imageSrc;
  }, [imageSrc, isOpen]);

  // Generate live mini-preview whenever zoom/pan/rotation/bg changes
  useEffect(() => {
    if (!imgNaturalSize.width || !imageSrc || !isOpen) return;

    const timer = setTimeout(() => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 112;
        canvas.height = 112;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        if (bgChoice === 'dark') {
          ctx.fillStyle = '#020617';
          ctx.fillRect(0, 0, 112, 112);
        } else if (bgChoice === 'white') {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, 112, 112);
        }

        const scaleRatio = 112 / PREVIEW_SIZE;
        ctx.save();
        ctx.translate(56 + pan.x * scaleRatio, 56 + pan.y * scaleRatio);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.scale(zoom * scaleRatio, zoom * scaleRatio);

        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
          ctx.restore();
          setPreviewDataUrl(canvas.toDataURL('image/png'));
        };
        img.src = imageSrc;
      } catch (err) {
        console.error('Error generating preview', err);
      }
    }, 50);

    return () => clearTimeout(timer);
  }, [zoom, pan, rotation, bgChoice, imgNaturalSize, imageSrc, isOpen]);

  if (!isOpen) return null;

  // Preset Handlers
  const handleFitContain = () => {
    if (!imgNaturalSize.width) return;
    const maxDim = Math.max(imgNaturalSize.width, imgNaturalSize.height);
    setZoom((PREVIEW_SIZE * 0.85) / maxDim);
    setPan({ x: 0, y: 0 });
  };

  const handleFitCover = () => {
    if (!imgNaturalSize.width) return;
    const minDim = Math.min(imgNaturalSize.width, imgNaturalSize.height);
    setZoom(PREVIEW_SIZE / minDim);
    setPan({ x: 0, y: 0 });
  };

  const handleRotate90 = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  // Mouse drag handlers for panning
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setCurrentPanAtDragStart(pan);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;
    setPan({
      x: Math.round(currentPanAtDragStart.x + deltaX),
      y: Math.round(currentPanAtDragStart.y + deltaY)
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch drag handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
      setCurrentPanAtDragStart(pan);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    const deltaX = e.touches[0].clientX - dragStart.x;
    const deltaY = e.touches[0].clientY - dragStart.y;
    setPan({
      x: Math.round(currentPanAtDragStart.x + deltaX),
      y: Math.round(currentPanAtDragStart.y + deltaY)
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Export high-resolution cropped 1:1 image
  const handleSave = () => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = EXPORT_SIZE;
      canvas.height = EXPORT_SIZE;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Fill background if chosen
      if (bgChoice === 'dark') {
        ctx.fillStyle = '#020617';
        ctx.fillRect(0, 0, EXPORT_SIZE, EXPORT_SIZE);
      } else if (bgChoice === 'white') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, EXPORT_SIZE, EXPORT_SIZE);
      }

      const scaleRatio = EXPORT_SIZE / PREVIEW_SIZE;
      ctx.save();
      ctx.translate(EXPORT_SIZE / 2 + pan.x * scaleRatio, EXPORT_SIZE / 2 + pan.y * scaleRatio);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(zoom * scaleRatio, zoom * scaleRatio);

      const img = new Image();
      if (imageSrc.startsWith('http://') || imageSrc.startsWith('https://')) {
        img.crossOrigin = 'anonymous';
      }
      img.onload = () => {
        ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
        ctx.restore();
        const croppedData = canvas.toDataURL('image/png');
        onSaveCropped(croppedData);
        onClose();
      };
      img.onerror = () => {
        onSaveCropped(imageSrc);
        onClose();
      };
      img.src = imageSrc;
    } catch (err) {
      console.error('Failed to crop image', err);
      // Fallback
      onSaveCropped(imageSrc);
      onClose();
    }
  };

  return (
    <div 
      id="modal-logo-cropper" 
      className="fixed inset-0 z-70 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      <div 
        className="bg-slate-900 border border-amber-500/40 rounded-3xl p-5 sm:p-6 max-w-xl w-full shadow-2xl text-slate-100 space-y-5 animate-in fade-in zoom-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
              <Crop className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-slate-100 flex items-center gap-1.5">
                <span>Sesuaikan & Crop Ukuran Logo</span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Geser dan sesuaikan zoom agar logo pas dan presisi pada kotak header halaman utama.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main Crop Area + Live Header Preview */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
          {/* Left: Interactive 1:1 Crop Box */}
          <div className="md:col-span-7 flex flex-col items-center justify-center">
            <div className="text-[11px] text-slate-400 mb-2 font-medium flex items-center gap-1.5">
              <Move className="w-3.5 h-3.5 text-amber-400" />
              <span>Klik & Tarik / Drag untuk menggeser posisi logo:</span>
            </div>

            <div
              id="crop-viewport"
              style={{ width: PREVIEW_SIZE, height: PREVIEW_SIZE }}
              className={`relative rounded-2xl border-2 border-amber-400/70 overflow-hidden shadow-2xl cursor-grab active:cursor-grabbing select-none flex items-center justify-center transition-colors ${
                bgChoice === 'dark' ? 'bg-slate-950' : bgChoice === 'white' ? 'bg-white' : 'bg-radial from-slate-800 to-slate-950'
              }`}
              onMouseDown={handleMouseDown}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              {/* Image with dynamic transform */}
              <img
                ref={imgRef}
                src={imageSrc}
                alt="Source Crop"
                draggable={false}
                style={{
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom}) rotate(${rotation}deg)`,
                  transformOrigin: 'center center',
                  maxWidth: 'none',
                  maxHeight: 'none',
                  pointerEvents: 'none'
                }}
                className="select-none transition-transform duration-75 ease-out"
              />

              {/* Square grid guideline overlay */}
              <div className="absolute inset-0 pointer-events-none border border-amber-400/20 grid grid-cols-3 grid-rows-3">
                <div className="border-r border-b border-amber-400/15" />
                <div className="border-r border-b border-amber-400/15" />
                <div className="border-b border-amber-400/15" />
                <div className="border-r border-b border-amber-400/15" />
                <div className="border-r border-b border-amber-400/15" />
                <div className="border-b border-amber-400/15" />
                <div className="border-r border-amber-400/15" />
                <div className="border-r border-amber-400/15" />
                <div />
              </div>

              {/* Corner indicators */}
              <div className="absolute top-1 left-1 w-3 h-3 border-t-2 border-l-2 border-amber-400 pointer-events-none" />
              <div className="absolute top-1 right-1 w-3 h-3 border-t-2 border-r-2 border-amber-400 pointer-events-none" />
              <div className="absolute bottom-1 left-1 w-3 h-3 border-b-2 border-l-2 border-amber-400 pointer-events-none" />
              <div className="absolute bottom-1 right-1 w-3 h-3 border-b-2 border-r-2 border-amber-400 pointer-events-none" />
            </div>

            {/* Quick action buttons */}
            <div className="flex items-center gap-2 mt-3 flex-wrap justify-center">
              <button
                type="button"
                onClick={handleFitContain}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-750 text-slate-300 text-[11px] rounded-lg font-medium border border-slate-700 transition cursor-pointer"
                title="Sesuaikan agar seluruh logo tampak"
              >
                Pas Kotak (Fit)
              </button>
              <button
                type="button"
                onClick={handleFitCover}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-750 text-slate-300 text-[11px] rounded-lg font-medium border border-slate-700 transition cursor-pointer"
                title="Penuhi seluruh kotak logo"
              >
                Penuh (Cover)
              </button>
              <button
                type="button"
                onClick={handleRotate90}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-750 text-amber-300 text-[11px] rounded-lg font-medium border border-slate-700 flex items-center gap-1 transition cursor-pointer"
                title="Putar gambar 90 derajat"
              >
                <RotateCw className="w-3 h-3" />
                <span>Putar 90°</span>
              </button>
              <button
                type="button"
                onClick={() => setPan({ x: 0, y: 0 })}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-slate-200 text-[11px] rounded-lg font-medium border border-slate-700 flex items-center gap-1 transition cursor-pointer"
                title="Pusatkan posisi kembali ke tengah"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Tengah</span>
              </button>
            </div>
          </div>

          {/* Right: Live Header Simulation Preview */}
          <div className="md:col-span-5 bg-slate-950/90 rounded-2xl p-4 border border-slate-800 flex flex-col justify-between space-y-4">
            <div>
              <span className="text-[11px] text-amber-400 font-bold uppercase tracking-wider flex items-center gap-1.5 mb-2">
                <Eye className="w-3.5 h-3.5" />
                <span>Simulasi Tampilan Header:</span>
              </span>

              {/* Exact replica of the main page Header Logo container */}
              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 flex items-center gap-3">
                <div className="relative flex items-center justify-center h-12 w-12 sm:h-14 sm:w-14 rounded-xl bg-radial from-slate-800 to-slate-950 border border-amber-400/50 overflow-hidden shadow-md flex-shrink-0">
                  {previewDataUrl ? (
                    <img
                      src={previewDataUrl}
                      alt="Mini Preview"
                      className="h-full w-full object-contain p-1"
                    />
                  ) : (
                    <img
                      src={imageSrc}
                      alt="Mini Preview"
                      className="h-full w-full object-contain p-1"
                    />
                  )}
                </div>

                <div className="flex flex-col">
                  <span className="text-sm sm:text-base font-black tracking-widest text-transparent bg-clip-text bg-linear-to-r from-amber-200 via-amber-400 to-amber-100 uppercase">
                    MOTORKU
                  </span>
                  <span className="text-[9px] tracking-widest uppercase text-amber-300 font-semibold">
                    PREMIUM SUITE
                  </span>
                </div>
              </div>
            </div>

            {/* Background selection */}
            <div className="space-y-1.5">
              <span className="text-[11px] text-slate-400 block font-medium">Latar Belakang Logo:</span>
              <div className="grid grid-cols-3 gap-1.5 text-[10px]">
                <button
                  type="button"
                  onClick={() => setBgChoice('transparent')}
                  className={`py-1.5 px-2 rounded-lg font-semibold border text-center transition cursor-pointer ${
                    bgChoice === 'transparent'
                      ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  Asli / Transparan
                </button>
                <button
                  type="button"
                  onClick={() => setBgChoice('dark')}
                  className={`py-1.5 px-2 rounded-lg font-semibold border text-center transition cursor-pointer ${
                    bgChoice === 'dark'
                      ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  Hitam Mewah
                </button>
                <button
                  type="button"
                  onClick={() => setBgChoice('white')}
                  className={`py-1.5 px-2 rounded-lg font-semibold border text-center transition cursor-pointer ${
                    bgChoice === 'white'
                      ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  Putih Bersih
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Sliders: Zoom and Precision Position */}
        <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 space-y-3">
          {/* Zoom Slider */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span className="flex items-center gap-1.5 font-semibold">
                <ZoomIn className="w-3.5 h-3.5 text-amber-400" />
                <span>Perbesar / Perkecil (Zoom):</span>
              </span>
              <span className="font-mono text-amber-400 font-bold">{Math.round(zoom * 100)}%</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setZoom((prev) => Math.max(0.1, Number((prev - 0.1).toFixed(2))))}
                className="p-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white transition cursor-pointer"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <input
                type="range"
                min="0.1"
                max="3"
                step="0.02"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="flex-1 accent-amber-400 cursor-pointer"
              />
              <button
                type="button"
                onClick={() => setZoom((prev) => Math.min(3, Number((prev + 0.1).toFixed(2))))}
                className="p-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white transition cursor-pointer"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Position X & Y fine-tuning */}
          <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-800/80 text-[11px]">
            <div>
              <div className="flex justify-between text-slate-400 mb-1">
                <span>Posisi Horizontal (X):</span>
                <span className="font-mono text-amber-300">{pan.x}px</span>
              </div>
              <input
                type="range"
                min="-150"
                max="150"
                value={pan.x}
                onChange={(e) => setPan((p) => ({ ...p, x: parseInt(e.target.value) }))}
                className="w-full accent-amber-400 cursor-pointer"
              />
            </div>
            <div>
              <div className="flex justify-between text-slate-400 mb-1">
                <span>Posisi Vertikal (Y):</span>
                <span className="font-mono text-amber-300">{pan.y}px</span>
              </div>
              <input
                type="range"
                min="-150"
                max="150"
                value={pan.y}
                onChange={(e) => setPan((p) => ({ ...p, y: parseInt(e.target.value) }))}
                className="w-full accent-amber-400 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-amber-400" />
            <span>Kembali ke Halaman Sebelumnya</span>
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-6 py-2.5 rounded-xl bg-linear-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 active:scale-95 transition cursor-pointer flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>Simpan & Terapkan Logo</span>
          </button>
        </div>
      </div>
    </div>
  );
}
