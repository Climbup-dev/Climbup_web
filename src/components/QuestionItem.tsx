"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import type { AIAnswer, Question, StudentAnswer } from "@/types";
import StudentAnswerCard from "./StudentAnswerCard";
import WriteAnswer from "./WriteAnswer";

interface QuestionItemProps {
  question: Question;
  onSignIn: () => void;
}

type LikeRow = {
  answer_id: string;
};

export default function QuestionItem({ question, onSignIn }: QuestionItemProps) {
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const supabase = useMemo(() => createClient(), []);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [aiAnswers, setAiAnswers] = useState<AIAnswer[] | null>(null);
  const [studentAnswers, setStudentAnswers] = useState<StudentAnswer[] | null>(
    null
  );
  const [userLikes, setUserLikes] = useState<string[]>([]);

  const difficulty = (question.difficulty || "medium").toLowerCase();
  const diffClass =
    difficulty === "easy"
      ? "diff-easy"
      : difficulty === "hard"
        ? "diff-hard"
        : "diff-medium";

  async function loadAnswers() {
    setLoading(true);

    try {
      const [aiResult, studentResult] = await Promise.all([
        supabase
          .from("ai_answers")
          .select("*")
          .eq("question_id", question.question_id)
          .order("created_at", { ascending: false })
          .limit(1),
        supabase
          .from("student_answers")
          .select("*, users(full_name, profile_image, user_id)")
          .eq("question_id", question.question_id)
          .eq("status", "published")
          .order("likes_count", { ascending: false })
          .limit(50),
      ]);

      if (aiResult.error) throw aiResult.error;
      if (studentResult.error) throw studentResult.error;

      const student = (studentResult.data || []) as StudentAnswer[];
      let likes: string[] = [];

      if (currentUser && student.length > 0) {
        const { data: likeRows, error: likesError } = await supabase
          .from("likes")
          .select("answer_id")
          .eq("user_id", currentUser.id)
          .in(
            "answer_id",
            student.map((answer) => answer.answer_id)
          );

        if (likesError) throw likesError;
        likes = ((likeRows || []) as LikeRow[]).map((like) => like.answer_id);
      }

      setAiAnswers(aiResult.data || []);
      setStudentAnswers(student);
      setUserLikes(likes);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to load answers";
      showToast(message, "error");
      setAiAnswers([]);
      setStudentAnswers([]);
      setUserLikes([]);
    } finally {
      setLoading(false);
    }
  }

  async function toggleExpand() {
    if (expanded) {
      setExpanded(false);
      return;
    }

    setExpanded(true);
    if (aiAnswers === null) await loadAnswers();
  }

  async function handleAnswerPublished() {
    setAiAnswers(null);
    setStudentAnswers(null);
    await loadAnswers();
    showToast("Answer published!", "success");
  }

  const ai = aiAnswers?.[0];

  return (
    <div className={`question-item${expanded ? " expanded" : ""}`} id={`q-${question.question_id}`}>
      <button
        type="button"
        className="question-header"
        onClick={toggleExpand}
        aria-expanded={expanded}
        aria-controls={`qbody-${question.question_id}`}
      >
        <span className="question-num">{question.question_number || "?"}</span>
        <span className="question-main">
          <span className="question-text">{question.question_text}</span>
          <span className="question-badges">
            <span className="badge badge-primary">{question.marks} marks</span>
            <span className={`badge ${diffClass}`}>{question.difficulty}</span>
            {question.module && (
              <span className="badge badge-gray">Module {question.module}</span>
            )}
          </span>
        </span>
        <span className="question-expand-icon" aria-hidden>
          v
        </span>
      </button>
      <div className="question-body" id={`qbody-${question.question_id}`}>
        {expanded && (
          <div id={`qbody-inner-${question.question_id}`}>
            {loading ? (
              <div className="spinner-wrap" style={{ padding: 24 }}>
                <div className="spinner" />
              </div>
            ) : (
              <>
                <div className="ai-answer-block">
                  <div className="ai-answer-header">
                    <span className="ai-badge">AI Answer</span>
                    {ai && (
                      <span className="ai-model-label">
                        by {ai.ai_model || "AI"}
                      </span>
                    )}
                  </div>
                  {ai ? (
                    <div className="ai-answer-text">{ai.answer}</div>
                  ) : (
                    <div
                      style={{
                        color: "var(--text-muted)",
                        fontSize: "0.88rem",
                      }}
                    >
                      No AI answer available for this question yet.
                    </div>
                  )}
                </div>

                <div className="student-answers-section">
                  <div className="student-answers-header">
                    <h4>Student Answers ({studentAnswers?.length || 0})</h4>
                  </div>

                  {studentAnswers && studentAnswers.length > 0 ? (
                    studentAnswers.map((sa) => (
                      <StudentAnswerCard
                        key={sa.answer_id}
                        answer={sa}
                        isLiked={userLikes.includes(sa.answer_id)}
                        onLikeChange={(answerId, liked, count) => {
                          setUserLikes((prev) =>
                            liked
                              ? Array.from(new Set([...prev, answerId]))
                              : prev.filter((id) => id !== answerId)
                          );
                          setStudentAnswers(
                            (prev) =>
                              prev?.map((a) =>
                                a.answer_id === answerId
                                  ? { ...a, likes_count: count }
                                  : a
                              ) || null
                          );
                        }}
                        onSignIn={onSignIn}
                      />
                    ))
                  ) : (
                    <div className="empty-state" style={{ padding: "32px 0" }}>
                      <div className="empty-icon">A</div>
                      <h3>No student answers yet</h3>
                      <p>Be the first to answer this question!</p>
                    </div>
                  )}
                </div>

                {currentUser ? (
                  <WriteAnswer
                    questionId={question.question_id}
                    onPublished={handleAnswerPublished}
                  />
                ) : (
                  <div
                    style={{
                      marginTop: 20,
                      padding: 16,
                      background: "var(--primary-xlight)",
                      borderRadius: "var(--radius-sm)",
                      textAlign: "center",
                    }}
                  >
                    <p
                      style={{
                        color: "var(--primary)",
                        fontWeight: 600,
                        fontSize: "0.92rem",
                      }}
                    >
                      <button
                        type="button"
                        onClick={onSignIn}
                        style={{
                          cursor: "pointer",
                          textDecoration: "underline",
                          background: "none",
                          border: "none",
                          color: "var(--primary)",
                          fontWeight: 600,
                        }}
                      >
                        Sign in
                      </button>{" "}
                      to write and publish your answer.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
