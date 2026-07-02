import React, { useState, useEffect, useRef } from "react";
import { 
  Camera, 
  UserCheck, 
  UserPlus, 
  Trash2, 
  RefreshCw, 
  Scan, 
  Activity, 
  Sparkles, 
  ShieldCheck, 
  ShieldAlert, 
  HelpCircle, 
  Info,
  Terminal,
  Clock,
  Eye,
  Database,
  Upload,
  UserX,
  AlertTriangle
} from "lucide-react";

// Types corresponding to backend/Gemini payloads
interface LandmarkPoint {
  x: number;
  y: number;
}

interface BoundingBox {
  xMin: number;
  yMin: number;
  width: number;
  height: number;
}

interface Landmarks {
  leftEye: LandmarkPoint;
  rightEye: LandmarkPoint;
  noseTip: LandmarkPoint;
  mouthLeft: LandmarkPoint;
  mouthRight: LandmarkPoint;
  chinTip: LandmarkPoint;
  faceOutline: LandmarkPoint[];
}

interface Biometrics {
  estimatedAge: string;
  estimatedGender: string;
  emotion: string;
  glassesDetected: boolean;
  facialHair: string;
  symmetryScore: number;
  boundingBox: BoundingBox;
  landmarks: Landmarks;
  technicalReport: {
    focusQuality: string;
    lightingConditions: string;
    headPose: string;
  };
}


interface GeminiAnalysisResult {
  matchedId: string | null;
  matchedName: string | null;
  matchConfidence: number;
  matchReason: string;
  biometrics: Biometrics;
}

interface EnrolledUser {
  id: string;
  name: string;
  role: string;
  photoData: string;
  enrolledAt: string;
}

