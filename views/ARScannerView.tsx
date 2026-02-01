import React, { useRef, useEffect, useState } from 'react';
import { Camera, X, ScanLine, Zap, ChevronLeft, Target, Aperture, AlertTriangle, RefreshCw } from 'lucide-react';

interface ARScannerViewProps {
    onBack?: () => void;
    onAnalyze?: (file: File) => void;
}

interface BoundingBox {
    id: number;
    x: number;
    y: number;
    width: number;
    height: number;
    label: string;
    confidence: number;
    color: string;
}

const ARScannerView: React.FC<ARScannerViewProps> = ({ onBack, onAnalyze }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [scanning, setScanning] = useState(false);
  const [boundingBoxes, setBoundingBoxes] = useState<BoundingBox[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // Simulated potential diseases for the demo
  const possibleFindings = [
      { label: "Leaf Spot", color: "border-yellow-400" },
      { label: "Early Blight", color: "border-red-500" },
      { label: "Mosaic Virus", color: "border-orange-500" },
      { label: "Powdery Mildew", color: "border-white" }
  ];

  useEffect(() => {
    let stream: MediaStream | null = null;
    let detectionInterval: any;

    const startCamera = async () => {
      setError(null);
      setScanning(false);
      
      try {
        // Fallback strategy for camera access
        // 1. Try Environment (Rear) High Res
        // 2. Try Environment (Rear) Default
        // 3. Try Any Camera (Front/Webcam)
        const strategies = [
            { video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false },
            { video: { facingMode: 'environment' }, audio: false },
            { video: true, audio: false }
        ];

        let success = false;

        for (const constraints of strategies) {
            try {
                stream = await navigator.mediaDevices.getUserMedia(constraints as MediaStreamConstraints);
                success = true;
                console.log("Camera acquired with constraints:", constraints);
                break; // Stop if successful
            } catch (e) {
                console.warn("Camera strategy failed:", e);
                // Continue to next strategy
            }
        }

        if (!success || !stream) {
            throw new Error("ALL_STRATEGIES_FAILED");
        }

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          // Explicitly play to ensure mobile compatibility
          videoRef.current.onloadedmetadata = () => {
              videoRef.current?.play().catch(e => console.error("Play failed", e));
          };
        }
        
        setScanning(true);
        startDetectionLoop();

      } catch (err: any) {
        console.error("Camera access denied/failed", err);
        
        let msg = "Could not access camera.";
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
            msg = "Camera permission denied. Please allow access in your browser settings.";
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
            msg = "No camera found on this device.";
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
            msg = "Camera is currently in use by another application.";
        } else if (err.message === "ALL_STRATEGIES_FAILED") {
            msg = "Failed to start video source. Please ensure your camera is not being used by another app.";
        }
        
        setError(msg);
      }
    };

    const startDetectionLoop = () => {
        // Simulated Computer Vision Detection Loop
        detectionInterval = setInterval(() => {
            if (Math.random() > 0.4) {
                // Generate 1 or 2 bounding boxes
                const count = Math.random() > 0.7 ? 2 : 1;
                const newBoxes: BoundingBox[] = [];
                
                for (let i = 0; i < count; i++) {
                    const finding = possibleFindings[Math.floor(Math.random() * possibleFindings.length)];
                    newBoxes.push({
                        id: Date.now() + i,
                        x: 20 + Math.random() * 50, // Keep mostly central
                        y: 30 + Math.random() * 30,
                        width: 20 + Math.random() * 15,
                        height: 15 + Math.random() * 15,
                        label: finding.label,
                        confidence: 85 + Math.random() * 14, // 85-99%
                        color: finding.color
                    });
                }
                setBoundingBoxes(newBoxes);
            } else {
                // Occasionally clear boxes to simulate tracking loss/movement
                if (Math.random() > 0.7) setBoundingBoxes([]);
            }
        }, 1200);
    };

    startCamera();

    return () => {
        if (stream) stream.getTracks().forEach(t => t.stop());
        if (detectionInterval) clearInterval(detectionInterval);
    };
  }, []);

  const handleBack = () => {
      if (onBack) onBack();
      else window.location.reload();
  };

  const handleCapture = () => {
      if (videoRef.current && onAnalyze) {
          const canvas = document.createElement('canvas');
          canvas.width = videoRef.current.videoWidth;
          canvas.height = videoRef.current.videoHeight;
          const ctx = canvas.getContext('2d');
          
          if (ctx) {
              // 1. Draw Video Frame
              ctx.drawImage(videoRef.current, 0, 0);
              
              // 2. Convert to File
              canvas.toBlob((blob) => {
                  if (blob) {
                      const file = new File([blob], "ar_snapshot.jpg", { type: "image/jpeg" });
                      onAnalyze(file);
                  }
              }, 'image/jpeg', 0.95);
          }
      }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black overflow-hidden font-mono">
      {/* Video Feed */}
      {!error && <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />}
      
      {/* Error Overlay */}
      {error && (
          <div className="absolute inset-0 z-[60] bg-slate-900 flex flex-col items-center justify-center p-6 text-center animate-fade-in">
              <div className="bg-red-500/10 p-4 rounded-full mb-6 animate-pulse">
                  <AlertTriangle className="w-12 h-12 text-red-500" />
              </div>
              <h3 className="text-white text-xl font-bold mb-3">Camera Access Failed</h3>
              <p className="text-slate-300 mb-8 max-w-xs leading-relaxed">{error}</p>
              
              <div className="flex flex-col gap-3 w-full max-w-xs">
                  <button 
                      onClick={() => window.location.reload()}
                      className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-emerald-500 transition-colors flex items-center justify-center gap-2"
                  >
                      <RefreshCw className="w-4 h-4" /> Retry
                  </button>
                  <button 
                      onClick={handleBack}
                      className="bg-slate-800 text-slate-300 px-6 py-3 rounded-xl font-bold hover:bg-slate-700 transition-colors"
                  >
                      Go Back
                  </button>
              </div>
          </div>
      )}

      {/* AR Overlay Layer (Only show if no error) */}
      {!error && (
        <>
            <div className="absolute inset-0 pointer-events-none">
                {/* Scanning Grid Background */}
                <div className="absolute inset-0 bg-[url('https://upload.wikimedia.org/wikipedia/commons/1/1a/1x1_grid_graph_paper.png')] opacity-[0.07]"></div>
                
                {/* Corner HUD Elements */}
                <div className="absolute top-8 left-8 w-12 h-12 border-l-2 border-t-2 border-emerald-500/60 rounded-tl-lg"></div>
                <div className="absolute top-8 right-8 w-12 h-12 border-r-2 border-t-2 border-emerald-500/60 rounded-tr-lg"></div>
                <div className="absolute bottom-8 left-8 w-12 h-12 border-l-2 border-b-2 border-emerald-500/60 rounded-bl-lg"></div>
                <div className="absolute bottom-8 right-8 w-12 h-12 border-r-2 border-b-2 border-emerald-500/60 rounded-br-lg"></div>
                
                {/* Scanning Line Animation */}
                {scanning && (
                    <div className="absolute top-0 left-0 w-full h-0.5 bg-emerald-400/40 shadow-[0_0_20px_rgba(52,211,153,0.6)] animate-[scan_3s_linear_infinite]"></div>
                )}

                {/* Dynamic Bounding Boxes */}
                {boundingBoxes.map(box => (
                    <div 
                        key={box.id}
                        className={`absolute transition-all duration-300 ease-out border-2 ${box.color} shadow-[0_0_10px_rgba(0,0,0,0.3)] bg-white/5 backdrop-blur-[1px]`}
                        style={{
                            left: `${box.x}%`,
                            top: `${box.y}%`,
                            width: `${box.width}%`,
                            height: `${box.height}%`,
                            opacity: 0.9
                        }}
                    >
                        {/* Label Tag */}
                        <div className={`absolute -top-6 left-0 ${box.color.replace('border-', 'bg-')} text-black text-[10px] font-bold px-1.5 py-0.5 uppercase tracking-wide flex items-center gap-1`}>
                            <Target className="w-3 h-3" />
                            {box.label}
                        </div>
                        
                        {/* Confidence Tag */}
                        <div className="absolute -bottom-6 right-0 bg-black/60 text-white text-[10px] px-1.5 py-0.5 backdrop-blur-md border border-white/10">
                            {box.confidence.toFixed(1)}% MATCH
                        </div>
                        
                        {/* Corner Accents */}
                        <div className={`absolute -top-1 -left-1 w-2 h-2 border-t-2 border-l-2 ${box.color}`}></div>
                        <div className={`absolute -top-1 -right-1 w-2 h-2 border-t-2 border-r-2 ${box.color}`}></div>
                        <div className={`absolute -bottom-1 -left-1 w-2 h-2 border-b-2 border-l-2 ${box.color}`}></div>
                        <div className={`absolute -bottom-1 -right-1 w-2 h-2 border-b-2 border-r-2 ${box.color}`}></div>
                    </div>
                ))}
            </div>

            {/* UI Controls Layer */}
            <div className="absolute inset-0 flex flex-col justify-between p-6 z-10 pointer-events-none">
                {/* Top Bar */}
                <div className="flex justify-between items-start pointer-events-auto">
                    <div className="flex flex-col gap-1">
                        <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded text-emerald-400 text-xs border border-emerald-500/30 flex items-center gap-2 w-fit">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                            GEMINI VISION: {boundingBoxes.length > 0 ? 'DETECTED' : 'SCANNING'}
                        </div>
                        {boundingBoxes.length > 0 && (
                            <div className="bg-red-500/80 backdrop-blur-md px-3 py-1 rounded text-white text-[10px] font-bold tracking-wider animate-pulse w-fit">
                                PATHOGEN FOUND
                            </div>
                        )}
                    </div>
                    
                    <button onClick={handleBack} className="p-2 bg-black/40 rounded-full backdrop-blur hover:bg-black/60 transition-colors border border-white/10">
                    <ChevronLeft className="w-6 h-6 text-white" />
                    </button>
                </div>

                {/* Bottom Controls */}
                <div className="w-full text-center pb-8 pointer-events-auto">
                    <div className="flex flex-col items-center gap-4">
                        <p className="text-white/90 text-sm font-medium drop-shadow-md bg-black/20 backdrop-blur-sm px-4 py-1 rounded-full">
                            {boundingBoxes.length > 0 
                                ? "Hold steady to capture details" 
                                : "Point camera at affected plant area"}
                        </p>
                        
                        <button 
                            onClick={handleCapture}
                            className="group relative flex items-center justify-center"
                        >
                            {/* Outer Ring */}
                            <div className={`w-20 h-20 rounded-full border-4 transition-all duration-300 ${boundingBoxes.length > 0 ? 'border-red-500 scale-110' : 'border-white/80'}`}></div>
                            
                            {/* Inner Circle (Shutter) */}
                            <div className={`absolute w-16 h-16 rounded-full transition-all duration-200 ${boundingBoxes.length > 0 ? 'bg-red-500' : 'bg-white'} group-active:scale-90`}></div>
                            
                            {/* Icon */}
                            <Aperture className={`absolute w-8 h-8 ${boundingBoxes.length > 0 ? 'text-white' : 'text-slate-900'} animate-spin-slow`} />
                        </button>
                        
                        <span className="text-white/60 text-xs tracking-widest uppercase font-bold mt-2">
                            Freeze & Analyze
                        </span>
                    </div>
                </div>
            </div>
        </>
      )}
      
      <style>{`
        @keyframes scan {
            0% { top: 0%; opacity: 0; }
            10% { opacity: 1; }
            90% { opacity: 1; }
            100% { top: 100%; opacity: 0; }
        }
        .animate-spin-slow {
            animation: spin 8s linear infinite;
        }
        @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default ARScannerView;