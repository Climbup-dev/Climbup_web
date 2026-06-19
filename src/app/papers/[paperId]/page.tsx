import Link from "next/link";
import { notFound } from "next/navigation";
import QuestionsList from "@/components/QuestionsList";
import Footer from "@/components/Footer";
import { createClient } from "@/lib/supabase/server";

interface PageProps {
  params: Promise<{ paperId: string }>;
}

export default async function PaperQuestionsPage({ params }: PageProps) {
  const { paperId } = await params;
  const supabase = await createClient();

  const { data: paper, error: paperError } = await supabase
    .from("question_papers")
    .select("*, subjects(subject_name, subject_id)")
    .eq("paper_id", paperId)
    .single();

  if (paperError || !paper) {
    notFound();
  }

  const { data: questions, error: questionsError } = await supabase
    .from("questions")
    .select("*")
    .eq("paper_id", paperId)
    .order("question_number");

  if (questionsError) {
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
            ⚠️ Failed to load questions: {questionsError.message}
          </div>
        </div>
      </main>
    );
  }

  const subjectName = paper.subjects?.subject_name || "Subject";
  const subjectId = paper.subjects?.subject_id || "";
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
            <Link href={`/subjects/${subjectId}`} style={{ color: "var(--ls-primary)", textDecoration: "none" }}>{subjectName}</Link>
            <span style={{ color: "var(--ls-border)" }}>›</span>
            <span style={{ color: "var(--ls-text)" }}>{paper.paper_title || "Questions"}</span>
          </div>

          <h1 
            style={{ 
              fontSize: "2.6rem", 
              marginBottom: 16, 
              fontFamily: '"Space Grotesk", sans-serif', 
              fontWeight: 700, 
              color: "var(--ls-text)",
              letterSpacing: "-0.01em",
              lineHeight: 1.15
            }}
          >
            {paper.paper_title || "Questions"}
          </h1>
          
          <div
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
              alignItems: "center"
            }}
          >
            {paper.exam_type && (
              <span style={{
                borderRadius: 999,
                background: paper.exam_type.toLowerCase().includes("mid") ? "rgba(245, 184, 75, 0.15)" : "rgba(55, 217, 158, 0.15)",
                color: paper.exam_type.toLowerCase().includes("mid") ? "var(--ls-warm)" : "var(--ls-success)",
                fontSize: "0.72rem",
                fontWeight: 700,
                padding: "4px 12px",
                fontFamily: '"JetBrains Mono", monospace'
              }}>
                {paper.exam_type}
              </span>
            )}
            {paper.year && (
              <span style={{
                borderRadius: 999,
                background: "rgba(255, 255, 255, 0.06)",
                border: "1px solid var(--ls-border)",
                color: "var(--ls-secondary)",
                fontSize: "0.72rem",
                fontWeight: 700,
                padding: "4px 12px",
                fontFamily: '"JetBrains Mono", monospace'
              }}>
                📅 {paper.year}
              </span>
            )}
            {paper.duration && (
              <span style={{
                borderRadius: 999,
                background: "rgba(255, 255, 255, 0.06)",
                border: "1px solid var(--ls-border)",
                color: "var(--ls-secondary)",
                fontSize: "0.72rem",
                fontWeight: 700,
                padding: "4px 12px",
                fontFamily: '"JetBrains Mono", monospace'
              }}>
                ⏱ {paper.duration} min
              </span>
            )}
            {paper.total_marks && (
              <span style={{
                borderRadius: 999,
                background: "rgba(255, 255, 255, 0.06)",
                border: "1px solid var(--ls-border)",
                color: "var(--ls-secondary)",
                fontSize: "0.72rem",
                fontWeight: 700,
                padding: "4px 12px",
                fontFamily: '"JetBrains Mono", monospace'
              }}>
                📊 {paper.total_marks} marks
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Content Section */}
      <section className="ls-section" style={{ paddingTop: 0, minHeight: "50vh" }}>
        <div className="ls-container">
          {!questions || questions.length === 0 ? (
            <div 
              className="ls-glass-card" 
              style={{ 
                padding: "64px 32px", 
                textAlign: "center", 
                borderRadius: "12px", 
                border: "1px solid var(--ls-border)" 
              }}
            >
              <div style={{ fontSize: "3rem", marginBottom: 16 }}>❓</div>
              <h3 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: 8, fontFamily: '"Space Grotesk", sans-serif' }}>
                No questions yet
              </h3>
              <p style={{ color: "var(--ls-secondary)", margin: 0 }}>
                Questions for this paper haven&apos;t been added yet. Check back soon.
              </p>
            </div>
          ) : (
            <QuestionsList questions={questions} />
          )}
        </div>
      </section>

      <Footer />
    </main>
  );
}
