"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, Fragment } from "react";

import { Award, Clock, FileText, ChevronLeft, Download } from "lucide-react";
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

const INSPIRING_QUOTES = [
  "Your potential is endless. Let's unlock it.",
  "Every question solved is a step closer to success.",
  "Focus, determination, and consistency.",
  "The best time to start is now.",
  "Great things never come from comfort zones.",
  "Preparing your academic arsenal..."
];

export default function QuestionPaperClient({ paperId }: { paperId: string }) {
  const router = useRouter();
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

  const [navigatingQuestionId, setNavigatingQuestionId] = useState<string | null>(null);
  const [quoteIndex, setQuoteIndex] = useState(0);

  useEffect(() => {
    if (navigatingQuestionId) {
      const interval = setInterval(() => {
        setQuoteIndex((prev) => (prev + 1) % INSPIRING_QUOTES.length);
      }, 2500);
      return () => clearInterval(interval);
    }
  }, [navigatingQuestionId]);

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
          <div className="questionPaperState" style={{ animation: "pyqPanelIn 0.3s ease-out" }}>
            <div style={{ textAlign: "center", maxWidth: "400px", padding: "40px", background: "linear-gradient(135deg, rgba(8, 34, 53, 0.95), rgba(2, 21, 38, 0.98))", border: "1px solid rgba(56, 211, 153, 0.25)", borderRadius: "24px", boxShadow: "0 40px 100px rgba(0, 0, 0, 0.6), inset 0 0 0 1px rgba(255, 255, 255, 0.05)" }}>
              <span className="questionPaperLoader" style={{ width: "50px", height: "50px", margin: "0 auto 24px", border: "3px solid rgba(56, 211, 153, 0.1)", borderTopColor: "#38d399", borderRadius: "50%", animation: "spin 1s linear infinite", display: "inline-block" }} />
              <h3 style={{ color: "#fff", fontSize: "22px", fontWeight: "700", margin: "0 0 12px" }}>Opening Exam Paper...</h3>
              <p style={{ color: "#9ef8dc", fontSize: "15px", fontStyle: "italic", margin: 0 }}>Every expert was once a beginner.</p>
            </div>
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
                <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
                  <Award size={16} color="#38d399" /> Marks: <strong>{paper.total_marks}</strong>
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
                  <Clock size={16} color="#38d399" /> Duration: <strong>{paper.duration} min</strong>
                </span>
              </div>

              {paper.paper_url && (
                <a
                  href={paper.paper_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="pyqViewPdfBtn"
                >
                  <Download size={18} /> View Original Paper
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
                    <div
                      className="paperQuestionRow"
                      onClick={() => {
                        setNavigatingQuestionId(question.question_id);
                        router.push(`/question/${question.question_id}`);
                      }}
                      style={{ cursor: "pointer" }}
                    >
                    <div className="questionNumber">
                      {navigatingQuestionId === question.question_id ? (
                        <span className="pyqMiniSpinner" />
                      ) : (
                        question.question_number || `Q${index + 1}`
                      )}
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
                  </div>
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

      {navigatingQuestionId && (
        <div className="pyqInspiringLoaderOverlay">
          <div className="pyqInspiringLoaderBox">
            <div className="pyqInspiringSpinner"></div>
            <h3>Opening Answer...</h3>
            <p>"{INSPIRING_QUOTES[quoteIndex]}"</p>
          </div>
        </div>
      )}
    </main>
  );
}
