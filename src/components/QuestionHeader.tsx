"use client";

import { useEffect, useRef, useState } from "react";

type QuestionHeaderProps = {
  title: string;
  imageUrls?: string[];
};

export default function QuestionHeader({ title, imageUrls }: QuestionHeaderProps) {
  const [isStickyVisible, setIsStickyVisible] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sentinelRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        // If the static question is completely out of view, show sticky tab
        setIsStickyVisible(!entry.isIntersecting);
      },
      {
        root: null,
        threshold: 0,
      }
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      {/* Sentinel wrap for the static question */}
      <div ref={sentinelRef} style={{ position: "relative" }}>
        <header className="questionDetailHeader-static">
          <div style={{ color: "#fb7185", fontSize: "13px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: "10px", display: "flex", alignItems: "center", gap: "6px" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
            Question
          </div>
          <h1 style={{ fontSize: "clamp(20px, 4vw, 26px)", lineHeight: 1.4, margin: 0, fontWeight: 700, color: "#fb7185" }}>
            {title}
          </h1>
          {imageUrls && imageUrls.length > 0 && (
            <div className="questionImages" style={{ display: "flex", gap: "16px", flexWrap: "wrap", marginTop: "24px" }}>
              {imageUrls.map((url, i) => (
                <img
                  key={`static-${i}`}
                  src={url}
                  alt="Question Figure"
                  style={{ 
                    maxWidth: "100%", 
                    maxHeight: "320px", 
                    objectFit: "contain",
                    borderRadius: "12px", 
                    border: "1.5px solid rgba(251, 113, 133, 0.28)",
                    backgroundColor: "rgba(255, 255, 255, 0.96)",
                    padding: "8px"
                  }}
                />
              ))}
            </div>
          )}
        </header>
      </div>

      {/* Sticky Button that appears when scrolled out */}
      <div 
        className="questionDetailHeader-sticky-container" 
        style={{ 
          opacity: isStickyVisible ? 1 : 0, 
          pointerEvents: isStickyVisible ? "auto" : "none",
          transition: "opacity 0.3s ease"
        }}
      >
        <div className="question-hover-btn">
          View Question
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '6px' }}>
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
        </div>

        <div className="questionDetailHeader-dropdown">
          <div className="questionDetailHeader-dropdown-content">
            <div style={{ color: "#fb7185", fontSize: "12px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
              Question
            </div>
            <h1 style={{ fontSize: "clamp(18px, 3vw, 22px)", lineHeight: 1.4, margin: 0, fontWeight: 700, color: "#f8fafc" }}>{title}</h1>
            {imageUrls && imageUrls.length > 0 && (
              <div className="questionImages" style={{ display: "flex", gap: "16px", flexWrap: "wrap", marginTop: "24px" }}>
                {imageUrls.map((url, i) => (
                  <img
                    key={`sticky-${i}`}
                    src={url}
                    alt="Question Figure"
                    style={{ 
                      maxWidth: "100%", 
                      maxHeight: "320px", 
                      objectFit: "contain",
                      borderRadius: "12px", 
                      border: "1.5px solid rgba(251, 113, 133, 0.28)",
                      backgroundColor: "rgba(255, 255, 255, 0.96)",
                      padding: "8px"
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