export default function App() {
  // Database State
  const [enrolledUsers, setEnrolledUsers] = useState<EnrolledUser[]>([]);
  const [isLoadingDB, setIsLoadingDB] = useState(false);

  // Active Scan/Capture State
  const [streamActive, setStreamActive] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<GeminiAnalysisResult | null>(null);

  // Enrollment Form State
  const [enrollName, setEnrollName] = useState("");
  const [enrollRole, setEnrollRole] = useState("Employee");
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [enrollMessage, setEnrollMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Clock state for high-tech aesthetic
  const [currentTime, setCurrentTime] = useState("");

  // Refs for WebRTC Video
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Update clock
  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      setCurrentTime(d.toISOString().replace("T", "  ").substring(0, 19) + " UTC");
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  
  // Fetch enrolled database on load
  const fetchEnrolledList = async () => {
    setIsLoadingDB(true);
    try {
      const res = await fetch("/api/enrolled");
      const json = await res.json();
      if (json.success) {
        setEnrolledUsers(json.data);
      }
    } catch (e) {
      console.error("Failed to load enrolled identity profiles:", e);
    } finally {
      setIsLoadingDB(false);
    }
  };

  useEffect(() => {
    fetchEnrolledList();
  }, []);

  // Start Camera Feed
  const startCamera = async () => {
    setStreamError(null);
    setCapturedPhoto(null);
    try {
      const constraints = {
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user"
        }
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      mediaStreamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setStreamActive(true);
    } catch (err: any) {
      console.error("Camera access denied or unavailable:", err);
      setStreamError("Camera device block: Permission declined or hardware in use. Please use manual photo upload option.");
      setStreamActive(false);
    }
  };

   // Stop Camera Feed
  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setStreamActive(false);
  };
  
 // Capture Frame from Video
  const captureFrameAndScan = async () => {
    if (!videoRef.current) return;
    
    setIsScanning(true);
    setStreamError(null);
    setAnalysisResult(null);

    try {
      const video = videoRef.current;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      
      if (!ctx) {
        throw new Error("Unable to create canvas rendering context.");
      }

      // Mirror capture if standard selfie orientation
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
      setCapturedPhoto(dataUrl);

      // Stop camera once verified target is captured to show analysis output cleanly
      stopCamera();
      
      // Perform Verification API Call
      await triggerVerification(dataUrl);
    } catch (err: any) {
      setStreamError(`Capture failure: ${err.message}`);
      setIsScanning(false);
    }
  };

  // Trigger base64 verification to backend (which calls Gemini API)
  const triggerVerification = async (photoBase64: string) => {
    setIsScanning(true);
    setStreamError(null);
    try {
      const response = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photo: photoBase64 }),
      });
      const resData = await response.json();
      if (resData.success) {
        setAnalysisResult(resData.data);
      } else {
        setStreamError(resData.error || "Neural model returned zero valid biometric predictions.");
      }
    } catch (err: any) {
      setStreamError(`API handshake failed: ${err.message}`);
    } finally {
      setIsScanning(false);
    }
  };
  
   // Manual File Upload handler for easy local prototyping
  const handleManualUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      setCapturedPhoto(dataUrl);
      setAnalysisResult(null);
      stopCamera();
      await triggerVerification(dataUrl);
    };
    reader.readAsDataURL(file);
  };
  
  // Enroll Identity Profile picture action
  const handleEnrollIdentity = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnrollMessage(null);

    if (!enrollName.trim()) {
      setEnrollMessage({ type: "error", text: "Identity label name is mandatory." });
      return;
    }
    if (!capturedPhoto) {
      setEnrollMessage({ type: "error", text: "Please capture or upload a frontal facial photo first." });
      return;
    }
    
    setIsEnrolling(true);
    try {
      const response = await fetch("/api/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: enrollName.trim(),
          role: enrollRole,
          photo: capturedPhoto
        }),
      });

      const json = await response.json();
      if (json.success) {
        setEnrollMessage({ type: "success", text: `Biometric Profile for ${enrollName} enrolled in secure database!` });
        setEnrollName("");
        
       // Refresh Database View
        await fetchEnrolledList();
      } else {
        setEnrollMessage({ type: "error", text: json.error || "Enrollment failure." });
      }
    } catch (err: any) {
      setEnrollMessage({ type: "error", text: `Database network error: ${err.message}` });
    } finally {
      setIsEnrolling(false);
    }
  };

  // Delete/De-authorize enrolled identity
  const handleDeleteIdentity = async (id: string, name: string) => {
    if (!window.confirm(`DANGER: Are you sure you want to remove identity of '${name}' from secure face registry database?`)) {
      return;
    }

    try {
      const response = await fetch("/api/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });
      const json = await response.json();
      if (json.success) {
        await fetchEnrolledList();
       // Clear active scan targets if it matches deleted profile
        if (analysisResult?.matchedId === id) {
          setAnalysisResult(null);
        }
      }
    } catch (e) {
      alert("Error removing profile record: Network failure.");
    }
  };

  const handleResetPortal = () => {
    setCapturedPhoto(null);
    setAnalysisResult(null);
    setStreamError(null);
    setEnrollMessage(null);
    startCamera();
  };

  return (
    <div className="min-h-screen bg-[#070b13] text-gray-100 font-sans selection:bg-blue-500/30 overflow-x-hidden relative">
      {/* Decorative top grid canvas */}
      <div className="absolute top-0 left-0 w-full h-[500px] bg-[radial-gradient(ellipse_at_top,rgba(29,78,216,0.15),transparent_50%)] pointer-events-none" />
      
      {/* HEADER RAIL */}
      <header className="border-b border-blue-950/40 bg-slate-950/60 backdrop-blur-md px-6 py-4 relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 sm:p-2.5 bg-blue-950/50 border border-blue-800/40 rounded-xl shadow-[0_0_15px_rgba(30,58,138,0.3)]">
              <Scan className="w-6 h-6 text-blue-400 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] tracking-widest font-mono text-cyan-400 border border-cyan-800/30 px-1.5 py-0.5 rounded bg-cyan-950/30">
                  SYSTEM CORE ONLINE
                </span>
                <span className="text-[10px] tracking-widest font-mono text-emerald-400 border border-emerald-800/30 px-1.5 py-0.5 rounded bg-emerald-950/30 animate-pulse">
                  NEURAL NETWORK LIVE
                </span>
              </div>
              <h1 className="text-xl font-bold tracking-tight text-white mt-1">
                FACE BIOMETRICS LABORATORY
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-gray-400">
            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg text-gray-300">
              <Clock className="w-3.5 h-3.5 text-blue-400" />
              <span>{currentTime || "LOADING..."}</span>
            </div>
            <div className="flex items-center gap-2 bg-blue-950/30 border border-blue-900/40 px-3 py-1.5 rounded-lg text-blue-300">
              <Database className="w-3.5 h-3.5 text-cyan-400" />
              <span>REGISTRY CODES: <strong className="text-white font-semibold">{enrolledUsers.length}</strong></span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10">
        
        {/* LEFT COLUMN - VISUAL SCANNER MODULE (5 COLS) */}
        <section className="lg:col-span-7 xl:col-span-7 flex flex-col gap-4">
          <div id="biometric-visor" className="bg-[#0b101d] border border-blue-950 rounded-2xl p-4 overflow-hidden shadow-2xl relative flex flex-col group">
            {/* Visual Header */}
            <div className="flex items-center justify-between mb-3 border-b border-slate-900/60 pb-2">
              <div className="flex items-center gap-2 text-xs font-mono text-blue-300">
                <Terminal className="w-4.5 h-4.5 text-blue-400" />
                <span>BIOMETRIC FEED DETECTOR v2.4</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${streamActive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                <span className="text-[10px] font-mono tracking-wider uppercase text-gray-400">
                  {streamActive ? "Capturing Feed" : "Standby"}
                </span>
              </div>
            </div>
            
            {/* VISOR CONTAINER */}
            <div className="relative aspect-[4/3] bg-slate-950 rounded-xl overflow-hidden border border-slate-900 shadow-inner flex items-center justify-center">
              
              {/* WebRTC Active Stream View */}
              {streamActive && !capturedPhoto && (
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover transform -scale-x-100"
                  autoplay
                  playsInline
                  muted
                />
              )}

                           {/* Static Analyzed Photo View */}
              {capturedPhoto && (
                <div className="relative w-full h-full flex items-center justify-center bg-black">
                  <img 
                    src={capturedPhoto} 
                    alt="Captured portrait" 
                    className="w-full h-full object-cover" 
                  />
                  
                  {/* SCANNING LASER GRAPHICS EFFECT */}
                  {isScanning && (
                    <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden">
                      <div className="w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_#22d3ee] animate-scan absolute top-0" />
                      <div className="absolute inset-0 bg-cyan-900/10 mix-blend-overlay animate-pulse" />
                      <div className="absolute inset-x-0 bottom-4 text-center">
                        <span className="px-3 py-1.5 rounded-full bg-slate-950/80 border border-cyan-800 text-[10px] font-mono tracking-widest text-cyan-400 animate-pulse">
                          EXECUTING NEURAL CORRELATION SCAN...
                        </span>
                      </div>
                    </div>
                  )}

                                    {/* BIOMETRIC VECTOR COORDINATE OVERLAYS */}
                  {analysisResult?.biometrics?.boundingBox && !isScanning && (
                    <div className="absolute inset-0 pointer-events-none z-10 text-xs">
                      
                      {/* Face Bounding Box Glow */}
                      <div 
                        style={{
                          left: `${analysisResult.biometrics.boundingBox.xMin}%`,
                          top: `${analysisResult.biometrics.boundingBox.yMin}%`,
                          width: `${analysisResult.biometrics.boundingBox.width}%`,
                          height: `${analysisResult.biometrics.boundingBox.height}%`
                        }}
                        className="absolute border-2 border-cyan-400 rounded-lg shadow-[0_0_15px_rgba(34,211,238,0.5)] transition-all duration-500"
                      >
                        {/* Target reticle corners */}
                        <span className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-white" />
                        <span className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-white" />
                        <span className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-white" />
                        <span className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-white" />
                        
                        {/* ID Flag header */}
                        <div className="absolute -top-6 left-0 bg-cyan-400 text-slate-950 font-mono text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-widest flex items-center gap-1">
                          <Eye className="w-2.5 h-2.5" />
                          <span>FACE DETECTED</span>
                        </div>
                      </div>

                      {/* Vector Coordinate Dots (Landmarks) */}
                      {/* Left Eye */}
                      <div 
                        style={{ left: `${analysisResult.biometrics.landmarks.leftEye.x}%`, top: `${analysisResult.biometrics.landmarks.leftEye.y}%` }}
                        className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group"
                      >
                        <span className="w-2 h-2 rounded-full bg-lime-400 ring-4 ring-lime-900/50 shadow-[0_0_8px_#84cc16] animate-pulse" />
                        <span className="mt-1 px-1 bg-slate-950/80 text-[8px] font-mono text-lime-400 border border-lime-800/40 rounded">L:EYE</span>
                      </div>

                      {/* Right Eye */}
                      <div 
                        style={{ left: `${analysisResult.biometrics.landmarks.rightEye.x}%`, top: `${analysisResult.biometrics.landmarks.rightEye.y}%` }}
                        className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
                      >
                        <span className="w-2 h-2 rounded-full bg-lime-400 ring-4 ring-lime-900/50 shadow-[0_0_8px_#84cc16] animate-pulse" />
                        <span className="mt-1 px-1 bg-slate-950/80 text-[8px] font-mono text-lime-400 border border-lime-800/40 rounded">R:EYE</span>
                      </div>

                      {/* Nose Tip */}
                      <div 
                        style={{ left: `${analysisResult.biometrics.landmarks.noseTip.x}%`, top: `${analysisResult.biometrics.landmarks.noseTip.y}%` }}
                        className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-teal-400 ring-2 ring-teal-900/50 shadow-[0_0_8px_#2dd4bf]" />
                        <span className="mt-1 px-1 bg-slate-950/80 text-[8px] font-mono text-teal-400 border border-teal-800/40 rounded">NOSE</span>
                      </div>

                      {/* Mouth Left */}
                      <div 
                        style={{ left: `${analysisResult.biometrics.landmarks.mouthLeft.x}%`, top: `${analysisResult.biometrics.landmarks.mouthLeft.y}%` }}
                        className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 ring-2 ring-amber-900/50 shadow-[0_0_8px_#f59e0b]" />
                        <span className="mt-1 px-1 bg-slate-950/80 text-[8px] font-mono text-amber-400 border border-amber-800/40 rounded">MTH:L</span>
                      </div>

                      {/* Mouth Right */}
                      <div 
                        style={{ left: `${analysisResult.biometrics.landmarks.mouthRight.x}%`, top: `${analysisResult.biometrics.landmarks.mouthRight.y}%` }}
                        className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 ring-2 ring-amber-900/50 shadow-[0_0_8px_#f59e0b]" />
                        <span className="mt-1 px-1 bg-slate-950/80 text-[8px] font-mono text-amber-400 border border-amber-800/40 rounded">MTH:R</span>
                      </div>

                      {/* Chin Tip */}
                      <div 
                        style={{ left: `${analysisResult.biometrics.landmarks.chinTip.x}%`, top: `${analysisResult.biometrics.landmarks.chinTip.y}%` }}
                        className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-pink-400 ring-2 ring-pink-900/50" />
                        <span className="mt-1 px-1 bg-slate-950/80 text-[8px] font-mono text-pink-400 rounded">CHIN</span>
                      </div>

                      {/* Dynamic SVG connecting jawline faceOutline structure */}
                      {analysisResult.biometrics.landmarks.faceOutline && (
                        <svg 
                          className="absolute inset-0 w-full h-full pointer-events-none" 
                          viewBox="0 0 100 100" 
                          preserveAspectRatio="none"
                        >
                          <polygon 
                            points={analysisResult.biometrics.landmarks.faceOutline.map(p => `${p.x},${p.y}`).join(' ')} 
                            fill="none" 
                            stroke="rgba(34,211,238,0.5)" 
                            strokeWidth="1" 
                            strokeDasharray="2,3" 
                          />
                        </svg>
                      )}
                    </div>
                  )}

                </div>
              )}

                           {/* VISOR PLACEHOLDER / STANDBY STATEMENTS */}
              {!streamActive && !capturedPhoto && (
                <div className="text-center p-6 flex flex-col items-center justify-center max-w-sm">
                  <div className="w-16 h-16 rounded-full bg-slate-900 border border-blue-900/40 flex items-center justify-center mb-4 text-blue-400">
                    <Camera className="w-8 h-8 text-cyan-400 animate-pulse" />
                  </div>
                  <h3 className="font-bold text-white tracking-tight mb-2">Visor Feed Inactive</h3>
                  <p className="text-xs text-gray-400 leading-relaxed mb-4">
                    Enable the physical computer camera system logic or directly upload any portrait photo file to start full biometric mapping.
                  </p>
                  
                  <div className="flex flex-col sm:flex-row gap-2 w-full">
                    <button
                      onClick={startCamera}
                      className="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-500 rounded-lg text-xs text-white font-medium flex items-center justify-center gap-1.5 shadow-lg shadow-blue-950/50 cursor-pointer active:scale-95 transition"
                    >
                      <Camera className="w-4 h-4" />
                      Initialize Camera
                    </button>
                    
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1 py-2 px-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-gray-300 font-medium flex items-center justify-center gap-1.5 rounded-lg cursor-pointer active:scale-95 transition"
                    >
                      <Upload className="w-4 h-4 text-cyan-400" />
                      Upload Portrait
                    </button>
                  </div>
                </div>
              )}

              {/* HIDDEN FILE TYPE INPUT FOR MANUAL TESTING */}
              <input 
                type="file" 
                ref={fileInputRef} 
                accept="image/*" 
                className="hidden" 
                onChange={handleManualUpload} 
              />
            </div>
            {/* ERROR HANDLERS */}
            {streamError && (
              <div className="mt-3 p-3 bg-red-950/40 border border-red-900/50 rounded-xl flex items-start gap-2 text-red-300 text-xs leading-relaxed">
                <AlertTriangle className="w-4.5 h-4.5 text-red-400 shrink-0 mt-0.5" />
                <span>{streamError}</span>
              </div>
            )}

            {/* INTEGRATED FEED INTERACTION CONTROLS */}
            {(streamActive || capturedPhoto) && (
              <div className="mt-4 flex gap-2">
                {streamActive && !capturedPhoto ? (
                  <>
                    <button
                      onClick={captureFrameAndScan}
                      disabled={isScanning}
                      className="flex-1 py-3 px-4 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-slate-950 font-bold rounded-xl text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.4)] active:scale-98 transition cursor-pointer"
                    >
                      <Scan className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
                      <span>{isScanning ? "Processing..." : "Capture & Scan"}</span>
                    </button>
                    
                    <button
                      onClick={stopCamera}
                      className="py-3 px-4 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold rounded-xl text-gray-300 cursor-pointer active:scale-98 transition"
                    >
                      Standby
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={handleResetPortal}
                      className="flex-1 py-3 px-4 bg-slate-900 hover:bg-slate-800 border border-blue-950 text-xs font-bold font-mono tracking-wider shadow-inner rounded-xl text-cyan-400 flex items-center justify-center gap-2 cursor-pointer active:scale-98 transition"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>RESET IMAGING GRID</span>
                    </button>

                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="py-3 px-4 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-gray-300 font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer active:scale-98 transition"
                    >
                      <Upload className="w-4 h-4 text-cyan-400" />
                      Swap File
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

                   {/* DUAL MODE IDENTITY RECOGNITION & BIOMETRICS STATS PANEL */}
          {analysisResult && (
            <div className="bg-[#0b101d] border border-blue-950 rounded-2xl p-5 shadow-2xl relative">
              {/* Outer Glow matching Authentication condition */}
              <div className={`absolute inset-0 rounded-2xl pointer-events-none border opacity-20 ${
                analysisResult.matchedId 
                  ? 'border-emerald-500 shadow-[inset_0_0_25px_rgba(16,185,129,0.3)]' 
                  : 'border-yellow-500 shadow-[inset_0_0_25px_rgba(234,179,8,0.2)]'
              }`} />

              <div className="flex items-start justify-between border-b border-slate-900/60 pb-3 mb-4">
                <h3 className="font-bold tracking-tight text-white text-sm flex items-center gap-2">
                  <Activity className="w-4.5 h-4.5 text-cyan-400" />
                  SYSTEM CLASSIFICATION REPORT
                </h3>
                <span className="text-[10px] font-mono text-cyan-400 uppercase">Analysis Instantaneous</span>
              </div>

              {/* ENROLL OR UNRECOGNIZED CALLOUT CONDITIONAL STATS */}
              <div className="flex flex-col sm:flex-row gap-5 items-center bg-slate-950/80 border border-slate-900 p-4 rounded-xl mb-5">
                
                {/* Circular matching indicator percentage */}
                <div className="relative shrink-0 flex items-center justify-center">
                  <svg className="w-20 h-20 transform -rotate-90">
                    <circle cx="40" cy="40" r="34" className="stroke-slate-900" strokeWidth="6" fill="none" />
                    <circle 
                      cx="40" 
                      cy="40" 
                      r="34" 
                      className={analysisResult.matchedId ? 'stroke-emerald-500' : 'stroke-amber-500'} 
                      strokeWidth="6" 
                      fill="none" 
                      strokeDasharray={213.6} 
                      strokeDashoffset={213.6 - (213.6 * analysisResult.matchConfidence) / 100}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center font-mono">
                    <span className="text-lg font-bold text-white">{analysisResult.matchConfidence}%</span>
                    <span className="text-[8px] text-gray-400 leading-none uppercase">Match</span>
                  </div>
                </div>

                <div className="flex-1 w-full text-center sm:text-left">
                  {analysisResult.matchedId ? (
                    <div>
                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1.5">
                        <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 text-[10px] border border-emerald-800/40 font-mono tracking-wider flex items-center gap-1 font-bold">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          ACCESS GRANTED
                        </span>
                        <span className="text-xs text-gray-500 font-mono">ID: {analysisResult.matchedId}</span>
                      </div>
                      <h4 className="text-lg font-bold text-white">{analysisResult.matchedName}</h4>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                        {analysisResult.matchReason}
                      </p>
                    </div>
                  ) : (
                    <div>
                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1.5">
                        <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-400 text-[10px] border border-amber-800/40 font-mono tracking-wider flex items-center gap-1 font-bold">
                          <UserX className="w-3.5 h-3.5" />
                          VISITOR IDENTITY (UNREGISTERED)
                        </span>
                      </div>
                      <h4 className="text-md font-bold text-gray-300">Biometric Pattern Profile Established</h4>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                        This face structure is unknown. Capture details are modeled below. You may use the enroller panel on the right side to register this face.
                      </p>
                    </div>
                  )}
                </div>
              </div>
