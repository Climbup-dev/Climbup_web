"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useState, Fragment } from "react";

import Navbar from "@/components/Navbar";
import { useAuth } from "@/hooks/useAuth";
import { createClient } from "@/lib/supabase/client";
import "@/styles/QuestionPaper.css";

type EntryMode = "login" | "register";

type QuestionPaper = {
  paper_id: string;
  paper_title: string;
  year: number;
  exam_type: string;
  duration: number;
  total_marks: number;
  paper_url?: string | null;
  subjects: {
    subject_name: string;
    subject_code: string;
  } | null;
};

type PaperQuestion = {
  question_id: string;
  question_number: string;
  question_text: string;
  image_urls?: string[] | null;
  marks?: number | null;
  has_or_before?: boolean | null;
};

const AuthModal = dynamic(() => import("@/components/AuthModal"), {
  ssr: false,
  loading: () => null,
});

export default function QuestionPaperClient({ paperId }: { paperId: string }) {
  const { passwordRecovery } = useAuth();
  const supabase = useMemo(() => createClient(), []);

  const [authOpen, setAuthOpen] = useState(false);
  const [entryMode, setEntryMode] = useState<EntryMode>("login");
  const [paper, setPaper] = useState<QuestionPaper | null>(null);
  const [questions, setQuestions] = useState<PaperQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const openAuth = (mode: EntryMode) => {
    setEntryMode(mode);
    setAuthOpen(true);
  };

  useEffect(() => {
    let active = true;

    async function loadPaper() {
      if (!supabase || !paperId) return;

      setLoading(true);
      setMessage("");

      try {
        const [
          { data: paperData, error: paperError },
          { data: questionsData, error: questionsError },
        ] = await Promise.all([
            supabase
              .from("question_papers")
              .select(`
                paper_id,
                paper_title,
                year,
                exam_type,
                duration,
                total_marks,
                paper_url,
                subjects:subject_id (
                  subject_name,
                  subject_code
                )
              `)
              .eq("paper_id", paperId)
              .maybeSingle(),

            supabase
              .from("questions")
              .select(`
                question_id,
                question_number,
                question_text,
                image_urls,
                marks,
                has_or_before
              `)
              .eq("paper_id", paperId)
              .order("question_number", { ascending: true }),
          ]);

        if (!active) return;

        if (paperError) {
          setMessage(paperError.message);
        } else if (questionsError) {
          setMessage(questionsError.message);
        } else {
          setPaper(paperData as QuestionPaper | null);
          const rawQuestions = (questionsData || []) as PaperQuestion[];
          
          // Natural sort so "10" comes after "2" instead of before "1"
          const sortedQuestions = rawQuestions.sort((a, b) => {
            const numA = a.question_number || "";
            const numB = b.question_number || "";
            return numA.localeCompare(numB, undefined, { numeric: true, sensitivity: "base" });
          });
          
          setQuestions(sortedQuestions);
        }
      } catch (error) {
        if (!active) return;

        setMessage(
          error instanceof Error
            ? error.message
            : "Unable to load this question paper right now."
        );
      }

      setLoading(false);
    }

    loadPaper();

    return () => {
      active = false;
    };
  }, [paperId, supabase]);

  return (
    <main className="questionPaperPage">
      <Navbar
        onLogin={() => openAuth("login")}
        onSignUp={() => openAuth("register")}
      />

      <section className="questionPaperShell">
        <Link className="questionPaperBack" href="/pyqs" prefetch={false}>
          ← Back to PYQs
        </Link>

        {loading ? (
          <div className="questionPaperState">
            <span className="questionPaperLoader" />
            <h1>Loading question paper</h1>
          </div>
        ) : message ? (
          <div className="questionPaperState">
            <h1>Unable to load paper</h1>
            <p>{message}</p>
          </div>
        ) : !paper ? (
          <div className="questionPaperState">
            <h1>Question paper not found</h1>
            <p>This paper may not exist or you may not have access.</p>
          </div>
        ) : (
          <section className="officialPaper">
            <header className="officialPaperHeader">
              <p className="paperLabel">Question Paper</p>

              <h1>{paper.paper_title}</h1>

              <p className="paperSubject">
                {paper.subjects?.subject_name || "Subject"}
                {paper.subjects?.subject_code && (
                  <span> ({paper.subjects.subject_code})</span>
                )}
              </p>

              <div className="paperInfoGrid">
                <span>Marks: <strong>{paper.total_marks}</strong></span>
                <span>Duration: <strong>{paper.duration} min</strong></span>
              </div>

              {paper.paper_url && (
                <a
                  href={paper.paper_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="pyqViewPdfBtn"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    marginTop: "18px",
                    padding: "10px 22px",
                    background: "rgba(140, 240, 208, 0.12)",
                    color: "#8cf0d0",
                    border: "1px solid rgba(140, 240, 208, 0.28)",
                    borderRadius: "10px",
                    fontSize: "14px",
                    fontWeight: 800,
                    textDecoration: "none",
                    cursor: "pointer",
                    transition: "all 160ms ease",
                  }}
                >
                  📄 View Original Paper
                </a>
              )}
            </header>

            {questions.length === 0 ? (
              <div className="questionPaperState compact">
                <h2>No questions available.</h2>
              </div>
            ) : (
              <div className="paperQuestionList">
                {questions.map((question, index) => {
                  const getBaseNumber = (qNum: string) => {
                    const match = qNum.match(/^\d+/);
                    return match ? parseInt(match[0], 10) : null;
                  };

                  const currentBase = getBaseNumber(question.question_number || "");
                  const prevBase = index > 0 ? getBaseNumber(questions[index - 1].question_number || "") : null;
                  const isNewSection = prevBase !== null && currentBase !== null && prevBase % 2 === 0 && currentBase % 2 === 1 && currentBase > prevBase;

                  return (
                  <Fragment key={question.question_id}>
                    {isNewSection && (
                      <div style={{
                        display: "flex",
                        alignItems: "center",
                        margin: "56px 0 40px",
                        gap: "20px"
                      }}>
                        <div style={{ flex: 1, height: "1.5px", background: "linear-gradient(to right, transparent, rgba(251, 191, 36, 0.45))" }}></div>
                        <div style={{
                          width: "8px", height: "8px", transform: "rotate(45deg)", background: "#fbbf24", boxShadow: "0 0 10px rgba(251,191,36,0.5)"
                        }}></div>
                        <div style={{
                          width: "8px", height: "8px", transform: "rotate(45deg)", background: "#fbbf24", boxShadow: "0 0 10px rgba(251,191,36,0.5)"
                        }}></div>
                        <div style={{
                          width: "8px", height: "8px", transform: "rotate(45deg)", background: "#fbbf24", boxShadow: "0 0 10px rgba(251,191,36,0.5)"
                        }}></div>
                        <div style={{ flex: 1, height: "1.5px", background: "linear-gradient(to left, transparent, rgba(251, 191, 36, 0.45))" }}></div>
                      </div>
                    )}
                    
                    {question.has_or_before && (
                      <div style={{ display: "flex", alignItems: "center", margin: "32px 0 24px" }}>
                        <div style={{ flex: 1, height: "1.5px", background: "linear-gradient(to right, transparent, rgba(56, 189, 248, 0.35))" }}></div>
                        <span style={{ 
                          padding: "6px 20px", 
                          fontWeight: 850, 
                          color: "#38bdf8", 
                          fontSize: "14px", 
                          letterSpacing: "2px",
                          background: "rgba(56, 189, 248, 0.12)",
                          borderRadius: "20px",
                          border: "1px solid rgba(56, 189, 248, 0.3)",
                          boxShadow: "0 0 15px rgba(56, 189, 248, 0.15)"
                        }}>
                          OR
                        </span>
                        <div style={{ flex: 1, height: "1.5px", background: "linear-gradient(to left, transparent, rgba(56, 189, 248, 0.35))" }}></div>
                      </div>
                    )}
                    <Link
                      className="paperQuestionRow"
                      href={`/question/${question.question_id}`}
                      prefetch={false}
                    >
                    <div className="questionNumber">
                      {question.question_number || `Q${index + 1}`}
                    </div>

                    <div className="questionContent">
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px" }}>
                        
                        <p style={{ margin: 0 }}>{question.question_text}</p>
                        
                        {question.marks ? (
                          <div style={{ flexShrink: 0 }}>
                            <span style={{
                              fontSize: "13px",
                              background: "rgba(158, 248, 220, 0.12)",
                              color: "#9ef8dc",
                              padding: "4px 10px",
                              borderRadius: "12px",
                              fontWeight: 750,
                              whiteSpace: "nowrap",
                              border: "1px solid rgba(158, 248, 220, 0.24)",
                              display: "inline-block"
                            }}>
                              {question.marks} Marks
                            </span>
                          </div>
                        ) : null}
                      </div>

                      {question.image_urls && question.image_urls.length > 0 && (
                        <div className="questionImages" style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginTop: "16px" }}>
                          {question.image_urls.map((url, i) => (
                            <img
                              key={i}
                              src={url}
                              alt="Question Figure"
                              style={{ 
                                maxWidth: "260px", 
                                maxHeight: "180px", 
                                objectFit: "contain",
                                borderRadius: "10px", 
                                border: "1.5px solid rgba(158, 248, 220, 0.28)",
                                backgroundColor: "rgba(255, 255, 255, 0.96)",
                                padding: "6px"
                              }}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </Link>
                  </Fragment>
                  );
                })}
              </div>
            )}
          </section>
        )}
      </section>

      {(authOpen || passwordRecovery) && (
        <AuthModal
          key={entryMode}
          open={authOpen}
          initialMode={entryMode}
          onClose={() => setAuthOpen(false)}
        />
      )}
    </main>
  );
}
