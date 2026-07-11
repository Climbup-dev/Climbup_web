"use client";

import { useEffect, useState } from "react";
import "@/styles/QuestionPaper.css";

const INSPIRING_QUOTES = [
  "Your potential is endless. Let's unlock it.",
  "Every question solved is a step closer to success.",
  "Focus, determination, and consistency.",
  "The best time to start is now.",
  "Great things never come from comfort zones.",
  "Preparing your academic arsenal..."
];

export default function QuestionDetailLoading() {
  const [quoteIndex, setQuoteIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setQuoteIndex((prev) => (prev + 1) % INSPIRING_QUOTES.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <main className="questionDetailPage" style={{ minHeight: "100vh", background: "#021526" }}>
      <section className="questionDetailShell" style={{ minHeight: "80vh", display: "grid", placeItems: "center" }}>
        <div style={{ textAlign: "center", maxWidth: "400px", padding: "40px", background: "linear-gradient(135deg, rgba(8, 34, 53, 0.95), rgba(2, 21, 38, 0.98))", border: "1px solid rgba(56, 211, 153, 0.25)", borderRadius: "24px", boxShadow: "0 40px 100px rgba(0, 0, 0, 0.6), inset 0 0 0 1px rgba(255, 255, 255, 0.05)", animation: "pyqPanelIn 0.3s ease-out" }}>
          <span style={{ width: "50px", height: "50px", margin: "0 auto 24px", border: "3px solid rgba(56, 211, 153, 0.1)", borderTopColor: "#38d399", borderRadius: "50%", animation: "spin 1s linear infinite", display: "inline-block" }} />
          <h3 style={{ color: "#fff", fontSize: "22px", fontWeight: "700", margin: "0 0 12px", fontFamily: "Inter, sans-serif" }}>Opening Answer...</h3>
          <p style={{ color: "#9ef8dc", fontSize: "16px", fontStyle: "italic", margin: 0, minHeight: "48px", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Inter, sans-serif" }}>"{INSPIRING_QUOTES[quoteIndex]}"</p>
        </div>
      </section>
    </main>
  );
}
