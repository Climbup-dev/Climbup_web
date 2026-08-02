import React from "react";
import { motion } from "framer-motion";
import { CheckCircle, FileText, Trash2, Share2, ChevronRight } from "lucide-react";
import { Topic } from "./types";

interface StudyHubTopicCardProps {
  topic: Topic;
  index: number;
  themeColor: string;
  categoryLabel: string;
  activeClassroomId: string;
  selectedResourceIds: string[];
  setSelectedResourceIds: React.Dispatch<React.SetStateAction<string[]>>;
  handlePreloadPdf: (url?: string) => void;
  handleTopicClick: (topic: Topic) => void;
  handleDeleteResource: (topic: Topic, e: React.MouseEvent) => void;
  setShareResourceIds: (ids: string[]) => void;
  setShareTheme: (theme: string) => void;
}

export const StudyHubTopicCard: React.FC<StudyHubTopicCardProps> = ({
  topic,
  index,
  themeColor,
  categoryLabel,
  activeClassroomId,
  selectedResourceIds,
  setSelectedResourceIds,
  handlePreloadPdf,
  handleTopicClick,
  handleDeleteResource,
  setShareResourceIds,
  setShareTheme
}) => {
  const isActive = activeClassroomId === topic.classroom_id;
  const cleanTitle = topic.topic_name.replace(/\s*\(Shared by .*\)$/, '');
  const sharedByMatch = topic.topic_name.match(/\(Shared by (.*?)\)$/);

  return (
    <motion.div
      key={topic.classroom_id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      className={`note-card ${isActive ? "active-topic" : ""}`}
      onMouseEnter={() => handlePreloadPdf(topic.pdf_url)}
      onTouchStart={() => handlePreloadPdf(topic.pdf_url)}
      onClick={() => handleTopicClick(topic)}
      style={{
        padding: 0,
        overflow: "hidden",
        borderRadius: "18px",
        border: `1.5px solid ${isActive ? themeColor : "rgba(255,255,255,0.08)"}`,
        background: "linear-gradient(160deg, rgba(15, 23, 42, 0.9) 0%, rgba(7, 15, 30, 0.95) 100%)",
        boxShadow: isActive ? `0 0 24px ${themeColor}30` : "0 8px 32px rgba(0,0,0,0.3)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{
        height: "105px",
        width: "100%",
        background: "#070f1e",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        position: "relative",
        overflow: "hidden",
      }}>
        {topic.is_personal && topic.status !== "pending" && (
          <div
            onClick={(e) => {
              e.stopPropagation();
              setSelectedResourceIds(prev =>
                prev.includes(topic.classroom_id)
                  ? prev.filter(id => id !== topic.classroom_id)
                  : [...prev, topic.classroom_id]
              );
            }}
            style={{
              position: "absolute",
              top: 8,
              right: 8,
              zIndex: 10,
              width: 24,
              height: 24,
              borderRadius: 6,
              background: selectedResourceIds.includes(topic.classroom_id) ? themeColor : "rgba(0,0,0,0.4)",
              border: `1.5px solid ${selectedResourceIds.includes(topic.classroom_id) ? themeColor : "rgba(255,255,255,0.3)"}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
            }}
          >
            {selectedResourceIds.includes(topic.classroom_id) && <CheckCircle size={16} color="#000" />}
          </div>
        )}
        {(() => {
          if (!topic.pdf_url) return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#64748b" }}><FileText size={24} /></div>;

          const isDrive = topic.pdf_url.includes("drive.google.com");
          const match = isDrive ? topic.pdf_url.match(/\/d\/([a-zA-Z0-9_-]+)/) : null;
          const driveFileId = match ? match[1] : null;

          return (
            <div style={{ position: "relative", width: "100%", height: "100%" }}>
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: themeColor, opacity: 0.3 }}>
                <FileText size={32} />
              </div>

              {isDrive && driveFileId ? (
                <img
                  src={`https://drive.google.com/thumbnail?id=${driveFileId}&sz=w600`}
                  alt={cleanTitle}
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    objectPosition: "top",
                    opacity: 0.88,
                    zIndex: 1
                  }}
                  onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0'; }}
                />
              ) : (
                <iframe
                  src={topic.pdf_url.includes("supabase.co") ? `${topic.pdf_url}#page=1&toolbar=0&navpanes=0&scrollbar=0` : topic.pdf_url}
                  title={cleanTitle}
                  style={{
                    position: "absolute",
                    width: "230%",
                    height: "230%",
                    border: "none",
                    transform: "scale(0.43)",
                    transformOrigin: "top left",
                    pointerEvents: "none",
                    opacity: 0.88,
                    zIndex: 1
                  }}
                  scrolling="no"
                  loading="lazy"
                />
              )}
            </div>
          );
        })()}

        <div style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(180deg, rgba(15,23,42,0.05) 0%, rgba(15,23,42,0.6) 100%)",
          pointerEvents: "none",
        }} />
      </div>

      <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: "8px" }}>
        <div>
          <h3 className="note-title" style={{ fontSize: "0.92rem", fontWeight: 700, color: "#f8fafc", margin: "0 0 2px", lineHeight: "1.3" }}>
            {cleanTitle}
          </h3>
          <p className="note-desc" style={{ margin: 0, fontSize: "0.78rem", color: "#94a3b8" }}>
            {sharedByMatch ? (
              <span style={{ color: themeColor, fontWeight: 600 }}>✨ Shared by {sharedByMatch[1]}</span>
            ) : topic.created_at ? (
              `📅 ${new Date(topic.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`
            ) : (
              `Click to open ${categoryLabel.toLowerCase()}.`
            )}
          </p>
        </div>

        <div className="note-footer" style={{ marginTop: "2px", paddingTop: "8px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <div className="note-meta" style={{ color: themeColor, fontSize: "0.75rem" }}>
            <FileText size={12} />
            <span>PDF Ready</span>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            {topic.is_personal && (
              <>
                <button
                  className="read-btn"
                  style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444", padding: "6px 10px" }}
                  onClick={(e) => handleDeleteResource(topic, e)}
                >
                  <Trash2 size={14} />
                </button>
                <button
                  className="read-btn"
                  style={{ background: `${themeColor}20`, color: themeColor }}
                  onClick={(e) => { e.stopPropagation(); setShareResourceIds([topic.classroom_id]); setShareTheme(themeColor); }}
                >
                  <Share2 size={13} /> Share
                </button>
              </>
            )}
            <button className="read-btn" style={{ background: themeColor, color: "#020c1b", fontWeight: 700 }}>
              Open <ChevronRight size={13} />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
