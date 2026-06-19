"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AuthModal from "@/components/AuthModal";
import { useAuth } from "@/hooks/useAuth";
import { createClient } from "@/lib/supabase/client";
import { formatDate, truncate } from "@/lib/utils";
import type { StudentAnswer, User } from "@/types";

function userFromAuth(currentUser: NonNullable<ReturnType<typeof useAuth>["currentUser"]>): User {
  return {
    user_id: currentUser.id,
    full_name:
      currentUser.user_metadata?.full_name ||
      currentUser.user_metadata?.name ||
      currentUser.email ||
      "Anonymous",
    email: currentUser.email || "",
    profile_image: currentUser.user_metadata?.avatar_url || null,
    reputation: 0,
  };
}

export default function ProfilePage() {
  const { currentUser, loading: authLoading } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [userRow, setUserRow] = useState<User | null>(null);
  const [answers, setAnswers] = useState<StudentAnswer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!currentUser) return;

    let cancelled = false;
    const authUser = currentUser;

    async function loadProfile() {
      setLoading(true);
      setError(null);

      const supabase = createClient();

      try {
        const profileUser = userFromAuth(authUser);

        const { data: answerData, error: answersError } = await supabase
          .from("student_answers")
          .select("*, questions(question_text)")
          .eq("user_id", authUser.id)
          .order("created_at", { ascending: false });

        if (!cancelled) {
          setUserRow(profileUser);
          setAnswers(answersError ? [] : answerData || []);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          const message =
            e instanceof Error ? e.message : "Failed to load profile";
          setError(message);
          setUserRow(null);
          setAnswers([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, [authLoading, currentUser]);

  if (authLoading) {
    return (
      <div className="page profile-page-shell">
        <div className="spinner-wrap">
          <div className="spinner" />
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="page profile-page-shell">
        <div className="empty-state">
          <div className="empty-icon">CU</div>
          <h3>Sign in to view your profile</h3>
          <p>Your public profile, answers, likes, and reputation will appear here.</p>
          <button
            className="btn btn-primary"
            style={{ marginTop: 16 }}
            onClick={() => setAuthOpen(true)}
          >
            Sign In
          </button>
        </div>
        <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
      </div>
    );
  }

  const published = answers.filter((a) => a.status === "published").length;
  const totalLikes = answers.reduce((s, a) => s + (a.likes_count || 0), 0);
  const displayName =
    userRow?.full_name ||
    currentUser.user_metadata?.full_name ||
    currentUser.user_metadata?.name ||
    currentUser.email ||
    "Student";
  const displayEmail = userRow?.email || currentUser.email || "";
  const avatarUrl =
    userRow?.profile_image || currentUser.user_metadata?.avatar_url;
  const initial = displayName[0]?.toUpperCase() || "U";

  return (
    <div className="cu-profile-page">
      <section className="cu-profile-hero">
        <div className="cu-profile-hero-inner" id="profile-hero-inner">
          {loading ? (
            <div
              className="spinner"
              style={{
                width: 32,
                height: 32,
                borderColor: "rgba(255,255,255,0.3)",
                borderTopColor: "white",
              }}
            />
          ) : (
            <>
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} className="cu-profile-avatar" alt={displayName} />
              ) : (
                <div className="cu-profile-avatar-fallback">{initial}</div>
              )}
              <div className="cu-profile-main">
                <p className="cu-profile-kicker">Student Profile</p>
                <h1>{displayName}</h1>
                <p>{displayEmail}</p>
                <div className="cu-profile-stats">
                  <div>
                    <strong>{published}</strong>
                    <span>Answers</span>
                  </div>
                  <div>
                    <strong>{totalLikes}</strong>
                    <span>Total Likes</span>
                  </div>
                  <div>
                    <strong>{userRow?.reputation || 0}</strong>
                    <span>Reputation</span>
                  </div>
                </div>
              </div>
              <div className="cu-profile-joined">
                <span>Joined</span>
                <strong>{userRow?.created_at ? formatDate(userRow.created_at) : "Recently"}</strong>
              </div>
            </>
          )}
        </div>
      </section>

      <section className="cu-profile-content" id="profile-content">
        {!loading && !error && (
          <div className="cu-profile-section-heading">
            <h2>Your Activity</h2>
            <p>Answers published from this account will appear here.</p>
          </div>
        )}

        {loading && (
          <div className="spinner-wrap">
            <div className="spinner" />
          </div>
        )}

        {error && (
          <div className="error-banner">Failed to load profile: {error}</div>
        )}

        {!loading && !error && answers.length === 0 && (
          <div className="cu-profile-empty">
            <div className="cu-profile-empty-icon">A</div>
            <h3>No answers yet</h3>
            <p>Start contributing by answering questions in any subject!</p>
            <Link
              href="/subjects"
              className="cu-profile-action"
            >
              Browse Subjects
            </Link>
          </div>
        )}

        {!loading && !error && answers.length > 0 && (
          <>
            <h2 style={{ fontSize: "1.15rem", fontWeight: 700, marginBottom: 20 }}>
              My Answers ({answers.length})
            </h2>
            {answers.map((a) => (
              <div key={a.answer_id} className="cu-profile-answer-card">
                <div className="profile-answer-q">
                  Q: {a.questions?.question_text || "Question unavailable"}
                </div>
                <div className="profile-answer-preview">
                  {truncate(a.answer_content, 200)}
                </div>
                <div className="profile-answer-meta">
                  <span
                    className={`badge ${a.status === "published" ? "badge-success" : "badge-gray"}`}
                  >
                    {a.status}
                  </span>
                  <span className="answer-stat">
                    {a.likes_count || 0} likes
                  </span>
                  <span className="answer-stat">
                    {a.views_count || 0} views
                  </span>
                  <span
                    style={{
                      fontSize: "0.78rem",
                      color: "var(--text-muted)",
                      marginLeft: "auto",
                    }}
                  >
                    {formatDate(a.created_at)}
                  </span>
                </div>
              </div>
            ))}
          </>
        )}
      </section>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  );
}
