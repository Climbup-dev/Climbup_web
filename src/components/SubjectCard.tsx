import Link from "next/link";
import type { Subject } from "@/types";

interface SubjectCardProps {
  subject: Subject;
}

export default function SubjectCard({ subject }: SubjectCardProps) {
  const branchLower = (subject.branch || "").toLowerCase();
  let iconName = "book";
  let gradientColor = "rgba(79, 142, 247, 0.2)"; // blue
  
  if (branchLower.includes("cs") || branchLower.includes("comp") || branchLower.includes("it")) {
    iconName = "database";
    gradientColor = "rgba(79, 142, 247, 0.2)";
  } else if (branchLower.includes("vlsi") || branchLower.includes("ec") || branchLower.includes("ee") || branchLower.includes("electronics")) {
    iconName = "chart";
    gradientColor = "rgba(245, 184, 75, 0.15)"; // warm/orange
  } else if (branchLower.includes("mech") || branchLower.includes("civil") || branchLower.includes("eng")) {
    iconName = "briefcase";
    gradientColor = "rgba(55, 217, 158, 0.15)"; // success/green
  }

  return (
    <article 
      className="ls-glass-card ls-course-card ls-subject-card" 
      style={{ display: "flex", flexDirection: "column", height: "100%" }}
    >
      <div 
        className="ls-course-thumb" 
        style={{ background: `radial-gradient(circle, ${gradientColor}, transparent 58%), rgba(255, 255, 255, 0.03)` }}
      >
        <span className="ls-popular" style={{ top: 14, right: 14, textTransform: "uppercase" }}>
          {subject.subject_code || "SUB"}
        </span>
        <div 
          className="ls-subject-icon-wrap" 
          style={{ 
            color: gradientColor.includes("245") 
              ? "var(--ls-warm)" 
              : gradientColor.includes("55") 
                ? "var(--ls-success)" 
                : "var(--ls-primary)" 
          }}
        >
          {iconName === "database" && (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 44, height: 44 }}>
              <ellipse cx="12" cy="5" rx="7" ry="3" />
              <path d="M5 5v6c0 1.7 3.1 3 7 3s7-1.3 7-3V5M5 11v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" />
            </svg>
          )}
          {iconName === "chart" && (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 44, height: 44 }}>
              <path d="M4 19V5m0 14h16M8 16v-5m4 5V8m4 8v-7" />
            </svg>
          )}
          {iconName === "briefcase" && (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 44, height: 44 }}>
              <path d="M9 6V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1M4 7h16v12H4zM4 12h16" />
            </svg>
          )}
          {iconName === "book" && (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 44, height: 44 }}>
              <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5zM4 5.5v16" />
            </svg>
          )}
        </div>
      </div>
      <div 
        className="ls-course-body" 
        style={{ display: "flex", flexDirection: "column", flexGrow: 1, padding: 24 }}
      >
        <h3 
          style={{ 
            fontSize: "1.15rem", 
            fontWeight: 700, 
            lineHeight: 1.3, 
            marginBottom: 12, 
            minHeight: 48, 
            display: "-webkit-box", 
            WebkitLineClamp: 2, 
            WebkitBoxOrient: "vertical", 
            overflow: "hidden",
            color: "var(--ls-text)",
            fontFamily: '"Space Grotesk", sans-serif'
          }}
        >
          {subject.subject_name}
        </h3>
        
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20, marginTop: "auto" }}>
          {subject.branch && (
            <span 
              className="ls-popular" 
              style={{ position: "static", padding: "4px 10px", fontSize: "0.7rem", textTransform: "uppercase" }}
            >
              {subject.branch}
            </span>
          )}
          <span 
            style={{
              borderRadius: 999,
              background: "rgba(255, 255, 255, 0.06)",
              border: "1px solid var(--ls-border)",
              color: "var(--ls-secondary)",
              fontSize: "0.7rem",
              fontWeight: 700,
              padding: "4px 10px",
              fontFamily: '"JetBrains Mono", monospace'
            }}
          >
            SEM {subject.semester}
          </span>
        </div>
        
        <Link 
          href={`/subjects/${subject.subject_id}`} 
          className="ls-btn ls-btn-primary" 
          style={{ width: "100%", justifyContent: "center", textDecoration: "none" }}
        >
          View Question Papers <span aria-hidden>{"->"}</span>
        </Link>
      </div>
    </article>
  );
}
