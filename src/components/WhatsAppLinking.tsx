"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Loader2, AlertCircle, CheckCircle2, QrCode, Phone, ShieldCheck, Lock, FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { QRCodeSVG } from "qrcode.react";

// Official Real WhatsApp Logo Image URL from Wikimedia CDN
const WHATSAPP_LOGO_URL = "https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg";
// Official Real Adobe PDF File Icon URL
const PDF_ICON_URL = "https://upload.wikimedia.org/wikipedia/commons/8/87/PDF_file_icon.svg";

export default function WhatsAppLinking() {
  const [flowType, setFlowType] = useState<"direct" | "otp">("direct");
  const [step, setStep] = useState<"checking" | "request" | "verify" | "success">("checking");
  const [connectedNumber, setConnectedNumber] = useState<string | null>(null);
  
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkData, setLinkData] = useState<{ link: string; code: string } | null>(null);

  const stepRef = useRef(step);
  useEffect(() => { stepRef.current = step; }, [step]);

  // Check Supabase directly on mount for existing WhatsApp connection + auto-detect polling
  useEffect(() => {
    const supabase = createClient();
    let intervalId: ReturnType<typeof setInterval>;
    let userId: string | null = null;
    let stopped = false;

    async function initAndPoll() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.id) {
          setStep("request");
          return;
        }
        userId = session.user.id;

        // First check
        const found = await checkWhatsApp(userId!);
        if (found || stopped) return;

        // Start polling every 3 seconds
        intervalId = setInterval(async () => {
          if (stopped || stepRef.current === "success") {
            clearInterval(intervalId);
            return;
          }
          await checkWhatsApp(userId!);
        }, 3000);
      } catch {
        if (stepRef.current === "checking") setStep("request");
      }
    }

    async function checkWhatsApp(uid: string): Promise<boolean> {
      try {
        const { data: userData } = await supabase
          .from("users")
          .select("whatsapp_number")
          .eq("user_id", uid)
          .maybeSingle();

        if (userData && userData.whatsapp_number) {
          setConnectedNumber(userData.whatsapp_number);
          setStep("success");
          if (intervalId) clearInterval(intervalId);
          return true;
        } else if (stepRef.current === "checking") {
          setStep("request");
        }
        return false;
      } catch {
        if (stepRef.current === "checking") setStep("request");
        return false;
      }
    }

    initAndPoll();

    return () => {
      stopped = true;
      if (intervalId!) clearInterval(intervalId!);
    };
  }, []);

  useEffect(() => {
    if (flowType === "direct" && !linkData && !loading && step !== "success" && step !== "checking") {
      handleGenerateLink();
    }
  }, [flowType, step]);

  const handleGenerateLink = async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session || !session.user || !session.user.id) {
        console.error("Frontend Auth Error: No session found!", session);
        throw new Error("Missing user session in Frontend! Please refresh or log in again.");
      }
      
      const backendUrl = process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL || "https://bacend-climbup.onrender.com";
      const res = await fetch(`${backendUrl}/api/whatsapp/generate-link`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          user_id: session.user.id,
          userId: session.user.id
        })
      });
      
      let data: any = {};
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        data = await res.json();
      } else {
        const text = await res.text();
        throw new Error(text || `Server returned status ${res.status}`);
      }

      if (!res.ok || !data.success) {
        throw new Error(data.error || data.message || "Failed to generate link");
      }
      
      setLinkData({ link: data.link, code: data.code });
    } catch (err: any) {
      setError(err.message || "Failed to generate link");
    } finally {
      setLoading(false);
    }
  };

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      const backendUrl = process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL || "https://bacend-climbup.onrender.com";
      const res = await fetch(`${backendUrl}/api/whatsapp/request-otp`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": session ? `Bearer ${session.access_token}` : ""
        },
        body: JSON.stringify({ 
          whatsapp_number: phone,
          user_id: session?.user?.id 
        })
      });
      
      let data: any = {};
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        data = await res.json();
      } else {
        const text = await res.text();
        throw new Error(text || `Server returned status ${res.status}`);
      }

      if (!res.ok || !(data.status === "otp_sent" || data.success === true)) {
        throw new Error(data.message || data.error || "Failed to request OTP");
      }
      
      setStep("verify");
    } catch (err: any) {
      setError(err.message || "Failed to request OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      const backendUrl = process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL || "https://bacend-climbup.onrender.com";
      const res = await fetch(`${backendUrl}/api/whatsapp/verify-otp`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": session ? `Bearer ${session.access_token}` : ""
        },
        body: JSON.stringify({ 
          whatsapp_number: phone, 
          otp: otp 
        })
      });
      
      let data: any = {};
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        data = await res.json();
      } else {
        const text = await res.text();
        throw new Error(text || `Server returned status ${res.status}`);
      }

      if (!res.ok || !(data.status === "verified" || data.success === true)) {
        throw new Error(data.message || data.error || "Invalid or Expired OTP");
      }
      
      setStep("success");
    } catch (err: any) {
      setError(err.message || "Failed to verify OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ width: "100%", padding: "24px 20px", boxSizing: "border-box", display: "flex", flexDirection: "column", alignItems: "center" }}>
      
      {step !== "success" && (
        <>
        {/* ══ DUAL BRAND CONNECTED INTEGRATION HEADER (WhatsApp ⇄ Curved Dotted Arc ⇄ Actual ClimbUP Logo) ══ */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "20px",
          width: "100%",
          padding: "16px 20px 14px",
          background: "linear-gradient(160deg, rgba(37, 211, 102, 0.08) 0%, rgba(15, 23, 42, 0.8) 100%)",
          border: "1px solid rgba(37, 211, 102, 0.3)",
          borderRadius: "24px",
          boxShadow: "0 12px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)",
          position: "relative",
          boxSizing: "border-box"
        }}>
          {/* Full-width SVG Overlay: Static Dotted Line + 100% Accurate Moving White PDF Icon */}
          <svg 
            width="100%" 
            height="100%" 
            style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "visible", zIndex: 1 }}
          >
            {/* STATIC STILL DOTTED LINE (No movement!) */}
            <path
              d="M 50 42 Q 170 5 290 42"
              fill="none"
              stroke="#25D366"
              strokeWidth="2.5"
              strokeDasharray="6,6"
              opacity={0.85}
            />

            {/* WHITE PDF ICON MOVING DIRECTLY ALONG THE EXACT CURVE WITH MATHEMATICAL PRECISION */}
            <g filter="drop-shadow(0 0 10px rgba(255, 255, 255, 0.95)) drop-shadow(0 0 16px rgba(56, 211, 153, 0.7))">
              <animateMotion
                path="M 50 42 Q 170 5 290 42"
                dur="2.4s"
                repeatCount="indefinite"
              />
              {/* White PDF Document Icon centered at (0,0) */}
              <g transform="translate(-13, -13)">
                <path
                  d="M14 2H6C4.89 2 4 2.89 4 4V20C4 21.11 4.89 22 6 22H18C19.11 22 20 21.11 20 20V8L14 2Z"
                  fill="#ffffff"
                />
                <path
                  d="M14 2V8H20"
                  fill="#cbd5e1"
                />
                <path
                  d="M16 13H8M16 17H8M10 9H8"
                  stroke="#10b981"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </g>
            </g>
          </svg>

          {/* Left: Official WhatsApp Logo (Direct Large 58px without circle box) */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", zIndex: 2 }}>
            <img 
              src={WHATSAPP_LOGO_URL} 
              alt="WhatsApp" 
              style={{ width: "58px", height: "58px", filter: "drop-shadow(0 6px 18px rgba(37, 211, 102, 0.5))" }} 
            />
            <span style={{ fontSize: "11px", fontWeight: 800, color: "#25D366" }}>WhatsApp</span>
          </div>

          {/* Center: Spacer for animation */}
          <div style={{ flex: 1, position: "relative", height: "58px" }} />

          {/* Right: Actual ClimbUP Brand Logo (/logo.png) (Direct Large 58px without circle box) */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", zIndex: 2 }}>
            <img 
              src="/logo.png" 
              alt="ClimbUP Logo" 
              style={{ width: "58px", height: "58px", objectFit: "contain", borderRadius: "50%", filter: "drop-shadow(0 6px 18px rgba(56, 211, 153, 0.4))" }} 
            />
            <span style={{ fontSize: "11px", fontWeight: 800, color: "#38d399" }}>ClimbUP</span>
          </div>
        </div>

        {/* Title */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", marginBottom: "16px", width: "100%" }}>
          <h2 style={{ margin: 0, fontSize: "1.3rem", fontWeight: 800, color: "#ffffff", letterSpacing: "-0.01em" }}>
            Sync WhatsApp to ClimbUP
          </h2>
          <span style={{ color: "#94a3b8", fontSize: "0.8rem", marginTop: "4px" }}>
            Send notes on WhatsApp & view them instantly on ClimbUP
          </span>
        </div>
        </>
      )}

      {/* Main Form Content Card */}
      <div style={{ background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "20px", padding: "20px", width: "100%", boxSizing: "border-box" }}>
        <AnimatePresence mode="wait">
          {flowType === "direct" && (
            <motion.div
              key="direct"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}
            >
              {loading && !linkData ? (
                 <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "14px", padding: "28px 0" }}>
                   <Loader2 size={34} color="#25D366" className="spin" />
                   <span style={{ color: "#94a3b8", fontSize: "13px", fontWeight: 500 }}>Generating secure WhatsApp link...</span>
                 </div>
              ) : error ? (
                 <div style={{ marginBottom: "16px", background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.25)", borderRadius: "12px", padding: "12px 14px", color: "#f87171", width: "100%", boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                   <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                     <AlertCircle size={16} />
                     <span style={{ fontSize: "12px" }}>{error}</span>
                   </div>
                   <button onClick={handleGenerateLink} style={{ background: "rgba(255,255,255,0.1)", color: "#fff", border: "none", borderRadius: "6px", padding: "4px 10px", cursor: "pointer", fontSize: "11px", fontWeight: 600 }}>Retry</button>
                 </div>
              ) : linkData ? (
                 <>
                    {/* Security Guarantee Banner */}
                    <div style={{ width: "100%", background: "rgba(37, 211, 102, 0.05)", border: "1px solid rgba(37, 211, 102, 0.15)", borderRadius: "12px", padding: "10px 12px", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px", boxSizing: "border-box" }}>
                      <Lock size={15} color="#25D366" style={{ flexShrink: 0 }} />
                      <p style={{ margin: 0, fontSize: "11px", color: "#cbd5e1", lineHeight: 1.4 }}>
                        Scan or click below to sync notes automatically to your ClimbUP dashboard.
                      </p>
                    </div>

                    {/* QR Code */}
                    <div style={{ background: "#ffffff", padding: "14px", borderRadius: "16px", marginBottom: "14px", boxShadow: "0 8px 24px rgba(0, 0, 0, 0.3)", border: "2px solid rgba(37, 211, 102, 0.4)" }}>
                      <QRCodeSVG 
                        value={linkData.link}
                        size={150}
                        level="H"
                        includeMargin={false}
                        fgColor="#0b141a"
                      />
                    </div>

                    <p style={{ color: "#94a3b8", fontSize: "0.82rem", margin: "0 0 16px 0", textAlign: "center", lineHeight: 1.4 }}>
                      Scan with phone camera<br/>
                      <span style={{ color: "#64748b", fontSize: "0.75rem" }}>or tap button below if on mobile</span>
                    </p>

                    {/* Button with Real WhatsApp Logo */}
                    <a
                      href={linkData.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ 
                        textDecoration: "none", 
                        width: "100%", 
                        background: "linear-gradient(135deg, #25D366 0%, #128C7E 100%)",
                        color: "#ffffff",
                        padding: "13px 16px",
                        borderRadius: "12px",
                        fontWeight: 700,
                        fontSize: "14px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "10px",
                        boxShadow: "0 4px 18px rgba(37, 211, 102, 0.35)",
                        boxSizing: "border-box",
                        cursor: "pointer",
                        transition: "transform 0.15s ease"
                      }}
                    >
                      <img src={WHATSAPP_LOGO_URL} alt="WhatsApp" style={{ width: "28px", height: "28px" }} />
                      Open WhatsApp
                    </a>
                 </>
              ) : null}
            </motion.div>
          )}

          {flowType === "otp" && step === "request" && (
            <motion.div
              key="request"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}
            >
              <button 
                onClick={() => setFlowType("direct")}
                style={{ background: "transparent", border: "none", color: "rgba(158, 248, 220, 0.7)", cursor: "pointer", fontSize: "12px", marginBottom: "14px", display: "flex", alignItems: "center", gap: "6px", alignSelf: "flex-start" }}
              >
                <QrCode size={12} /> Back to QR Scanner
              </button>
              
              <p style={{ color: "#94a3b8", fontSize: "13px", margin: "0 0 16px 0", textAlign: "center" }}>
                Enter your WhatsApp number to receive an OTP code.
              </p>
              
              {error && (
                <div style={{ marginBottom: "14px", background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.25)", borderRadius: "10px", padding: "10px 14px", color: "#f87171", fontSize: "12px", width: "100%", boxSizing: "border-box" }}>
                  {error}
                </div>
              )}
              
              <form onSubmit={handleRequestOtp} style={{ width: "100%", display: "flex", flexDirection: "column", gap: "14px", alignItems: "center" }}>
                <input 
                  type="tel"
                  placeholder="e.g. +91 9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  disabled={loading}
                  style={{ width: "100%", padding: "12px 16px", borderRadius: "10px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255, 255, 255, 0.15)", color: "#fff", outline: "none", fontSize: "14px", boxSizing: "border-box" }}
                />
                
                <button 
                  type="submit"
                  disabled={loading || !phone} 
                  style={{ 
                    width: "100%", 
                    background: "linear-gradient(135deg, #10b981 0%, #059669 100%)", 
                    color: "#fff", 
                    border: "none", 
                    borderRadius: "10px", 
                    padding: "12px", 
                    fontWeight: 700, 
                    fontSize: "14px", 
                    cursor: "pointer", 
                    display: "flex", 
                    alignItems: "center", 
                    justifyContent: "center", 
                    gap: "8px" 
                  }}
                >
                  {loading ? (
                    <><Loader2 size={16} className="spin" /> Sending...</>
                  ) : (
                    <>Send OTP <ArrowRight size={16} /></>
                  )}
                </button>
              </form>
            </motion.div>
          )}

          {step === "verify" && (
            <motion.div
              key="verify"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}
            >
              <p style={{ color: "#94a3b8", fontSize: "13px", margin: "0 0 16px 0", textAlign: "center" }}>
                We've sent a verification code to <strong>{phone}</strong>.
              </p>
              
              {error && (
                <div style={{ marginBottom: "14px", background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.25)", borderRadius: "10px", padding: "10px 14px", color: "#f87171", fontSize: "12px", width: "100%", boxSizing: "border-box" }}>
                  {error}
                </div>
              )}
              
              <form onSubmit={handleVerifyOtp} style={{ width: "100%", display: "flex", flexDirection: "column", gap: "14px", alignItems: "center" }}>
                <input 
                  type="text"
                  placeholder="••••••"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  maxLength={6}
                  required
                  disabled={loading}
                  style={{ width: "180px", padding: "12px 16px", borderRadius: "10px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255, 255, 255, 0.15)", color: "#fff", outline: "none", textAlign: "center", fontSize: "18px", letterSpacing: "6px" }}
                />
                
                <button 
                  type="submit"
                  disabled={loading || otp.length < 4} 
                  style={{ 
                    width: "100%", 
                    background: "linear-gradient(135deg, #10b981 0%, #059669 100%)", 
                    color: "#fff", 
                    border: "none", 
                    borderRadius: "10px", 
                    padding: "12px", 
                    fontWeight: 700, 
                    fontSize: "14px", 
                    cursor: "pointer", 
                    display: "flex", 
                    alignItems: "center", 
                    justifyContent: "center" 
                  }}
                >
                  {loading ? (
                    <><Loader2 size={16} className="spin" /> Verifying...</>
                  ) : (
                    <>Verify Account</>
                  )}
                </button>
                <button 
                  type="button" 
                  onClick={() => setStep("request")}
                  style={{ background: "transparent", border: "none", color: "rgba(158, 248, 220, 0.7)", cursor: "pointer", fontSize: "12px", marginTop: "4px" }}
                >
                  Change phone number
                </button>
              </form>
            </motion.div>
          )}

          {step === "success" && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', padding: '10px 0', width: "100%" }}
            >
              {/* Connected Dual Logos Connectivity Badge */}
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "14px",
                position: "relative",
                padding: "14px 22px",
                background: "linear-gradient(135deg, rgba(37, 211, 102, 0.12) 0%, rgba(15, 23, 42, 0.8) 100%)",
                border: "1.5px solid rgba(37, 211, 102, 0.4)",
                borderRadius: "100px",
                boxShadow: "0 8px 28px rgba(37, 211, 102, 0.25)"
              }}>
                {/* WhatsApp Logo */}
                <img 
                  src={WHATSAPP_LOGO_URL} 
                  alt="WhatsApp" 
                  style={{ width: "42px", height: "42px", filter: "drop-shadow(0 4px 12px rgba(37, 211, 102, 0.5))" }} 
                />

                {/* Glowing Green Success Check Badge */}
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "28px",
                  height: "28px",
                  borderRadius: "50%",
                  background: "#25D366",
                  boxShadow: "0 0 14px #25D366"
                }}>
                  <CheckCircle2 size={18} color="#020c1b" />
                </div>

                {/* ClimbUP Logo */}
                <img 
                  src="/logo.png" 
                  alt="ClimbUP" 
                  style={{ width: "42px", height: "42px", objectFit: "contain", borderRadius: "50%", filter: "drop-shadow(0 4px 12px rgba(56, 211, 153, 0.5))" }} 
                />
              </div>
              <h3 style={{ margin: 0, fontSize: '20px', color: '#fff', fontWeight: 800 }}>WhatsApp Connected! ✅</h3>
              {connectedNumber && (
                <div style={{ background: 'rgba(37, 211, 102, 0.12)', border: '1px solid rgba(37, 211, 102, 0.25)', padding: '6px 14px', borderRadius: '20px', color: '#38d399', fontSize: '13px', fontWeight: 600 }}>
                  Linked Number: {connectedNumber}
                </div>
              )}
              <button
                onClick={() => {
                  setStep("request");
                  setFlowType("otp");
                  setConnectedNumber("");
                  setPhone("");
                  setOtp("");
                  setError("");
                }}
                style={{
                  background: "transparent",
                  border: "1px solid rgba(255,255,255,0.15)",
                  color: "#94a3b8",
                  cursor: "pointer",
                  fontSize: "12px",
                  fontWeight: 600,
                  padding: "6px 14px",
                  borderRadius: "20px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  transition: "all 0.2s ease"
                }}
              >
                <Phone size={12} /> Change Number
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
