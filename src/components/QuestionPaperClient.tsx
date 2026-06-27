"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

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
  subjects: {
    subject_name: string;
    subject_code: string;
  } | null;
};

type PaperQuestion = {
  question_id: string;
  question_number: string;
  question_text: string;
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
                question_text
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
          setQuestions((questionsData || []) as PaperQuestion[]);
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
              <p className="paperLabel">Official Question Paper</p>

              <h1>{paper.paper_title}</h1>

              <p className="paperSubject">
                {paper.subjects?.subject_name || "Subject"}
                {paper.subjects?.subject_code && (
                  <span> ({paper.subjects.subject_code})</span>
                )}
              </p>

              <div className="paperInfoGrid">
                <span>Year: <strong>{paper.year}</strong></span>
                <span>Exam: <strong>{paper.exam_type}</strong></span>
                <span>Marks: <strong>{paper.total_marks}</strong></span>
                <span>Duration: <strong>{paper.duration} min</strong></span>
              </div>
            </header>

            {questions.length === 0 ? (
              <div className="questionPaperState compact">
                <h2>No questions available.</h2>
              </div>
            ) : (
              <div className="paperQuestionList">
                {questions.map((question, index) => (
                  <Link
                    className="paperQuestionRow"
                    href={`/question/${question.question_id}`}
                    key={question.question_id}
                    prefetch={false}
                  >
                    <div className="questionNumber">
                      {question.question_number || `Q${index + 1}`}
                    </div>

                    <div className="questionContent">
                      <p>{question.question_text}</p>
                    </div>
                  </Link>
                ))}
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
