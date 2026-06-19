"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import type { Comment } from "@/types";

interface CommentSectionProps {
  answerId: string;
  open: boolean;
  onSignIn: () => void;
}

export default function CommentSection({
  answerId,
  open,
  onSignIn,
}: CommentSectionProps) {
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState("");
  const [posting, setPosting] = useState(false);

  const loadComments = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    try {
      const { data, error } = await supabase
        .from("comments")
        .select("*, users(full_name, profile_image)")
        .eq("answer_id", answerId)
        .order("created_at");
      if (error) throw error;
      setComments(data || []);
    } catch {
      setComments([]);
    } finally {
      setLoading(false);
    }
  }, [answerId]);

  useEffect(() => {
    if (open && comments === null) {
      const timer = window.setTimeout(() => {
        loadComments();
      }, 0);

      return () => window.clearTimeout(timer);
    }
  }, [open, comments, loadComments]);

  async function postComment() {
    if (!currentUser) {
      onSignIn();
      return;
    }
    const trimmed = text.trim();
    if (!trimmed) return;

    setPosting(true);
    const supabase = createClient();
    try {
      const { error } = await supabase.from("comments").insert({
        user_id: currentUser.id,
        answer_id: answerId,
        comment: trimmed,
      });
      if (error) throw error;
      setText("");
      await loadComments();
      showToast("Comment posted! 💬", "success");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Error";
      showToast(`Error: ${message}`, "error");
    } finally {
      setPosting(false);
    }
  }

  return (
    <div
      className={`comments-section${open ? " open" : ""}`}
      id={`comments-${answerId}`}
    >
      <div id={`comments-list-${answerId}`}>
        {loading ? (
          <div className="spinner-wrap" style={{ padding: 12 }}>
            <div className="spinner" style={{ width: 24, height: 24 }} />
          </div>
        ) : comments && comments.length > 0 ? (
          comments.map((c) => {
            const name = c.users?.full_name || "Anonymous";
            const initial = name[0].toUpperCase();
            const img = c.users?.profile_image;
            return (
              <div key={c.comment_id} className="comment-item">
                {img ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={img}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      flexShrink: 0,
                    }}
                    alt={name}
                  />
                ) : (
                  <div className="comment-author-avatar">{initial}</div>
                )}
                <div className="comment-bubble">
                  <div className="comment-author-name">{name}</div>
                  <div className="comment-text">{c.comment}</div>
                </div>
              </div>
            );
          })
        ) : (
          open && (
            <p
              style={{
                fontSize: "0.82rem",
                color: "var(--text-muted)",
                marginBottom: 8,
              }}
            >
              No comments yet. Be first!
            </p>
          )
        )}
      </div>
      {currentUser ? (
        <div className="comment-input-row">
          <textarea
            className="comment-input"
            id={`comment-input-${answerId}`}
            placeholder="Write a comment…"
            rows={1}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <button
            className="btn btn-primary btn-sm"
            onClick={postComment}
            disabled={posting}
          >
            Post
          </button>
        </div>
      ) : (
        open && (
          <p
            style={{
              fontSize: "0.82rem",
              color: "var(--text-muted)",
              marginTop: 8,
            }}
          >
            <button
              type="button"
              onClick={onSignIn}
              style={{
                color: "var(--primary)",
                cursor: "pointer",
                background: "none",
                border: "none",
              }}
            >
              Sign in
            </button>{" "}
            to comment.
          </p>
        )
      )}
    </div>
  );
}
