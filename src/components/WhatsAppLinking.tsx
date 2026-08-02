"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, ArrowRight, Loader2, AlertCircle, CheckCircle2, QrCode, Phone } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { QRCodeSVG } from "qrcode.react";

export default function WhatsAppLinking() {
  const [flowType, setFlowType] = useState<"direct" | "otp">("direct");
  const [step, setStep] = useState<"request" | "verify" | "success">("request");
  
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkData, setLinkData] = useState<{ link: string; code: string } | null>(null);

  useEffect(() => {
    if (flowType === "direct" && !linkData && !loading) {
      handleGenerateLink();
    }
  }, [flowType]);

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

      // Check if it's either status === "otp_sent" OR success === true
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

      // Check if it's either status === "verified" OR success === true
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
    <div className="wa-linking-container">
      <div className="profileSectionHeading">
        <div>
          <span>Integrations</span>
          <h2>Connect WhatsApp</h2>
        </div>
        <MessageCircle className="wa-icon-title" size={24} />
      </div>

      <div className="wa-linking-card">
        <AnimatePresence mode="wait">
          {flowType === "direct" && (
            <motion.div
              key="direct"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="wa-action-area"
              style={{ display: "flex", flexDirection: "column", alignItems: "center" }}
            >
              {loading && !linkData ? (
                 <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px", padding: "40px 0" }}>
                   <Loader2 size={32} color="#25D366" className="spin" />
                   <span style={{ color: "#94a3b8" }}>Generating secure connection link...</span>
                 </div>
              ) : error ? (
                 <div className="wa-error" style={{ marginBottom: "20px" }}>
                   <AlertCircle size={18} />
                   <span>{error}</span>
                   <button onClick={handleGenerateLink} style={{ marginLeft: "10px", background: "transparent", color: "#fff", border: "1px solid #fff", borderRadius: "4px", padding: "2px 8px", cursor: "pointer" }}>Retry</button>
                 </div>
              ) : linkData ? (
                 <>
                    <div style={{ background: "#fff", padding: "16px", borderRadius: "16px", marginBottom: "20px" }}>
                      <QRCodeSVG 
                        value={linkData.link}
                        size={160}
                        level="H"
                        includeMargin={false}
                        fgColor="#020c1b"
                      />
                    </div>
                    <p style={{ color: "#e2e8f0", fontSize: "0.95rem", fontWeight: 500, margin: "0 0 16px 0", textAlign: "center" }}>
                      Scan QR code with phone<br/>
                      <span style={{ color: "#64748b", fontSize: "0.8rem", fontWeight: 400 }}>or click below if on mobile</span>
                    </p>
                    <a
                      href={linkData.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="wa-connect-btn"
                      style={{ textDecoration: "none", width: "100%", maxWidth: "300px" }}
                    >
                      <MessageCircle size={18} /> Open WhatsApp
                    </a>
                 </>
              ) : null}
              
              <button 
                onClick={() => setFlowType("otp")}
                style={{ background: "transparent", border: "none", color: "rgba(158, 248, 220, 0.7)", cursor: "pointer", fontSize: "14px", marginTop: "24px", display: "flex", alignItems: "center", gap: "6px" }}
              >
                <Phone size={14} /> Link with Phone Number instead
              </button>
            </motion.div>
          )}

          {flowType === "otp" && step === "request" && (
            <motion.div
              key="request"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="wa-action-area"
            >
              <button 
                onClick={() => setFlowType("direct")}
                style={{ background: "transparent", border: "none", color: "rgba(158, 248, 220, 0.7)", cursor: "pointer", fontSize: "14px", marginBottom: "16px", display: "flex", alignItems: "center", gap: "6px" }}
              >
                <QrCode size={14} /> Back to QR Scanner
              </button>
              
              <p className="wa-description">
                Enter your phone number to get started.
              </p>
              
              {error && (
                <div className="wa-error">
                  <AlertCircle size={18} />
                  <span>{error}</span>
                </div>
              )}
              
              <form onSubmit={handleRequestOtp} style={{ width: "100%", display: "flex", flexDirection: "column", gap: "16px", alignItems: "center" }}>
                <input 
                  type="tel"
                  placeholder="e.g. +91 9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="profileInput"
                  required
                  disabled={loading}
                  style={{ width: "100%", maxWidth: "300px", padding: "14px 20px", borderRadius: "12px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(158, 248, 220, 0.2)", color: "#fff", outline: "none" }}
                />
                
                <button 
                  type="submit"
                  disabled={loading || !phone} 
                  className="wa-connect-btn"
                >
                  {loading ? (
                    <><Loader2 size={18} className="spin" /> Sending...</>
                  ) : (
                    <>Send OTP <ArrowRight size={18} /></>
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
              className="wa-action-area"
            >
              <p className="wa-description">
                We've sent a 6-digit code to <strong>{phone}</strong>. Enter it below to verify your account.
              </p>
              
              {error && (
                <div className="wa-error">
                  <AlertCircle size={18} />
                  <span>{error}</span>
                </div>
              )}
              
              <form onSubmit={handleVerifyOtp} style={{ width: "100%", display: "flex", flexDirection: "column", gap: "16px", alignItems: "center" }}>
                <input 
                  type="text"
                  placeholder="••••••"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="profileInput"
                  maxLength={6}
                  required
                  disabled={loading}
                  style={{ width: "100%", maxWidth: "200px", padding: "14px 20px", borderRadius: "12px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(158, 248, 220, 0.2)", color: "#fff", outline: "none", textAlign: "center", fontSize: "20px", letterSpacing: "8px" }}
                />
                
                <button 
                  type="submit"
                  disabled={loading || otp.length < 4} 
                  className="wa-connect-btn"
                >
                  {loading ? (
                    <><Loader2 size={18} className="spin" /> Verifying...</>
                  ) : (
                    <>Verify Account</>
                  )}
                </button>
                <button 
                  type="button" 
                  onClick={() => setStep("request")}
                  style={{ background: "transparent", border: "none", color: "rgba(158, 248, 220, 0.7)", cursor: "pointer", fontSize: "14px", marginTop: "8px" }}
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
              className="wa-success-area"
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}
            >
              <div style={{ color: '#25D366', background: 'rgba(37, 211, 102, 0.1)', padding: '20px', borderRadius: '50%' }}>
                <CheckCircle2 size={48} />
              </div>
              <h3 style={{ margin: 0, fontSize: '24px', color: '#fff' }}>Connected Successfully!</h3>
              <p className="wa-instruction" style={{ textAlign: 'center' }}>
                Your WhatsApp account is now linked. You can directly send us notes and PDFs via WhatsApp to upload them instantly.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
