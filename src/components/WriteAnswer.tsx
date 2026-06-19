"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";

interface WriteAnswerProps {
  questionId: string;
  onPublished: () => void;
}

export default function WriteAnswer({
  questionId,
  onPublished,
}: WriteAnswerProps) {
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  async function submitAnswer() {
    if (!currentUser) return;
    const trimmed = text.trim();
    if (!trimmed) {
      showToast("Please write an answer before submitting.", "error");
      return;
    }

    setBusy(true);
    const supabase = createClient();

    try {
      const { error } = await supabase.from("student_answers").insert({
        user_id: currentUser.id,
        question_id: questionId,
        answer_content: trimmed,
        status: "published",
        likes_count: 0,
        views_count: 0,
        published_at: new Date().toISOString(),
      });
      if (error) throw error;
      setText("");
      onPublished();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Error";
      showToast(`Error: ${message}`, "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="write-answer-section">
      <div className="section-divider">Your Answer</div>
      <div className="write-answer-box">
        <textarea
          id={`write-answer-${questionId}`}
          placeholder="Write your answer here. Be clear and detailed — good answers earn likes and build your reputation!"
          rows={6}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="write-answer-footer">
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setText("")}
            disabled={busy}
          >
            Clear
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={submitAnswer}
            disabled={busy}
          >
            {busy ? "Publishing…" : "Publish Answer"}
          </button>
        </div>
      </div>
    </div>
  );
}
