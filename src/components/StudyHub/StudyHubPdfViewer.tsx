import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Maximize, Minimize, ExternalLink } from "lucide-react";

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
  onRetry
}) => {
  return (
    <div
      className="pdf-viewer-wrapper"
      onMouseMove={resetHideTimer}
      onTouchStart={resetHideTimer}
      style={{ position: "relative" }}
    >
      <div 
        className={`pdf-floating-controls ${isFocusMode ? 'focus-mode-active' : ''}`}
        style={{
          position: "absolute",
          top: 14,
          left: 14,
          zIndex: 20,
          display: "flex",
          gap: 10,
        }}
      >
        <button
          className="pdf-back-btn"
          onClick={onBack}
        >
          <ArrowLeft size={13} /> Back
        </button>

        <button
          className="pdf-back-btn"
          onClick={handleFocusToggle}
        >
          {isFocusMode ? <Minimize size={13} /> : <Maximize size={13} />}
          {isFocusMode ? "Exit Focus" : "Focus"}
        </button>

        <a
          className="pdf-back-btn"
          href={activePdfUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "6px" }}
        >
          <ExternalLink size={13} /> Open
        </a>
      </div>

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

        <iframe
          key={pdfFastStreamUrl}
          src={pdfFastStreamUrl}
          width="100%"
          height="100%"
          loading="eager"
          style={{
            border: "none",
            opacity: pdfLoading || pdfError || isTransitioning ? 0 : 1,
            visibility: isTransitioning ? "hidden" : "visible",
            transition: "opacity 0.15s ease",
          }}
          title="Classroom Material"
          onLoad={onPdfLoad}
          onError={onPdfError}
        />

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
