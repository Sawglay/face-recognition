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
