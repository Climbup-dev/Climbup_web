import React from "react";
import { motion } from "framer-motion";
import { X, ChevronRight, MessageSquare } from "lucide-react";
import { Subject } from "./types";

interface StudyHubSidebarProps {
  isMobile: boolean;
  isMobileSidebarOpen: boolean;
  setIsMobileSidebarOpen: (isOpen: boolean) => void;
  isFocusMode: boolean;
  filteredSubjects: Subject[];
  subjectSearch: string;
  activeSubject: string | null;
  handleSubjectClick: (id: string) => void;
  setShowWhatsappModal: (show: boolean) => void;
}

export const StudyHubSidebar: React.FC<StudyHubSidebarProps> = ({
  isMobile,
  isMobileSidebarOpen,
  setIsMobileSidebarOpen,
  isFocusMode,
  filteredSubjects,
  subjectSearch,
  activeSubject,
  handleSubjectClick,
  setShowWhatsappModal,
}) => {
  return (
    <>
      {isMobile && isMobileSidebarOpen && (
        <div 
          style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 90 }}
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}
      <motion.aside 
        initial={false}
        animate={{ 
          marginLeft: (isFocusMode && !isMobile) ? -240 : 0,
          opacity: (isFocusMode && !isMobile) ? 0 : 1,
          x: isMobile ? (isMobileSidebarOpen ? 0 : -280) : 0
        }}
        transition={{ duration: 0.25, ease: "easeInOut" }}
        className="study-hub-sidebar"
        style={{
          flex: isMobile ? "none" : "0 0 240px",
          width: 240,
          visibility: (isFocusMode && !isMobile) ? "hidden" : "visible",
          transform: "translateZ(0)",
          position: isMobile ? "absolute" : "relative",
          zIndex: isMobile ? 100 : 20,
          height: "100%",
          left: 0,
          top: 0
        }}
      >
        <div className="sidebar-header">
          {isMobile && (
            <button onClick={() => setIsMobileSidebarOpen(false)} style={{ position: "absolute", right: 16, top: 22, background: "none", border: "none", color: "#fff", cursor: "pointer" }}>
              <X size={18} />
            </button>
          )}
          <div className="sidebar-brand">
            <h2>Subjects</h2>
          </div>
        </div>

        <nav className="sidebar-nav">
          {filteredSubjects.length === 0 ? (
            <div style={{ padding: "20px 8px", color: "#475569", fontSize: "0.8rem", textAlign: "center", lineHeight: 1.6 }}>
              {subjectSearch ? `No subjects matching "${subjectSearch}"` : "No subjects found."}
            </div>
          ) : (
            filteredSubjects.map((subject, idx) => (
              <button
                key={subject.id}
                className={`subject-btn ${activeSubject === subject.id ? "active" : ""}`}
                onClick={() => handleSubjectClick(subject.id)}
              >
                <div className="subject-icon">{idx + 1}</div>
                <span style={{ flex: 1, textAlign: "left" }}>{subject.subject_name}</span>
                {activeSubject === subject.id && <ChevronRight size={14} />}
              </button>
            ))
          )}
        </nav>

        <div style={{ padding: "16px", borderTop: "1px solid rgba(255,255,255,0.05)", marginTop: "auto" }}>
          <button 
            onClick={() => setShowWhatsappModal(true)}
            className="read-btn" 
            style={{ width: "100%", background: "linear-gradient(135deg, #25D366, #128C7E)", color: "#fff", fontWeight: 700, padding: "12px", borderRadius: "10px", display: "flex", gap: "8px", justifyContent: "center", alignItems: "center", boxShadow: "0 4px 12px rgba(37, 211, 102, 0.2)", border: "none", cursor: "pointer" }}
          >
            <MessageSquare size={18} /> Connect WhatsApp
          </button>
        </div>
      </motion.aside>
    </>
  );
};
