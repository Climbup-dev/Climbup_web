import Link from "next/link";
import type { QuestionPaper } from "@/types";

interface PaperCardProps {
  paper: QuestionPaper;
}

export default function PaperCard({ paper }: PaperCardProps) {
  const isMid = paper.exam_type?.toLowerCase().includes("mid");
  const examBadgeColor = isMid ? "var(--ls-warm)" : "var(--ls-success)";
  const examBadgeBg = isMid ? "rgba(245, 184, 75, 0.12)" : "rgba(55, 217, 158, 0.12)";
  
  return (
    <article 
      className="ls-glass-card ls-feature-card ls-paper-card" 
      style={{ display: "flex", flexDirection: "column", height: "100%", padding: 28, position: "relative" }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <span style={{
          borderRadius: 999,
          background: examBadgeBg,
          color: examBadgeColor,
          fontSize: "0.72rem",
          fontWeight: 700,
          padding: "5px 12px",
          fontFamily: '"JetBrains Mono", monospace',
          letterSpacing: "0.03em"
        }}>
          {paper.exam_type || "EXAM"}
        </span>
        <span style={{
          fontSize: "0.82rem",
          color: "var(--ls-tertiary)",
          fontWeight: 600,
          fontFamily: '"JetBrains Mono", monospace'
        }}>
          Year: {paper.year}
        </span>
      </div>
      
      <h3 style={{
        fontSize: "1.2rem",
        fontWeight: 700,
        color: "var(--ls-text)",
        lineHeight: 1.4,
        marginBottom: 16,
        fontFamily: '"Space Grotesk", sans-serif'
      }}>
        {paper.paper_title}
      </h3>

      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "12px",
        background: "rgba(255, 255, 255, 0.02)",
        border: "1px solid var(--ls-border)",
        borderRadius: "8px",
        padding: "12px 16px",
        marginBottom: 24,
        marginTop: "auto"
      }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: "0.68rem", color: "var(--ls-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Duration</span>
          <span style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--ls-secondary)" }}>⏱ {paper.duration} min</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: "0.68rem", color: "var(--ls-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Total Marks</span>
          <span style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--ls-secondary)" }}>📊 {paper.total_marks} marks</span>
        </div>
      </div>

      <Link 
        href={`/papers/${paper.paper_id}`} 
        className="ls-btn ls-btn-glass" 
        style={{ width: "100%", justifyContent: "center", textDecoration: "none" }}
      >
        Solve Paper <span aria-hidden style={{ color: "var(--ls-primary)" }}>→</span>
      </Link>
    </article>
  );
}
