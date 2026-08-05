import React from "react";
import { BookOpen, CheckCircle, Zap, Shield, Share2 } from "lucide-react";

export const StudyHubHero: React.FC = () => {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 60px", height: "100%", width: "100%", gap: "80px" }}>
      <div style={{ display: "flex", flexDirection: "column", maxWidth: "520px", position: "relative", zIndex: 10 }}>
        <h2 style={{ 
          fontSize: "clamp(38px, 4.5vw, 48px)", 
          fontWeight: 900, 
          lineHeight: 1.1, 
          letterSpacing: "-0.02em", 
          background: "linear-gradient(135deg, #ffffff 30%, #8cf0d0 100%)", 
          WebkitBackgroundClip: "text", 
          WebkitTextFillColor: "transparent",
          margin: "12px 0 16px"
        }}>
          Your Personal<br/>
          Digital Library
        </h2>
        
        <p style={{ color: "rgba(238, 252, 248, 0.75)", fontSize: "16px", lineHeight: 1.6, maxWidth: "600px", margin: "0 0 28px" }}>
          Select a subject from the sidebar to access your structured notes, assignments, and practicals. ClimbUP securely categorizes all shared resources into your personal digital library.
        </p>
        
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, color: "rgba(234, 252, 246, 0.9)", fontSize: "15px", fontWeight: 600 }}>
            <div style={{ padding: "6px", background: "rgba(56,211,153,0.1)", borderRadius: "8px" }}><Zap size={18} color="#38d399" /></div>
            <span>Fast, secure PDF rendering in Focus Mode</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, color: "rgba(234, 252, 246, 0.9)", fontSize: "15px", fontWeight: 600 }}>
            <div style={{ padding: "6px", background: "rgba(56,211,153,0.1)", borderRadius: "8px" }}><BookOpen size={18} color="#38d399" /></div>
            <span>Auto-categorized Assignments and Notes</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, color: "rgba(234, 252, 246, 0.9)", fontSize: "15px", fontWeight: 600 }}>
            <div style={{ padding: "6px", background: "rgba(56,211,153,0.1)", borderRadius: "8px" }}><Share2 size={18} color="#38d399" /></div>
            <span>Share documents with your classmates securely</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, color: "rgba(234, 252, 246, 0.9)", fontSize: "15px", fontWeight: 600 }}>
            <div style={{ padding: "6px", background: "rgba(56,211,153,0.1)", borderRadius: "8px" }}><Shield size={18} color="#38d399" /></div>
            <span>Fully protected against unauthorized access</span>
          </div>
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "center" }}>
        <img 
          src="/study-hub-boy-transparent.png" 
          alt="ClimbUP Library" 
          style={{ 
            width: "100%", 
            maxWidth: 420, 
            objectFit: "contain",
            opacity: 0.95
          }} 
        />
      </div>
    </div>
  );
};

