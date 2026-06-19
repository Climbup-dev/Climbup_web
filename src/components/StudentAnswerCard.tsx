"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { formatDate } from "@/lib/utils";
import type { StudentAnswer } from "@/types";
import CommentSection from "./CommentSection";

interface StudentAnswerCardProps {
  answer: StudentAnswer;
  isLiked: boolean;
  onLikeChange: (answerId: string, liked: boolean, count: number) => void;
  onSignIn: () => void;
}

export default function StudentAnswerCard({
  answer,
  isLiked,
  onLikeChange,
  onSignIn,
}: StudentAnswerCardProps) {
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const [liked, setLiked] = useState(isLiked);
  const [likeCount, setLikeCount] = useState(answer.likes_count || 0);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const author = answer.users;
  const name = author?.full_name || "Anonymous";
  const img = author?.profile_image;
  const initial = name[0].toUpperCase();

  async function toggleLike() {
    if (!currentUser) {
      onSignIn();
      return;
    }

    setBusy(true);
    const supabase = createClient();

    try {
      if (liked) {
        await supabase
          .from("likes")
          .delete()
          .eq("user_id", currentUser.id)
          .eq("answer_id", answer.answer_id);
        const newCount = Math.max(0, likeCount - 1);
        await supabase
          .from("student_answers")
          .update({ likes_count: newCount })
          .eq("answer_id", answer.answer_id);
        setLiked(false);
        setLikeCount(newCount);
        onLikeChange(answer.answer_id, false, newCount);
      } else {
        await supabase.from("likes").insert({
          user_id: currentUser.id,
          answer_id: answer.answer_id,
        });
        const newCount = likeCount + 1;
        await supabase
          .from("student_answers")
          .update({ likes_count: newCount })
          .eq("answer_id", answer.answer_id);
        setLiked(true);
        setLikeCount(newCount);
        onLikeChange(answer.answer_id, true, newCount);
        showToast("Liked! ❤️", "success");
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Error";
      showToast(`Error: ${message}`, "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="student-answer-card" id={`sa-${answer.answer_id}`}>
      <div className="answer-author">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img} className="author-avatar" alt={name} />
        ) : (
          <div className="author-avatar-placeholder">{initial}</div>
        )}
        <div className="author-info">
          <div className="author-name">{name}</div>
          <div className="answer-date">
            {formatDate(answer.published_at || answer.created_at)}
          </div>
        </div>
        {answer.verification_score != null && (
          <span className="badge badge-success">
            ✓ {answer.verification_score}%
          </span>
        )}
      </div>
      <div className="answer-content">{answer.answer_content}</div>
      <div className="answer-actions">
        <button
          className={`like-btn${liked ? " liked" : ""}`}
          id={`like-btn-${answer.answer_id}`}
          onClick={toggleLike}
          disabled={busy}
        >
          <span className="heart">{liked ? "❤️" : "🤍"}</span>
          <span id={`like-count-${answer.answer_id}`}>{likeCount}</span>
        </button>
        <span className="answer-stat">👁 {answer.views_count || 0}</span>
        <button
          className="comment-toggle-btn"
          onClick={() => setCommentsOpen(!commentsOpen)}
        >
          💬 Comments
        </button>
      </div>
      <CommentSection
        answerId={answer.answer_id}
        open={commentsOpen}
        onSignIn={onSignIn}
      />
    </div>
  );
}
