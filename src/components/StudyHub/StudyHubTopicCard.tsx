import React from "react";
import { motion } from "framer-motion";
import { CheckCircle, FileText, Trash2, Share2, Eye, ArrowUpRight } from "lucide-react";
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
      className={`note-card ${isActive ? "active-topic" : ""}`}
      onMouseEnter={() => handlePreloadPdf(topic.pdf_url)}
      onTouchStart={() => handlePreloadPdf(topic.pdf_url)}
      onClick={() => handleTopicClick(topic)}
      style={{
        padding: 0,
        overflow: "hidden",
        borderRadius: "16px",
        border: `1px solid ${isActive ? themeColor : "rgba(255,255,255,0.09)"}`,
        background: "linear-gradient(160deg, rgba(15, 23, 42, 0.85) 0%, rgba(6, 13, 25, 0.95) 100%)",
        boxShadow: isActive ? `0 0 24px ${themeColor}35` : "0 6px 20px rgba(0,0,0,0.3)",
        display: "flex",
        flexDirection: "column",
        cursor: "pointer",
        position: "relative",
        transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
        willChange: "transform, opacity"
      }}
    >
      {/* Top Preview Header Area */}
      <div style={{
        height: "115px",
        width: "100%",
        background: "linear-gradient(180deg, #091726 0%, #050d18 100%)",
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
          background: "rgba(239, 68, 68, 0.15)",
          border: "1px solid rgba(239, 68, 68, 0.3)",
          color: "#f87171",
          fontSize: "10px",
          fontWeight: 800,
          padding: "3px 8px",
          borderRadius: "6px",
          display: "flex",
          alignItems: "center",
          gap: "4px",
          backdropFilter: "blur(4px)"
        }}>
          <FileText size={11} /> PDF
        </div>

        {/* Action Icon Buttons Top Right (Share & Delete) */}
        <div style={{
          position: "absolute",
          top: 8,
          right: 8,
          zIndex: 10,
          display: "flex",
          gap: "6px",
          alignItems: "center"
        }}>
          {topic.is_personal && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); setShareResourceIds([topic.classroom_id]); setShareTheme(themeColor); }}
                title="Share PDF"
                style={{
                  background: "rgba(15, 23, 42, 0.75)",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  color: "#cbd5e1",
                  width: 28,
                  height: 28,
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  backdropFilter: "blur(4px)",
                  transition: "all 0.15s"
                }}
              >
                <Share2 size={13} />
              </button>

              <button
                onClick={(e) => handleDeleteResource(topic, e)}
                title="Delete PDF"
                style={{
                  background: "rgba(239, 68, 68, 0.2)",
                  border: "1px solid rgba(239, 68, 68, 0.35)",
                  color: "#f87171",
                  width: 28,
                  height: 28,
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  backdropFilter: "blur(4px)"
                }}
              >
                <Trash2 size={13} />
              </button>
            </>
          )}

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
                width: 28,
                height: 28,
                borderRadius: 8,
                background: selectedResourceIds.includes(topic.classroom_id) ? themeColor : "rgba(15, 23, 42, 0.75)",
                border: `1px solid ${selectedResourceIds.includes(topic.classroom_id) ? themeColor : "rgba(255,255,255,0.2)"}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                backdropFilter: "blur(4px)"
              }}
            >
              {selectedResourceIds.includes(topic.classroom_id) && <CheckCircle size={15} color="#000" />}
            </div>
          )}
        </div>

        {/* Thumbnail Preview rendering */}
        {(() => {
          if (!topic.pdf_url) return (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#475569" }}>
              <FileText size={36} opacity={0.4} />
            </div>
          );

          const isDrive = topic.pdf_url.includes("drive.google.com");
          const match = isDrive ? topic.pdf_url.match(/\/d\/([a-zA-Z0-9_-]+)/) : null;
          const driveFileId = match ? match[1] : null;

          return (
            <div style={{ position: "relative", width: "100%", height: "100%" }}>
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: themeColor, opacity: 0.25 }}>
                <FileText size={40} />
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
          background: "linear-gradient(180deg, rgba(15,23,42,0.1) 0%, rgba(6,13,25,0.85) 100%)",
          pointerEvents: "none",
        }} />
      </div>

      {/* Card Content & Action Button */}
      <div style={{ padding: "14px", display: "flex", flexDirection: "column", gap: "10px", flex: 1, justifyContent: "space-between" }}>
        <div>
          <h3 style={{ fontSize: "0.92rem", fontWeight: 700, color: "#f8fafc", margin: "0 0 4px", lineHeight: "1.35", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
            {cleanTitle}
          </h3>
          <p style={{ margin: 0, fontSize: "0.76rem", color: "#94a3b8" }}>
            {sharedByMatch ? (
              <span style={{ color: themeColor, fontWeight: 600 }}>✨ Shared by {sharedByMatch[1]}</span>
            ) : topic.created_at ? (
              `📅 ${new Date(topic.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`
            ) : (
              `PDF Note Document`
            )}
          </p>
        </div>

        {/* Clean Full-Width Open Button */}
        <div style={{ paddingTop: "6px" }}>
          <button 
            style={{ 
              width: "100%", 
              background: `linear-gradient(135deg, ${themeColor} 0%, #0d9488 100%)`, 
              color: "#02131d", 
              fontWeight: 800, 
              fontSize: "0.82rem",
              padding: "8px 12px", 
              borderRadius: "10px", 
              border: "none", 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center", 
              gap: "6px",
              cursor: "pointer",
              boxShadow: `0 4px 12px ${themeColor}30`
            }}
          >
            <Eye size={14} /> Open Note <ArrowUpRight size={14} />
          </button>
        </div>
      </div>
    </motion.div>
  );
});
