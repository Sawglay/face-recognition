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
