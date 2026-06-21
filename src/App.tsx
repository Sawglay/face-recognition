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

