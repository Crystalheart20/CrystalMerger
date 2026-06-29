import React, { useState, useRef, useEffect } from "react";
import { 
  Camera, 
  X, 
  Check, 
  Sparkles, 
  RotateCw, 
  Sliders, 
  RefreshCw, 
  AlertCircle, 
  SlidersHorizontal,
  Info,
  CheckCircle2
} from "lucide-react";

interface DocumentScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveScan: (file: File, previewUrl: string) => void;
}

type ScanFilter = "none" | "grayscale" | "threshold" | "magic";

export function DocumentScanner({ isOpen, onClose, onSaveScan }: DocumentScannerProps) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraState, setCameraState] = useState<"inactive" | "active" | "error">("inactive");
  const [errorMsg, setErrorMsg] = useState("");
  
  const [scanStep, setScanStep] = useState<"camera" | "preview">("camera");
  const [capturedUrl, setCapturedUrl] = useState<string | null>(null);
  
  // Image adjustments
  const [filter, setFilter] = useState<ScanFilter>("threshold");
  const [rotation, setRotation] = useState<number>(0); // 0, 90, 180, 270
  const [fileName, setFileName] = useState("Scanned_Document");

  const videoRef = useRef<HTMLVideoElement>(null);
  const sourceCanvasRef = useRef<HTMLCanvasElement>(null);
  const targetCanvasRef = useRef<HTMLCanvasElement>(null);

  // Automatically start camera when scanner opens
  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
      resetState();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  // Re-apply filter and rotation when filter, rotation, or step changes
  useEffect(() => {
    if (scanStep === "preview" && sourceCanvasRef.current && targetCanvasRef.current) {
      applyFiltersAndRotation();
    }
  }, [scanStep, filter, rotation]);

  const resetState = () => {
    setScanStep("camera");
    setCapturedUrl(null);
    setFilter("threshold");
    setRotation(0);
    setFileName(`Scanned_${new Date().toLocaleDateString("en-US").replace(/\//g, "-")}_${Math.floor(100 + Math.random() * 900)}`);
  };

  const startCamera = async () => {
    setCameraState("inactive");
    setErrorMsg("");
    try {
      const constraints = {
        video: {
          facingMode: "environment",
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      };
      
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      setCameraState("active");
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      console.error("Camera access failed:", err);
      setCameraState("error");
      setErrorMsg(
        err.name === "NotAllowedError" 
          ? "Camera permission denied. Please grant camera permissions in your browser bar."
          : "Could not find or launch your camera stream. Verify webcam is plugged in."
      );
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setCameraState("inactive");
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    const sourceCanvas = sourceCanvasRef.current;
    if (!video || !sourceCanvas || cameraState !== "active") return;

    const ctx = sourceCanvas.getContext("2d");
    if (!ctx) return;

    // Capture at natural stream dimensions for pristine document resolution
    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;
    sourceCanvas.width = width;
    sourceCanvas.height = height;

    ctx.drawImage(video, 0, 0, width, height);
    
    // Create preview URL
    const dataUrl = sourceCanvas.toDataURL("image/jpeg");
    setCapturedUrl(dataUrl);
    setScanStep("preview");
    
    // Turn off camera stream to conserve battery/resources
    stopCamera();
  };

  const applyFiltersAndRotation = () => {
    const sourceCanvas = sourceCanvasRef.current;
    const targetCanvas = targetCanvasRef.current;
    if (!sourceCanvas || !targetCanvas) return;

    const ctx = targetCanvas.getContext("2d");
    if (!ctx) return;

    const sw = sourceCanvas.width;
    const sh = sourceCanvas.height;
    
    const isRotated90or270 = rotation === 90 || rotation === 270;
    targetCanvas.width = isRotated90or270 ? sh : sw;
    targetCanvas.height = isRotated90or270 ? sw : sh;

    // Reset transform, clear, and translate
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
    
    ctx.translate(targetCanvas.width / 2, targetCanvas.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.drawImage(sourceCanvas, -sw / 2, -sh / 2);

    // Apply Pixel manipulation filters for professional scan aesthetics
    if (filter !== "none") {
      ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset for pixel scanning
      const imgData = ctx.getImageData(0, 0, targetCanvas.width, targetCanvas.height);
      const data = imgData.data;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        if (filter === "grayscale") {
          const gray = 0.299 * r + 0.587 * g + 0.114 * b;
          data[i] = gray;
          data[i + 1] = gray;
          data[i + 2] = gray;
        } else if (filter === "threshold") {
          const gray = 0.299 * r + 0.587 * g + 0.114 * b;
          // Clean thresholding: Turn shadows into pure black and bright pages into pure white print output
          const value = gray > 125 ? 255 : 0;
          data[i] = value;
          data[i + 1] = value;
          data[i + 2] = value;
        } else if (filter === "magic") {
          // Boost contrast to make printed color diagrams look vibrant & remove muddy shadows
          const contrast = 35;
          const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
          
          const nr = Math.min(255, Math.max(0, factor * (r - 128) + 128));
          const ng = Math.min(255, Math.max(0, factor * (g - 128) + 128));
          const nb = Math.min(255, Math.max(0, factor * (b - 128) + 128));
          
          const gray = 0.299 * nr + 0.587 * ng + 0.114 * nb;
          if (gray > 185) {
            // Bright pages become pure white background
            data[i] = 255;
            data[i + 1] = 255;
            data[i + 2] = 255;
          } else {
            // Dark text/graphics become high contrast
            data[i] = Math.max(0, nr - 15);
            data[i + 1] = Math.max(0, ng - 15);
            data[i + 2] = Math.max(0, nb - 15);
          }
        }
      }
      ctx.putImageData(imgData, 0, 0);
    }
  };

  const handleSave = () => {
    const targetCanvas = targetCanvasRef.current;
    if (!targetCanvas) return;

    targetCanvas.toBlob((blob) => {
      if (!blob) return;
      
      const safeName = fileName.trim() ? `${fileName.replace(/\s+/g, "_")}.jpg` : "scanned_doc.jpg";
      const file = new File([blob], safeName, { type: "image/jpeg", lastModified: Date.now() });
      
      const previewUrl = targetCanvas.toDataURL("image/jpeg");
      onSaveScan(file, previewUrl);
      onClose();
    }, "image/jpeg", 0.95);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl h-[90vh] md:h-[80vh] flex flex-col overflow-hidden shadow-2xl border border-slate-200">
        
        {/* Header bar */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Interactive Document Camera Scanner</h3>
              <p className="text-xs text-slate-400">Scan physical paper documents and auto-align for clean PDF compiling</p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Work Area */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          
          {/* CAMERA RUNNING SCREEN */}
          {scanStep === "camera" && (
            <div className="flex-1 bg-slate-900 relative flex flex-col items-center justify-center p-4 overflow-hidden">
              {cameraState === "active" ? (
                <div className="relative max-h-full max-w-full aspect-[4/3] rounded-lg overflow-hidden border border-slate-800 shadow-2xl">
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Dynamic Laser scanner light bar (pure css styling) */}
                  <div className="absolute inset-x-0 h-1 bg-blue-500/80 shadow-[0_0_12px_4px_rgba(59,130,246,0.7)] top-0 animate-[scannerBar_3s_ease-in-out_infinite] pointer-events-none"></div>

                  {/* Document aspect viewfinder border overlay */}
                  <div className="absolute inset-8 border border-white/30 rounded-lg pointer-events-none flex flex-col justify-between p-4 shadow-[0_0_0_9999px_rgba(0,0,0,0.4)]">
                    <div className="flex justify-between">
                      <div className="w-6 h-6 border-t-4 border-l-4 border-blue-500"></div>
                      <div className="w-6 h-6 border-t-4 border-r-4 border-blue-500"></div>
                    </div>
                    <div className="self-center bg-slate-950/60 backdrop-blur-xs px-3 py-1 rounded-full border border-white/10 select-none text-[10px] text-white tracking-widest uppercase">
                      Position document in center
                    </div>
                    <div className="flex justify-between">
                      <div className="w-6 h-6 border-b-4 border-l-4 border-blue-500"></div>
                      <div className="w-6 h-6 border-b-4 border-r-4 border-blue-500"></div>
                    </div>
                  </div>
                </div>
              ) : cameraState === "inactive" ? (
                <div className="text-center text-slate-450 space-y-3">
                  <RefreshCw className="w-10 h-10 animate-spin text-blue-500 mx-auto" />
                  <p className="text-sm">Configuring camera stream parameters...</p>
                </div>
              ) : (
                <div className="max-w-md text-center p-6 bg-slate-950/60 border border-red-500/20 rounded-xl space-y-4">
                  <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
                  <div>
                    <h4 className="font-semibold text-slate-200 text-sm">Webcam Access Required</h4>
                    <p className="text-xs text-slate-400 mt-1">{errorMsg}</p>
                  </div>
                  <button
                    type="button"
                    onClick={startCamera}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-all"
                  >
                    Try Re-connecting Camera
                  </button>
                </div>
              )}

              {/* Floating Camera Actions bar */}
              {cameraState === "active" && (
                <div className="absolute bottom-6 inset-x-0 flex justify-center">
                  <button
                    type="button"
                    onClick={capturePhoto}
                    className="w-16 h-16 bg-white hover:bg-slate-100 rounded-full flex items-center justify-center shadow-lg border-4 border-blue-500 transition-all transform hover:scale-105 active:scale-95 cursor-pointer"
                    title="Capture scan image"
                  >
                    <div className="w-8 h-8 bg-blue-500 rounded-full animate-pulse"></div>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* EDIT PRESETS & SCANNER FILTERS VIEWER */}
          {scanStep === "preview" && (
            <>
              {/* Left Column: Adjusting controls & metadata naming */}
              <div className="w-full md:w-80 bg-slate-50 border-r border-slate-100 p-5 flex flex-col gap-5 overflow-y-auto shrink-0">
                
                {/* Filename prefix details */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Document Name</label>
                  <input
                    type="text"
                    value={fileName}
                    onChange={(e) => setFileName(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 outline-none focus:border-blue-500 bg-white"
                    placeholder="Document title..."
                  />
                </div>

                {/* Live scanner binarization & contrast filter cards */}
                <div className="space-y-3">
                  <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Scanner Presets</span>
                  
                  <div className="space-y-2">
                    {[
                      { key: "threshold", title: "B&W Document Scan", desc: "Pure high-contrast text layout, optimizes legibility for files." },
                      { key: "grayscale", title: "Pristine Grayscale", desc: "Removes colors and optimizes shadows into neat gray." },
                      { key: "magic", title: "Vivid Magic Color", desc: "Boosts color ink and flattens background shades to white." },
                      { key: "none", title: "Original Photograph", desc: "No filters applied. Keep original camera snapshots." }
                    ].map((preset) => (
                      <button
                        key={preset.key}
                        type="button"
                        onClick={() => setFilter(preset.key as ScanFilter)}
                        className={`w-full text-left p-3 rounded-xl border transition-all ${
                          filter === preset.key
                            ? "bg-blue-50 border-blue-200 ring-2 ring-blue-500/5"
                            : "bg-white hover:bg-slate-100/50 border-slate-200"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                            filter === preset.key ? "border-blue-500" : "border-slate-350"
                          }`}>
                            {filter === preset.key && <div className="w-2 h-2 bg-blue-500 rounded-full"></div>}
                          </div>
                          <span className="text-xs font-bold text-slate-800">{preset.title}</span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1 pl-5 font-normal leading-normal">{preset.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Extra rotation options */}
                <div className="space-y-2 pt-2 border-t border-slate-200/50">
                  <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Manual Alignment</span>
                  <button
                    type="button"
                    onClick={() => setRotation((prev) => (prev + 90) % 360)}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-white hover:bg-slate-100 border text-slate-700 rounded-lg text-xs font-semibold shadow-2xs transition-all cursor-pointer"
                  >
                    <RotateCw className="w-4 h-4 text-blue-500" />
                    <span>Rotate clockwise ({rotation}°)</span>
                  </button>
                </div>

                <div className="mt-auto pt-4 border-t border-slate-200/50 flex items-center gap-1.5 text-[10px] text-slate-400 leading-normal">
                  <Info className="w-4 h-4 text-blue-500 shrink-0" />
                  <span>These high-contrast filters are compiled natively, making text perfectly readable.</span>
                </div>
              </div>

              {/* Right Column: Visual filtered document board */}
              <div className="flex-1 bg-slate-900 flex flex-col items-center justify-center p-6 relative">
                
                {/* Simulated workspace canvas display area */}
                <div className="relative max-h-[85%] max-w-full overflow-auto flex items-center justify-center p-4">
                  <canvas 
                    ref={targetCanvasRef} 
                    className="max-h-96 md:max-h-[420px] max-w-full rounded shadow-2xl border border-slate-700/60 transition-transform duration-200 bg-white"
                  />
                  
                  {/* Overlay Scanner Badges */}
                  <div className="absolute top-2 left-2 bg-slate-950/80 backdrop-blur-xs border border-slate-800 rounded px-2.5 py-1 text-[9px] font-mono text-slate-300 uppercase tracking-wider">
                    Preset Applied: {filter === "threshold" ? "B&W Scan" : filter === "grayscale" ? "Grayscale" : filter === "magic" ? "Magic Color" : "Original"}
                  </div>
                </div>

                <p className="text-[10px] text-slate-400 mt-3 text-center">
                  Prerender output: 300 DPI high resolution document scan
                </p>

                {/* Retake Snapshot option */}
                <button
                  type="button"
                  onClick={() => {
                    setScanStep("camera");
                    startCamera();
                  }}
                  className="absolute bottom-4 left-6 px-3.5 py-1.5 bg-slate-950/50 hover:bg-slate-950/85 text-slate-300 border border-slate-850 rounded-lg text-xs font-medium transition-all"
                >
                  ← Retake Snapshot
                </button>
              </div>
            </>
          )}

        </div>

        {/* Hidden cache canvases */}
        <canvas ref={sourceCanvasRef} className="hidden" />

        {/* Bottom Actions footer bar */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end bg-slate-50 gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 transition-all hover:bg-slate-100 rounded-xl"
          >
            Cancel
          </button>
          
          {scanStep === "preview" && (
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Save & Add to Workspace Queue</span>
            </button>
          )}
        </div>

      </div>

      {/* Embedded style tag for animating document laser scanning beam */}
      <style>{`
        @keyframes scannerBar {
          0%, 100% { top: 4%; }
          50% { top: 94%; }
        }
      `}</style>
    </div>
  );
}
