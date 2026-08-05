import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, FileText, Trash2, Share2, Eye, ArrowUpRight, MoreVertical } from "lucide-react";
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

export const StudyHubTopicCard: React.FC<StudyHubTopicCardProps> = React.memo(({
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
  const sharedByMatch = topic.topic_name.match(/\((Shared by .*?)\)$/);

  return (
    <motion.div
      key={topic.classroom_id}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1], delay: Math.min(index * 0.03, 0.15) }}
      whileHover={{ y: -4, boxShadow: `0 12px 28px rgba(0,0,0,0.4), 0 0 20px ${themeColor}25` }}
      whileTap={{ scale: 0.98 }}
      className={`note-card ${isActive ? "active-topic" : ""}`}
      onMouseEnter={() => handlePreloadPdf(topic.pdf_url)}
      onTouchStart={() => handlePreloadPdf(topic.pdf_url)}
      onClick={() => handleTopicClick(topic)}
      style={{
        padding: 0,
        overflow: "hidden",
        borderRadius: "14px",
        border: `1px solid ${isActive ? themeColor : "rgba(255,255,255,0.06)"}`,
        background: "#0f172a", // Solid slate-900 background instead of blur
        boxShadow: isActive ? `0 0 0 1px ${themeColor}` : "0 4px 12px rgba(0,0,0,0.15)",
        display: "flex",
        flexDirection: "column",
        cursor: "pointer",
        position: "relative",
        transition: "transform 0.2s ease, border-color 0.2s ease", // Optimized transitions
      }}
    >
      {/* Top Preview Header Area */}
      <div style={{
        aspectRatio: "4/3",
        width: "100%",
        background: "#050b14",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* PDF Badge Top Left */}
        <div style={{
          position: "absolute",
          top: 10,
          left: 10,
          zIndex: 10,
          background: "rgba(15, 23, 42, 0.8)",
          border: "1px solid rgba(255,255,255,0.1)",
          color: "#e2e8f0",
          fontSize: "10px",
          fontWeight: 700,
          padding: "4px 8px",
          borderRadius: "6px",
          display: "flex",
          alignItems: "center",
          gap: "4px"
        }}>
          <FileText size={12} color={themeColor} /> PDF
        </div>

        {/* Selection Checkbox */}
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
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: selectedResourceIds.includes(topic.classroom_id) ? themeColor : "rgba(15, 23, 42, 0.6)",
              border: `2px solid ${selectedResourceIds.includes(topic.classroom_id) ? themeColor : "rgba(255,255,255,0.3)"}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "all 0.2s ease"
            }}
          >
            {selectedResourceIds.includes(topic.classroom_id) && <CheckCircle size={18} color="#000" />}
          </div>
        )}

        {/* Thumbnail Preview rendering */}
        {(() => {
          if (!topic.pdf_url) return (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#334155" }}>
              <FileText size={42} opacity={0.3} />
            </div>
          );

          const isDrive = topic.pdf_url.includes("drive.google.com");
          const match = isDrive ? topic.pdf_url.match(/\/d\/([a-zA-Z0-9_-]+)/) : null;
          const driveFileId = match ? match[1] : null;

          return (
            <div style={{ position: "relative", width: "100%", height: "100%" }}>
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: themeColor, opacity: 0.15 }}>
                <FileText size={48} />
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
                    opacity: 0.95,
                    zIndex: 1
                  }}
                  onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0'; }}
                />
              ) : (
                <iframe
                  src={topic.pdf_url.includes("drive.google.com") ? topic.pdf_url.replace(/\/view.*$/, "/preview") : topic.pdf_url}
                  title={cleanTitle}
                  style={{
                    position: "absolute",
                    width: "230%",
                    height: "230%",
                    border: "none",
                    transform: "scale(0.43)",
                    transformOrigin: "top left",
                    pointerEvents: "none",
                    opacity: 0.9,
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
          background: "linear-gradient(180deg, rgba(10,15,25,0.05) 0%, rgba(6,13,25,0.75) 100%)",
          pointerEvents: "none",
          zIndex: 2
        }} />
      </div>

      {/* Card Content & Action Buttons Footer */}
      <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", flex: 1, justifyContent: "space-between", gap: "12px" }}>
        <div>
          <h3 style={{ fontSize: "0.9rem", fontWeight: 700, color: "#f1f5f9", margin: "0 0 6px", lineHeight: "1.4", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
            {cleanTitle}
          </h3>
          <p style={{ margin: 0, fontSize: "0.75rem", color: "#64748b", display: "flex", alignItems: "center", gap: "4px" }}>
            {sharedByMatch ? (
              <span style={{ color: themeColor, fontWeight: 600 }}>✨ Shared by {sharedByMatch[1]}</span>
            ) : topic.created_at ? (
              `📅 ${new Date(topic.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`
            ) : (
              `Document`
            )}
          </p>
        </div>

        {/* Clean Action Footer for Mobile */}
        {topic.is_personal && (
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", paddingTop: "4px", borderTop: "1px solid rgba(255,255,255,0.05)", marginTop: "auto" }}>
            <button
              onClick={(e) => { e.stopPropagation(); setShareResourceIds([topic.classroom_id]); setShareTheme(themeColor); }}
              title="Share PDF"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "none",
                color: "#94a3b8",
                width: 36,
                height: 36,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "all 0.2s"
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = themeColor; e.currentTarget.style.background = `${themeColor}15`; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "#94a3b8"; e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
            >
              <Share2 size={16} />
            </button>
            <button
              onClick={(e) => handleDeleteResource(topic, e)}
              title="Delete PDF"
              style={{
                background: "rgba(239, 68, 68, 0.05)",
                border: "none",
                color: "#ef4444",
                width: 36,
                height: 36,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "all 0.2s"
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239, 68, 68, 0.15)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(239, 68, 68, 0.05)"; }}
            >
              <Trash2 size={16} />
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
});
