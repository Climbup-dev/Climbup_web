"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import SubjectCard from "@/components/SubjectCard";
import Footer from "@/components/Footer";
import type { Subject } from "@/types";

const SEMESTERS = ["", "1", "2", "3", "4", "5", "6", "7", "8"];

export default function SubjectsPage() {
  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [branchFilter, setBranchFilter] = useState("");
  const [semFilter, setSemFilter] = useState("");

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      try {
        const { data, error: fetchError } = await supabase
          .from("subjects")
          .select("*")
          .order("subject_name");
        if (fetchError) throw fetchError;
        setAllSubjects(data || []);
      } catch (e) {
        const message = e instanceof Error ? e.message : "Failed to load";
        setError(message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const branches = [
    ...new Set(allSubjects.map((s) => s.branch).filter(Boolean)),
  ].sort() as string[];

  let filtered = allSubjects;
  if (branchFilter) {
    filtered = filtered.filter((s) => s.branch === branchFilter);
  }
  if (semFilter) {
    filtered = filtered.filter((s) => String(s.semester) === semFilter);
  }

  return (
    <main className="learnsphere-page" style={{ paddingTop: 64 }}>
      <div className="ls-bg-grid" />
      
      {/* Hero Header */}
      <section className="ls-hero" style={{ padding: "80px 0 40px" }}>
        <div className="ls-container">
          <p className="ls-eyebrow">{"// curated by IIT/NIT alumni"}</p>
          <h1 
            style={{ 
              fontSize: "3rem", 
              marginBottom: 16, 
              fontFamily: '"Space Grotesk", sans-serif', 
              fontWeight: 700, 
              color: "var(--ls-text)",
              letterSpacing: "-0.02em",
              lineHeight: 1.1
            }}
          >
            Explore Subjects
          </h1>
          <p className="ls-hero-sub" style={{ margin: 0, maxWidth: "600px" }}>
            Access curated syllabus topic-wise questions and previous year university papers to clear midsems and endsems.
          </p>
        </div>
      </section>

      {/* Content & Filters Section */}
      <section className="ls-section" style={{ paddingTop: 0, minHeight: "60vh" }}>
        <div className="ls-container">
          
          {/* Glassmorphic Filter Bar */}
          <div 
            className="ls-glass-card" 
            style={{ 
              padding: "20px 24px", 
              display: "flex", 
              flexWrap: "wrap", 
              alignItems: "center", 
              gap: 16, 
              border: "1px solid var(--ls-border)", 
              borderRadius: "12px", 
              marginBottom: 32 
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span className="ls-eyebrow" style={{ margin: 0, textTransform: "uppercase" }}>Branch:</span>
              <div style={{ position: "relative" }}>
                <select
                  value={branchFilter}
                  onChange={(e) => setBranchFilter(e.target.value)}
                  style={{
                    background: "rgba(255, 255, 255, 0.05)",
                    border: "1px solid var(--ls-border)",
                    borderRadius: "8px",
                    color: "var(--ls-text)",
                    padding: "8px 36px 8px 16px",
                    fontSize: "0.88rem",
                    cursor: "pointer",
                    outline: "none",
                    fontFamily: "inherit",
                    appearance: "none",
                    fontWeight: 600
                  }}
                >
                  <option value="" style={{ background: "#07111f" }}>All Branches</option>
                  {branches.map((b) => (
                    <option key={b} value={b} style={{ background: "#07111f" }}>
                      {b}
                    </option>
                  ))}
                </select>
                <span 
                  style={{ 
                    position: "absolute", 
                    right: 12, 
                    top: "50%", 
                    transform: "translateY(-50%)", 
                    pointerEvents: "none", 
                    color: "var(--ls-tertiary)", 
                    fontSize: "0.75rem" 
                  }}
                >
                  ▼
                </span>
              </div>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, marginLeft: "auto" }}>
              <span className="ls-eyebrow" style={{ margin: 0, textTransform: "uppercase" }}>Semester:</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {SEMESTERS.map((sem) => (
                  <button
                    key={sem || "all"}
                    className={`ls-btn ${semFilter === sem ? "ls-btn-primary" : "ls-btn-glass"}`}
                    style={{
                      minHeight: "36px",
                      padding: "6px 14px",
                      fontSize: "0.8rem",
                      boxShadow: semFilter === sem ? "0 0 16px rgba(79, 142, 247, 0.25)" : "none"
                    }}
                    onClick={() => setSemFilter(sem)}
                  >
                    {sem ? `Sem ${sem}` : "All"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "80px 0" }}>
              <div 
                className="spinner" 
                style={{ 
                  borderTopColor: "var(--ls-primary)", 
                  width: 48, 
                  height: 48, 
                  borderWidth: 4 
                }} 
              />
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div 
              className="error-banner" 
              style={{ 
                background: "rgba(239, 68, 68, 0.1)", 
                border: "1px solid rgba(239, 68, 68, 0.25)", 
                color: "#fca5a5",
                borderRadius: "12px",
                padding: "16px 24px",
                marginBottom: 32
              }}
            >
              ⚠️ Failed to load subjects: {error}
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && filtered.length === 0 && (
            <div 
              className="ls-glass-card" 
              style={{ 
                padding: "64px 32px", 
                textAlign: "center", 
                borderRadius: "12px", 
                border: "1px solid var(--ls-border)" 
              }}
            >
              <div style={{ fontSize: "3rem", marginBottom: 16 }}>🔍</div>
              <h3 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: 8, fontFamily: '"Space Grotesk", sans-serif' }}>
                No subjects found
              </h3>
              <p style={{ color: "var(--ls-secondary)", margin: 0 }}>
                Try adjusting your branch or semester filter.
              </p>
            </div>
          )}

          {/* Subjects Grid */}
          {!loading && !error && filtered.length > 0 && (
            <div 
              style={{ 
                display: "grid", 
                gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", 
                gap: 24 
              }}
            >
              {filtered.map((subject) => (
                <SubjectCard key={subject.subject_id} subject={subject} />
              ))}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </main>
  );
}
