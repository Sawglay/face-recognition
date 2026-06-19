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
