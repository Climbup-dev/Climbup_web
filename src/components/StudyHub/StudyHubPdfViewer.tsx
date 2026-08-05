import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Maximize, Minimize, Download, ChevronLeft, ChevronRight, FileText, ChevronDown, CheckCircle, ZoomIn, ZoomOut, RotateCw } from "lucide-react";
import { Topic } from "./types";

interface StudyHubPdfViewerProps {
  isFocusMode: boolean;
  pdfLoading: boolean;
  pdfError: boolean;
  isTransitioning: boolean;
  activePdfUrl: string;
  pdfFastStreamUrl?: string;
  warmupUrl: string | null;
  resetHideTimer: () => void;
  handleFocusToggle: () => void;
  onBack: () => void;
  onPdfLoad: () => void;
  onPdfError: () => void;
  onRetry: () => void;
  availableTopics?: Topic[];
  activeClassroomId?: string;
  onSelectTopic?: (topic: Topic) => void;
}

export const StudyHubPdfViewer: React.FC<StudyHubPdfViewerProps> = ({
  isFocusMode,
  pdfLoading,
  pdfError,
  isTransitioning,
  activePdfUrl,
  pdfFastStreamUrl,
  warmupUrl,
  resetHideTimer,
  handleFocusToggle,
  onBack,
  onPdfLoad,
  onPdfError,
  onRetry,
  availableTopics = [],
  activeClassroomId = "",
  onSelectTopic
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [downloadState, setDownloadState] = useState<"idle" | "downloading" | "done">("idle");
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  // Compute current index in availableTopics
  const currentIndex = availableTopics.findIndex(t => t.classroom_id === activeClassroomId);
  const currentTopic = currentIndex !== -1 ? availableTopics[currentIndex] : null;

  const handleDownload = () => {
    if (downloadState === "downloading") return;

    setDownloadState("downloading");
    const cleanName = currentTopic ? currentTopic.topic_name.replace(/\s*\(Shared by .*\)$/, '') : "Note";
    const proxyDownloadUrl = `/api/pdf-proxy?url=${encodeURIComponent(activePdfUrl)}&download=true&filename=${encodeURIComponent(cleanName)}.pdf`;
    
    const a = document.createElement("a");
    a.href = proxyDownloadUrl;
    a.download = `${cleanName}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setTimeout(() => {
      setDownloadState("done");
      setTimeout(() => {
        setDownloadState("idle");
      }, 2500);
    }, 1200);
  };

  const handlePrev = () => {
    if (currentIndex > 0 && onSelectTopic) {
      onSelectTopic(availableTopics[currentIndex - 1]);
    }
  };

  const handleNext = () => {
    if (currentIndex < availableTopics.length - 1 && onSelectTopic) {
      onSelectTopic(availableTopics[currentIndex + 1]);
    }
  };

  return (
    <div
      className="pdf-viewer-wrapper"
      onMouseMove={resetHideTimer}
      onTouchStart={resetHideTimer}
      style={{ position: "relative", width: "100%", height: "100%" }}
    >
      {/* Invisible Hover Area to reveal header in Focus Mode */}
      {isFocusMode && (
        <div 
          onMouseEnter={() => setShowDropdown(true)} // using showDropdown state loosely or add new state
          style={{ position: "absolute", top: 0, left: 0, right: 0, height: 50, zIndex: 29 }}
        />
      )}

      {/* Floating Top Header Bar */}
      <div 
        className={`pdf-floating-controls ${isFocusMode ? 'focus-mode-active' : ''}`}
        style={{
          position: "absolute",
          top: 14,
          left: 14,
          right: 14,
          zIndex: 30,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          pointerEvents: "none"
        }}
      >
        {/* Left Side Actions (Back & Focus) */}
        <div style={{ display: "flex", gap: 8, alignItems: "center", pointerEvents: "auto" }}>
          <button
            className="pdf-back-btn"
            onClick={onBack}
            title="Exit PDF & return to Subject"
            style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700 }}
          >
            <ArrowLeft size={14} /> Back
          </button>

          <button
            className="pdf-back-btn"
            onClick={handleFocusToggle}
          >
            {isFocusMode ? <Minimize size={14} /> : <Maximize size={14} />}
            {isFocusMode ? "Exit Focus" : "Focus"}
          </button>
          
          <div style={{ 
            display: "flex", 
            background: "rgba(6, 15, 28, 0.9)", 
            borderRadius: 12, 
            overflow: "hidden", 
            border: "1px solid rgba(45, 212, 191, 0.3)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
            backdropFilter: "blur(12px)",
            pointerEvents: "auto"
          }}>
            <button
              onClick={() => setZoom(z => Math.max(0.5, z - 0.25))}
              style={{ padding: "8px 10px", background: "transparent", border: "none", color: "#2dd4bf", cursor: "pointer", borderRight: "1px solid rgba(45, 212, 191, 0.2)" }}
              title="Zoom Out"
            >
              <ZoomOut size={16} />
            </button>
            <span style={{ padding: "8px 10px", fontSize: "0.8rem", color: "#ffffff", fontWeight: 700, display: "flex", alignItems: "center", borderRight: "1px solid rgba(45, 212, 191, 0.2)" }}>
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom(z => Math.min(3, z + 0.25))}
              style={{ padding: "8px 10px", background: "transparent", border: "none", color: "#2dd4bf", cursor: "pointer", borderRight: "1px solid rgba(45, 212, 191, 0.2)" }}
              title="Zoom In"
            >
              <ZoomIn size={16} />
            </button>
            <button
              onClick={() => setRotation(r => r + 90)}
              style={{ padding: "8px 10px", background: "transparent", border: "none", color: "#2dd4bf", cursor: "pointer" }}
              title="Rotate"
            >
              <RotateCw size={16} />
            </button>
          </div>
        </div>

        {/* Top Center — Clean Document Title & Selector Pill */}
        {availableTopics.length > 0 && (
          <div style={{ position: "relative", pointerEvents: "auto" }}>
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              style={{
                background: "rgba(6, 15, 28, 0.9)",
                border: "1px solid rgba(45, 212, 191, 0.3)",
                color: "#ffffff",
                fontSize: "0.82rem",
                fontWeight: 700,
                padding: "6px 14px",
                borderRadius: 12,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 8,
                boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
                backdropFilter: "blur(12px)",
                transition: "all 0.15s ease"
              }}
            >
              <FileText size={14} color="#2dd4bf" />
              <span style={{ maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {currentTopic ? currentTopic.topic_name.replace(/\s*\(Shared by .*\)$/, '') : "Select Note"}
              </span>
              <span style={{ color: "#2dd4bf", fontSize: "0.75rem", fontWeight: 800 }}>
                ({currentIndex + 1}/{availableTopics.length})
              </span>
              <ChevronDown size={14} color="#2dd4bf" />
            </button>

            {/* Dropdown Menu listing all PDF notes sequentially */}
            {showDropdown && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 8px)",
                  left: "50%",
                  transform: "translateX(-50%)",
                  background: "rgba(7, 16, 29, 0.98)",
                  border: "1px solid rgba(45, 212, 191, 0.35)",
                  borderRadius: 14,
                  padding: 6,
                  width: "250px",
                  maxHeight: "260px",
                  overflowY: "auto",
                  boxShadow: "0 12px 32px rgba(0,0,0,0.6)",
                  backdropFilter: "blur(16px)",
                  zIndex: 100,
                  display: "flex",
                  flexDirection: "column",
                  gap: 4
                }}
              >
                {availableTopics.map((topic, idx) => {
                  const isSelected = topic.classroom_id === activeClassroomId;
                  return (
                    <button
                      key={topic.classroom_id}
                      onClick={() => {
                        if (onSelectTopic) onSelectTopic(topic);
                        setShowDropdown(false);
                      }}
                      style={{
                        background: isSelected ? "rgba(45, 212, 191, 0.18)" : "transparent",
                        border: isSelected ? "1px solid rgba(45, 212, 191, 0.3)" : "none",
                        color: isSelected ? "#2dd4bf" : "#cbd5e1",
                        padding: "8px 10px",
                        borderRadius: 8,
                        fontSize: "0.8rem",
                        fontWeight: isSelected ? 700 : 500,
                        cursor: "pointer",
                        textAlign: "left",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        transition: "all 0.15s"
                      }}
                    >
                      <span style={{ fontSize: "0.72rem", color: "#2dd4bf", fontWeight: 700 }}>{idx + 1}.</span>
                      <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {topic.topic_name.replace(/\s*\(Shared by .*\)$/, '')}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Right Side Actions (Interactive Instant In-Page Download) */}
        <div style={{ pointerEvents: "auto" }}>
          <button
            className="pdf-back-btn"
            onClick={handleDownload}
            disabled={downloadState === "downloading"}
            title="Download PDF instantly"
            style={{ 
              display: "flex", 
              alignItems: "center", 
              gap: "6px", 
              fontWeight: 700,
              background: downloadState === "done" ? "rgba(45, 212, 191, 0.2)" : undefined,
              borderColor: downloadState === "done" ? "rgba(45, 212, 191, 0.4)" : undefined,
              color: downloadState === "done" ? "#2dd4bf" : undefined,
              transition: "all 0.2s ease"
            }}
          >
            {downloadState === "downloading" ? (
              <>
                <div style={{ width: 12, height: 12, borderRadius: "50%", border: "2px solid #2dd4bf", borderTopColor: "transparent", animation: "pdfSpin 0.6s linear infinite" }} />
                <span>Downloading...</span>
              </>
            ) : downloadState === "done" ? (
              <>
                <CheckCircle size={13} color="#2dd4bf" />
                <span>Saved!</span>
              </>
            ) : (
              <>
                <Download size={13} />
                <span>Download</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Floating Download Toast Feedback */}
      <AnimatePresence>
        {downloadState === "downloading" && (
          <motion.div
            initial={{ opacity: 0, y: -10, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: -10, x: "-50%" }}
            transition={{ duration: 0.2 }}
            style={{
              position: "absolute",
              top: 68,
              left: "50%",
              zIndex: 50,
              background: "rgba(6, 15, 28, 0.95)",
              border: "1px solid rgba(45, 212, 191, 0.4)",
              color: "#2dd4bf",
              padding: "7px 18px",
              borderRadius: "100px",
              fontSize: "0.8rem",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: 8,
              boxShadow: "0 8px 24px rgba(0,0,0,0.5), 0 0 16px rgba(45, 212, 191, 0.2)",
              backdropFilter: "blur(12px)",
              pointerEvents: "none"
            }}
          >
            <div style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid #2dd4bf", borderTopColor: "transparent", animation: "pdfSpin 0.6s linear infinite" }} />
            <span>Downloading PDF to your device...</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Screen Left Center Navigation Arrow Button (<) */}
      {availableTopics.length > 1 && (
        <button
          onClick={handlePrev}
          disabled={currentIndex <= 0}
          title="Previous PDF Note"
          style={{
            position: "absolute",
            left: 16,
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: 40,
            width: 44,
            height: 44,
            borderRadius: "50%",
            background: "rgba(6, 15, 28, 0.85)",
            border: "1.5px solid rgba(45, 212, 191, 0.35)",
            color: currentIndex > 0 ? "#2dd4bf" : "#475569",
            opacity: currentIndex > 0 ? 1 : 0.4,
            cursor: currentIndex > 0 ? "pointer" : "not-allowed",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 8px 24px rgba(0,0,0,0.5), 0 0 16px rgba(45, 212, 191, 0.15)",
            backdropFilter: "blur(12px)",
            transition: "all 0.2s ease"
          }}
        >
          <ChevronLeft size={24} />
        </button>
      )}

      {/* Screen Right Center Navigation Arrow Button (>) */}
      {availableTopics.length > 1 && (
        <button
          onClick={handleNext}
          disabled={currentIndex >= availableTopics.length - 1}
          title="Next PDF Note"
          style={{
            position: "absolute",
            right: 16,
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: 40,
            width: 44,
            height: 44,
            borderRadius: "50%",
            background: "rgba(6, 15, 28, 0.85)",
            border: "1.5px solid rgba(45, 212, 191, 0.35)",
            color: currentIndex < availableTopics.length - 1 ? "#2dd4bf" : "#475569",
            opacity: currentIndex < availableTopics.length - 1 ? 1 : 0.4,
            cursor: currentIndex < availableTopics.length - 1 ? "pointer" : "not-allowed",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 8px 24px rgba(0,0,0,0.5), 0 0 16px rgba(45, 212, 191, 0.15)",
            backdropFilter: "blur(12px)",
            transition: "all 0.2s ease"
          }}
        >
          <ChevronRight size={24} />
        </button>
      )}

      {/* PDF Frame Container */}
      <div 
        className="pdf-frame-container"
        style={{
          pointerEvents: isTransitioning ? "none" : "auto",
          willChange: "width",
          transform: "translateZ(0)",
        }}
      >
        <AnimatePresence>
          {isTransitioning && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{
                position: "absolute", inset: 0, zIndex: 10,
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
                background: "rgba(2, 12, 27, 0.98)",
                backdropFilter: "blur(10px)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: "50%",
                  border: "3px solid rgba(56,211,153,0.15)",
                  borderTopColor: "#38d399",
                  animation: "pdfSpin 0.7s linear infinite",
                }} />
                <span style={{ fontSize: "0.95rem", color: "#38d399", fontWeight: 600, letterSpacing: "0.02em" }}>
                  {isFocusMode ? "Entering Focus Mode..." : "Exiting Focus Mode..."}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {pdfLoading && !pdfError && (
          <div style={{
            position: "absolute", inset: 0, zIndex: 2,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            background: "rgba(7,15,30,0.95)",
            borderRadius: 16, gap: 20,
          }}>
            <div style={{ width: "100%", maxWidth: 480, display: "flex", flexDirection: "column", gap: 12, padding: "0 40px" }}>
              {["80%","65%","90%","55%","75%","85%","60%"].map((w, i) => (
                <div key={i} className="sk" style={{ height: i === 0 ? 22 : 14, width: w, borderRadius: 8 }} />
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
              <div style={{
                width: 20, height: 20, borderRadius: "50%",
                border: "2px solid rgba(56,211,153,0.2)",
                borderTopColor: "#38d399",
                animation: "pdfSpin 0.8s linear infinite",
              }} />
              <span style={{ fontSize: "0.8rem", color: "#475569", fontWeight: 500 }}>Loading PDF…</span>
            </div>
            <style>{`@keyframes pdfSpin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {pdfError && (
          <div style={{
            position: "absolute", inset: 0, zIndex: 2,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            background: "rgba(7,15,30,0.95)", borderRadius: 16, gap: 12,
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: 16,
              background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "1.6rem",
            }}>📄</div>
            <p style={{ color: "#f87171", fontWeight: 600, margin: 0, fontSize: "0.9rem" }}>PDF load nahi ho saka</p>
            <p style={{ color: "#475569", margin: 0, fontSize: "0.8rem" }}>URL check karo ya baad mein try karo</p>
            <button
              onClick={onRetry}
              style={{
                marginTop: 8, padding: "9px 20px", borderRadius: 100,
                background: "rgba(56,211,153,0.1)", border: "1px solid rgba(56,211,153,0.25)",
                color: "#38d399", fontWeight: 600, fontSize: "0.82rem", cursor: "pointer",
                fontFamily: "Inter, sans-serif",
              }}
            >
              🔄 Retry
            </button>
          </div>
        )}

        <div style={{ 
          width: "100%", 
          height: "100%", 
          overflow: "auto",
          position: "relative"
        }}>
          <div style={{ 
            width: `${zoom * 100}%`, 
            height: `${zoom * 100}%`,
            minWidth: "100%",
            minHeight: "100%",
            position: "relative"
          }}>
            <div style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              width: `${(1 / zoom) * 100}%`,
              height: `${(1 / zoom) * 100}%`,
              transition: "transform 0.3s ease-out",
              transform: `translate(-50%, -50%) scale(${zoom}) rotate(${rotation}deg)`,
              transformOrigin: "center center"
            }}>
            <iframe
              key={pdfFastStreamUrl}
              src={pdfFastStreamUrl}
              width="100%"
              height="100%"
              loading="eager"
              style={{
                border: "none",
                background: "transparent",
                opacity: pdfLoading || pdfError || isTransitioning ? 0 : 1,
                visibility: isTransitioning ? "hidden" : "visible",
                transition: "opacity 0.15s ease",
              }}
              title="Classroom Material"
              onLoad={onPdfLoad}
              onError={onPdfError}
            />
          </div>
        </div>
      </div>

        {warmupUrl && warmupUrl !== pdfFastStreamUrl && (
          <iframe
            src={warmupUrl}
            style={{
              position: "fixed",
              top: -9999,
              left: -9999,
              width: "1px",
              height: "1px",
              opacity: 0,
              pointerEvents: "none",
              visibility: "hidden",
            }}
            aria-hidden="true"
            tabIndex={-1}
          />
        )}
      </div>
    </div>
  );
};
