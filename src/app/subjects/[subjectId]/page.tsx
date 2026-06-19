import Link from "next/link";
import { notFound } from "next/navigation";
import PaperCard from "@/components/PaperCard";
import Footer from "@/components/Footer";
import { createClient } from "@/lib/supabase/server";

interface PageProps {
  params: Promise<{ subjectId: string }>;
}

export default async function SubjectPapersPage({ params }: PageProps) {
  const { subjectId } = await params;
  const supabase = await createClient();

  const [{ data: subject, error: subjectError }, { data: papers, error: papersError }] =
    await Promise.all([
      supabase.from("subjects").select("*").eq("subject_id", subjectId).single(),
      supabase
        .from("question_papers")
        .select("*")
        .eq("subject_id", subjectId)
        .order("year", { ascending: false }),
    ]);

  if (subjectError || !subject) {
    notFound();
  }

  if (papersError) {
    return (
      <main className="learnsphere-page" style={{ paddingTop: 64, minHeight: "100vh" }}>
        <div className="ls-bg-grid" />
        <div className="ls-container" style={{ padding: "80px 0" }}>
          <div 
            className="error-banner"
            style={{ 
              background: "rgba(239, 68, 68, 0.1)", 
              border: "1px solid rgba(239, 68, 68, 0.25)", 
              color: "#fca5a5",
              borderRadius: "12px",
              padding: "16px 24px"
            }}
          >
            ⚠️ Failed to load papers: {papersError.message}
          </div>
        </div>
      </main>
    );
  }

  const subjectName = subject.subject_name || "Subject";

  return (
    <main className="learnsphere-page" style={{ paddingTop: 64 }}>
      <div className="ls-bg-grid" />

      {/* Hero Header with breadcrumb */}
      <section className="ls-hero" style={{ padding: "80px 0 40px" }}>
        <div className="ls-container">
          <div 
            className="breadcrumb" 
            style={{ 
              display: "flex", 
              alignItems: "center", 
              gap: 8, 
              fontSize: "0.82rem", 
              color: "var(--ls-secondary)", 
              marginBottom: 16, 
              fontFamily: '"JetBrains Mono", monospace' 
            }}
          >
            <Link href="/subjects" style={{ color: "var(--ls-primary)", textDecoration: "none" }}>Subjects</Link>
            <span style={{ color: "var(--ls-border)" }}>›</span>
            <span style={{ color: "var(--ls-text)" }}>{subjectName}</span>
          </div>

          <p className="ls-eyebrow">
            {"// "}
            {subject.subject_code || "COURSES"}
          </p>
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
            {subjectName}
          </h1>
          <p className="ls-hero-sub" style={{ margin: 0, maxWidth: "600px" }}>
            Browse and download previous year question papers (PYQs). Tagged by semester, year and exam type.
          </p>
        </div>
      </section>

      {/* Content Section */}
      <section className="ls-section" style={{ paddingTop: 0, minHeight: "50vh" }}>
        <div className="ls-container">
          
          <div 
            style={{ 
              display: "flex", 
              justifyContent: "space-between", 
              alignItems: "center", 
              marginBottom: 28, 
              borderBottom: "1px solid var(--ls-border)", 
              paddingBottom: 16 
            }}
          >
            <h2 style={{ fontSize: "1.25rem", fontWeight: 700, fontFamily: '"Space Grotesk", sans-serif', color: "var(--ls-text)", margin: 0 }}>
              Previous Year Papers ({papers?.length || 0})
            </h2>
            <span style={{ fontSize: "0.85rem", color: "var(--ls-secondary)", fontFamily: '"JetBrains Mono", monospace', textTransform: "uppercase" }}>
              Branch: {subject.branch} • Sem {subject.semester}
            </span>
          </div>

          {/* Empty State */}
          {!papers || papers.length === 0 ? (
            <div 
              className="ls-glass-card" 
              style={{ 
                padding: "64px 32px", 
                textAlign: "center", 
                borderRadius: "12px", 
                border: "1px solid var(--ls-border)" 
              }}
            >
              <div style={{ fontSize: "3rem", marginBottom: 16 }}>📭</div>
              <h3 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: 8, fontFamily: '"Space Grotesk", sans-serif' }}>
                No papers yet
              </h3>
              <p style={{ color: "var(--ls-secondary)", margin: 0 }}>
                No question papers found for this subject. Check back soon.
              </p>
            </div>
          ) : (
            <div 
              style={{ 
                display: "grid", 
                gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", 
                gap: 24 
              }}
            >
              {papers.map((paper) => (
                <PaperCard key={paper.paper_id} paper={paper} />
              ))}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </main>
  );
}
