import React, { startTransition } from "react";
import { motion } from "framer-motion";
import { X, ChevronRight, ArrowLeft, FileText, CheckCircle } from "lucide-react";
import { Subject, Topic } from "./types";

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
  whatsappNumber?: string;
  isPdfOpen?: boolean;
  activeSubjectName?: string;
  pdfTopicsList?: Topic[];
  activeClassroomId?: string;
  onSelectTopic?: (topic: Topic) => void;
  onBackFromPdf?: () => void;
  onEditSubjects?: () => void;
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
  whatsappNumber,
  isPdfOpen = false,
  activeSubjectName = "",
  pdfTopicsList = [],
  activeClassroomId = "",
  onSelectTopic,
  onBackFromPdf,
  onEditSubjects
}) => {
  return (
    <>
      {isMobile && isMobileSidebarOpen && (
        <div 
          style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 90 }}
          onClick={() => startTransition(() => setIsMobileSidebarOpen(false))}
        />
      )}
      <aside 
        className="study-hub-sidebar"
        style={{
          flex: isMobile ? "none" : "0 0 240px",
          width: 240,
          position: isMobile ? "absolute" : "relative",
          zIndex: isMobile ? 100 : 20,
          height: "100%",
          left: 0,
          top: 0,
          // CSS Hardware Accelerated Transform
          transform: isMobile 
            ? (isMobileSidebarOpen ? "translate3d(0, 0, 0)" : "translate3d(-280px, 0, 0)")
            : "translate3d(0, 0, 0)",
          // Margin for Desktop Focus Mode
          marginLeft: (isFocusMode && !isMobile) ? -240 : 0,
          opacity: (isFocusMode && !isMobile) ? 0 : 1,
          visibility: (isFocusMode && !isMobile) ? "hidden" : "visible",
          // Pure CSS Transition (Bypasses React Thread)
          transition: "transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), margin-left 0.3s ease, opacity 0.3s ease",
          willChange: "transform"
        }}
      >
        {/* Sidebar Header */}
        <div className="sidebar-header">
          {isMobile && (
            <button onClick={() => startTransition(() => setIsMobileSidebarOpen(false))} style={{ position: "absolute", right: 16, top: 22, background: "none", border: "none", color: "#fff", cursor: "pointer" }}>
              <X size={18} />
            </button>
          )}

          {isPdfOpen ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", width: "100%" }}>
              <button
                onClick={onBackFromPdf}
                style={{
                  background: "rgba(255, 255, 255, 0.06)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  color: "#38d399",
                  borderRadius: "8px",
                  padding: "5px 10px",
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  alignSelf: "flex-start"
                }}
              >
                <ArrowLeft size={13} /> All Subjects
              </button>
              <div>
                <h2 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, color: "#ffffff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {activeSubjectName}
                </h2>
                <span style={{ fontSize: "0.72rem", color: "#94a3b8", fontWeight: 600 }}>
                  📚 {pdfTopicsList.length} Notes Index
                </span>
              </div>
            </div>
          ) : (
            <div className="sidebar-brand">
              <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#ffffff" }}>Subjects</h2>
            </div>
          )}
        </div>

        {/* Sidebar Nav Items */}
        <nav className="sidebar-nav">
          {isPdfOpen ? (
            /* Mode 2: Reuse subject-btn styling for PDF Notes Index */
            pdfTopicsList.length === 0 ? (
              <div style={{ padding: "20px 8px", color: "#475569", fontSize: "0.8rem", textAlign: "center" }}>
                No notes found.
              </div>
            ) : (
              pdfTopicsList.map((topic, idx) => {
                const isActiveNote = topic.classroom_id === activeClassroomId;
                const cleanTitle = topic.topic_name.replace(/\s*\(Shared by .*\)$/, '');

                return (
                  <button
                    key={topic.classroom_id}
                    className={`subject-btn ${isActiveNote ? "active" : ""}`}
                    onClick={() => {
                      startTransition(() => {
                        if (onSelectTopic) onSelectTopic(topic);
                        if (isMobile) setIsMobileSidebarOpen(false);
                      });
                    }}
                  >
                    <div className="subject-icon">{idx + 1}</div>
                    <span style={{ flex: 1, textAlign: "left", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {cleanTitle}
                    </span>
                    {isActiveNote ? <CheckCircle size={14} color="#38d399" /> : <FileText size={13} style={{ opacity: 0.5 }} />}
                  </button>
                );
              })
            )
          ) : (
            /* Mode 1: Standard Subjects List */
            filteredSubjects.length === 0 ? (
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
            )
          )}

          {!isPdfOpen && onEditSubjects && (
            <div style={{ marginTop: "16px", padding: "0 14px" }}>
              <button
                onClick={() => {
                  onEditSubjects();
                  if (isMobile) setIsMobileSidebarOpen(false);
                }}
                style={{
                  width: "100%",
                  background: "rgba(56, 211, 153, 0.08)",
                  border: "1px dashed rgba(56, 211, 153, 0.3)",
                  borderRadius: "10px",
                  padding: "10px",
                  color: "#38d399",
                  fontWeight: 600,
                  fontSize: "0.82rem",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  transition: "all 0.2s"
                }}
                onMouseOver={e => e.currentTarget.style.background = "rgba(56, 211, 153, 0.15)"}
                onMouseOut={e => e.currentTarget.style.background = "rgba(56, 211, 153, 0.08)"}
              >
                ⚙️ Manage MDM/OE Subjects
              </button>
            </div>
          )}
        </nav>

        {/* WhatsApp Linking Bottom Button */}
        <div style={{ padding: "14px", borderTop: "1px solid rgba(255,255,255,0.05)", marginTop: "auto" }}>
          <motion.button 
            whileHover={whatsappNumber ? {} : { scale: 1.02 }}
            whileTap={whatsappNumber ? {} : { scale: 0.98 }}
            onClick={() => {
              if (!whatsappNumber) {
                setShowWhatsappModal(true);
              }
            }}
            style={{ 
              width: "100%", 
              background: whatsappNumber 
                ? "rgba(37, 211, 102, 0.08)" 
                : "linear-gradient(135deg, #091c28 0%, #030d15 100%)", 
              color: "#ffffff", 
              fontWeight: 700, 
              padding: "10px 14px", 
              borderRadius: "12px", 
              display: "flex", 
              gap: "8px", 
              justifyContent: "center", 
              alignItems: "center", 
              boxShadow: whatsappNumber 
                ? "none" 
                : "0 4px 14px rgba(0, 0, 0, 0.3), 0 0 12px rgba(37, 211, 102, 0.12)", 
              border: whatsappNumber 
                ? "1px solid rgba(37, 211, 102, 0.3)" 
                : "1px solid rgba(37, 211, 102, 0.35)", 
              cursor: whatsappNumber ? "default" : "pointer"
            }}
          >
            <img 
              src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" 
              alt="WhatsApp" 
              style={{ width: "22px", height: "22px", flexShrink: 0 }} 
            />
            <span style={{ fontSize: "0.88rem", fontWeight: 700, color: "#ffffff", whiteSpace: "nowrap" }}>
              {whatsappNumber ? `Connected: ${whatsappNumber}` : "Connect WhatsApp"}
            </span>
          </motion.button>
        </div>
      </aside>
    </>
  );
};
