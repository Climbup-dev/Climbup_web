import React from "react";
import { BookOpen, ChevronRight, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";

interface StudyHubHeroProps {
  isMobile?: boolean;
  onOpenSidebar?: () => void;
}

export const StudyHubHero: React.FC<StudyHubHeroProps> = ({ isMobile, onOpenSidebar }) => {
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
          Supercharge Your<br/>
          Study Sessions
        </h2>
        {isMobile && (
          <button 
            onClick={onOpenSidebar}
            style={{
              margin: "0 0 24px 0",
              padding: "14px 18px",
              width: "100%",
              background: "linear-gradient(135deg, rgba(56,211,153,0.2), rgba(16,185,129,0.1))",
              color: "#38d399",
              border: "1.5px solid rgba(56, 211, 153, 0.4)",
              borderRadius: "14px",
              fontSize: "15px",
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              boxShadow: "0 8px 24px rgba(56,211,153,0.15)",
              fontFamily: "Inter, sans-serif",
              outline: "none",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ width: 38, height: 38, borderRadius: "10px", background: "rgba(56,211,153,0.2)", display: "flex", alignItems: "center", justifyContent: "center", color: "#38d399" }}>
                <BookOpen size={20} />
              </div>
              <div style={{ textAlign: "left" }}>
                <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "#fff" }}>📚 Select Your Subject</div>
                <div style={{ fontSize: "0.76rem", color: "#38d399", fontWeight: 500, marginTop: 2 }}>Tap to view assignments & notes</div>
              </div>
            </div>
            <ChevronRight size={18} color="#38d399" />
          </button>
        )}
        <p style={{ color: "rgba(238, 252, 248, 0.75)", fontSize: "16px", lineHeight: 1.6, maxWidth: "600px", margin: "0 0 24px" }}>
          Select a subject from the left to get started. Ask the AI Study Assistant for instant, accurate answers based on your study materials, and learn faster and smarter.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, color: "rgba(234, 252, 246, 0.9)", fontSize: "15px", fontWeight: 600 }}>
            <CheckCircle size={16} color="#38d399" />
            <span>Interactive AI Chat for instant doubt resolution</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, color: "rgba(234, 252, 246, 0.9)", fontSize: "15px", fontWeight: 600 }}>
            <CheckCircle size={16} color="#38d399" />
            <span>Distraction-free Focus Mode reading</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, color: "rgba(234, 252, 246, 0.9)", fontSize: "15px", fontWeight: 600 }}>
            <CheckCircle size={16} color="#38d399" />
            <span>Organized Assignments and Practicals</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, color: "rgba(234, 252, 246, 0.9)", fontSize: "15px", fontWeight: 600 }}>
            <CheckCircle size={16} color="#38d399" />
            <span>Seamlessly Share Resources with Classmates</span>
          </div>
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "center" }}>
        <motion.img 
          src="/study-hub-boy-transparent.png" 
          alt="AI Study Assistant" 
          animate={{ y: [0, -15, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          style={{ 
            width: "100%", 
            maxWidth: 460, 
            filter: "drop-shadow(0 30px 60px rgba(0,0,0,0.4)) drop-shadow(0 0 40px rgba(56, 211, 153, 0.2))", 
            objectFit: "contain"
          }} 
        />
      </div>
    </div>
  );
};
