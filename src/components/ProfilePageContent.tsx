"use client";
"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import Navbar from "@/components/Navbar";
import { useAuth } from "@/hooks/useAuth";
import { createClient } from "@/lib/supabase/client";
import { getCache, setCache, clearCache } from "@/lib/cache";
import "@/styles/Profile.css";

type EntryMode = "login" | "register";

type University = {
  university_id: string;
  university_name: string;
};

type Branch = {
  branch_id: string;
  university_id: string | null;
  branch_name: string;
  branch_code: string | null;
};

type UserProfile = {
  university_id: string | null;
  branch_id: string | null;
  semester: number | null;
};

type ProfileStats = {
  publishedAnswers: number;
  totalLikes: number;
  totalInsights: number;
};

type PublishedAnswer = {
  answer_id: string;
  answer_content: string;
  likes_count: number;
  views_count: number;
  verification_score: number;
  published_at: string | null;
  created_at: string;
  questions: {
    question_text: string;
    marks: number;
    difficulty: string;
  } | null;
};

type PublishedAnswerDisplay = {
  question: string;
  preview: string;
  blockLabels: string[];
};

const AuthModal = dynamic(() => import("@/components/AuthModal"), {
  ssr: false,
  loading: () => null,
});

function formatAccountDate(value?: string | null) {
  if (!value) return "Not available";
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

function getInitials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "U"
  );
}

function getPublishedAnswerDisplay(answer: PublishedAnswer): PublishedAnswerDisplay {
  const parsed = parseAnswerSnapshot(answer.answer_content);

  return {
    question:
      cleanText(answer.questions?.question_text) ||
      parsed.question ||
      "Question not available",
    preview: parsed.preview || getPlainAnswerPreview(answer.answer_content),
    blockLabels: parsed.blockLabels,
  };
}

function parseAnswerSnapshot(content: string): PublishedAnswerDisplay {
  const parsed = parseJson(content);
  const root = asRecord(parsed);
  const answer = asRecord(root?.answer);
  const blocks = asArray(answer?.blocks) || asArray(root?.blocks) || [];
  const blockLabels = getBlockLabels(blocks);
  const preview = blocks
    .map((block) => getBlockPreview(block))
    .filter(Boolean)
    .join(" ");

  return {
    question:
      cleanText(root?.question) ||
      cleanText(answer?.question) ||
      "",
    preview: trimPreview(preview),
    blockLabels,
  };
}

function parseJson(content: string): unknown {
  try {
    return JSON.parse(content);
  } catch {
    return null;
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asArray(value: unknown): unknown[] | null {
  return Array.isArray(value) ? value : null;
}

function getBlockPreview(block: unknown) {
  const record = asRecord(block);
  if (!record) return "";

  const type = cleanText(record.type);

  if (type === "steps") {
    return (asArray(record.items) || asArray(record.steps) || [])
      .map((item) => {
        const step = asRecord(item);
        return step
          ? `${cleanText(step.title)} ${cleanText(step.content) || cleanText(step.text)}`
          : cleanText(item);
      })
      .join(" ");
  }

  if (type === "table") {
    const columns = (asArray(record.columns) || []).map(cleanText).join(" ");
    const rows = (asArray(record.rows) || [])
      .flatMap((row) => (Array.isArray(row) ? row : []))
      .map(cleanText)
      .join(" ");
    return `${cleanText(record.title)} ${columns} ${rows}`;
  }

  if (type === "image") {
    return (
      cleanText(record.caption) ||
      cleanText(record.alt) ||
      cleanText(record.title) ||
      cleanText(record.search_query)
    );
  }

  return (
    cleanText(record.content) ||
    cleanText(record.text) ||
    cleanText(record.description) ||
    cleanText(record.title)
  );
}

function getBlockLabels(blocks: unknown[]) {
  const labels = blocks
    .map((block) => {
      const type = cleanText(asRecord(block)?.type);
      const labelsByType: Record<string, string> = {
        markdown: "Text",
        image: "Image",
        table: "Table",
        steps: "Steps",
        code: "Code",
        mermaid: "Diagram",
      };

      return labelsByType[type] || "";
    })
    .filter(Boolean);

  return Array.from(new Set(labels)).slice(0, 4);
}

function getPlainAnswerPreview(content: string) {
  const parsed = parseJson(content);
  if (parsed && typeof parsed === "object") return "Answer preview not available.";
  return trimPreview(content);
}

function cleanText(value: unknown) {
  if (typeof value !== "string" && typeof value !== "number") return "";

  return String(value)
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/https?:\/\/\S+|www\.\S+/gi, "")
    .replace(/[#*_`~=|>{}[\]()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function trimPreview(value: string) {
  const clean = cleanText(value);
  if (!clean) return "Answer preview not available.";
  return clean.length > 170 ? `${clean.slice(0, 170)}...` : clean;
}


export default function ProfilePageContent() {
  const { currentUser, profileImage, loading, passwordRecovery } = useAuth();
  const supabase = useMemo(() => createClient(), []);

  const [authOpen, setAuthOpen] = useState(false);
  const [entryMode, setEntryMode] = useState<EntryMode>("login");
  const [avatarError, setAvatarError] = useState(false);

  const [universities, setUniversities] = useState<University[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);

  const [profile, setProfile] = useState<UserProfile>({
    university_id: null,
    branch_id: null,
    semester: null,
  });

  const [stats, setStats] = useState<ProfileStats>({
    publishedAnswers: 0,
    totalLikes: 0,
    totalInsights: 0,
  });

  const [publishedAnswers, setPublishedAnswers] = useState<PublishedAnswer[]>([]);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");

  const displayName =
    currentUser?.user_metadata?.full_name ||
    currentUser?.user_metadata?.name ||
    currentUser?.email?.split("@")[0] ||
    "ClimbUP member";

  const filteredBranches = branches.filter(
    (branch) => branch.university_id === profile.university_id
  );

  const selectedUniversity = universities.find(
    (u) => u.university_id === profile.university_id
  );

  const selectedBranch = branches.find((b) => b.branch_id === profile.branch_id);

  const openAuth = (mode: EntryMode) => {
    setEntryMode(mode);
    setAuthOpen(true);
  };

  useEffect(() => {
    async function loadInitialData() {
      if (!currentUser || !supabase) return;

      const cacheKey = `profile_initial_${currentUser.id}`;
      const cached = getCache<{ universities: University[]; profile: UserProfile }>(cacheKey);
      if (cached) {
        setUniversities(cached.universities);
        setProfile(cached.profile);
        return;
      }

      setProfileLoading(true);
      setProfileMessage("");

      const [universitiesResult, profileResult] = await Promise.all([
        supabase
          .from("universities")
          .select("university_id, university_name")
          .order("university_name", { ascending: true }),

        supabase
          .from("users")
          .select("university_id, branch_id, semester")
          .eq("user_id", currentUser.id)
          .maybeSingle(),
      ]);

      if (universitiesResult.error) {
        setProfileMessage(universitiesResult.error.message);
      } else {
        setUniversities(universitiesResult.data || []);
      }

      if (profileResult.error) {
        setProfileMessage(profileResult.error.message);
      } else if (profileResult.data) {
        const newProfile = {
          university_id: profileResult.data.university_id,
          branch_id: profileResult.data.branch_id,
          semester: profileResult.data.semester,
        };
        setProfile(newProfile);

        if (!universitiesResult.error) {
          setCache(cacheKey, {
            universities: universitiesResult.data || [],
            profile: newProfile,
          });
        }
      }

      setProfileLoading(false);
    }

    loadInitialData();
  }, [currentUser, supabase]);

  useEffect(() => {
    async function loadBranches() {
      if (!supabase || !profile.university_id) {
        setBranches([]);
        return;
      }

      const cacheKey = `profile_branches_${profile.university_id}`;
      const cached = getCache<Branch[]>(cacheKey);
      if (cached) {
        setBranches(cached);
        return;
      }

      const { data, error } = await supabase
        .from("branches")
        .select("branch_id, university_id, branch_name, branch_code")
        .eq("university_id", profile.university_id)
        .order("branch_name", { ascending: true });

      if (error) {
        setProfileMessage(error.message);
        return;
      }

      setBranches(data || []);
      if (data) setCache(cacheKey, data);
    }

    loadBranches();
  }, [profile.university_id, supabase]);

  useEffect(() => {
    async function loadProfileActivity() {
      if (!currentUser || !supabase) return;

      const cacheKey = `profile_activity_${currentUser.id}`;
      const cached = getCache<{ answers: any; stats: ProfileStats }>(cacheKey);
      if (cached) {
        setPublishedAnswers(cached.answers);
        setStats(cached.stats);
        return;
      }

      const { data, error } = await supabase
        .from("student_answers")
        .select(`
          answer_id,
          answer_content,
          likes_count,
          views_count,
          verification_score,
          published_at,
          created_at,
          questions (
            question_text,
            marks,
            difficulty
          )
        `)
        .eq("user_id", currentUser.id)
        .eq("status", "published")
        .order("published_at", { ascending: false });

      if (error) {
        setProfileMessage(error.message);
        return;
      }

      const answers = (data || []) as PublishedAnswer[];
      const displayAnswers = answers.map((answer) => {
        const display = getPublishedAnswerDisplay(answer);
        const question = answer.questions
          ? {
              ...answer.questions,
              question_text:
                cleanText(answer.questions.question_text) || display.question,
            }
          : {
              question_text: display.question,
              marks: 0,
              difficulty: "Published",
            };

        return {
          ...answer,
          answer_content: display.preview,
          questions: question,
        };
      });

      const { count: insightsCount } = await supabase
        .from("insights")
        .select("insight_id", { count: "exact", head: true })
        .eq("user_id", currentUser.id);

      setPublishedAnswers(displayAnswers as any);
      const newStats = {
        publishedAnswers: answers.length,
        totalLikes: answers.reduce((sum, a) => sum + Number(a.likes_count || 0), 0),
        totalInsights: insightsCount || 0,
      };
      setStats(newStats);
      setCache(cacheKey, { answers: displayAnswers, stats: newStats });
    }

    loadProfileActivity();
  }, [currentUser, supabase]);

  const saveProfile = async () => {
    if (!currentUser || !supabase) return;

    if (!profile.university_id || !profile.branch_id || !profile.semester) {
      setProfileMessage("Please select university, branch and semester.");
      return;
    }

    setProfileSaving(true);
    setProfileMessage("");

    const { error } = await supabase.from("users").upsert(
      {
        user_id: currentUser.id,
        full_name: displayName,
        email: currentUser.email || "",
        profile_image: profileImage || null,
        university_id: profile.university_id,
        branch_id: profile.branch_id,
        semester: profile.semester,
      },
      { onConflict: "user_id" }
    );

    if (!error) {
      clearCache(`profile_initial_${currentUser.id}`);
      clearCache(`pyqs_profile_${currentUser.id}`);
    }

    setProfileMessage(error ? error.message : "Profile updated successfully.");
    setProfileSaving(false);
  };

  return (
    <main className="profilePage">
      <Navbar onLogin={() => openAuth("login")} onSignUp={() => openAuth("register")} />

      <section className="profileShell">
        {loading ? (
          <div className="profileState">
            <span className="profileLoader" />
            <h1>Loading your profile</h1>
            <p>Restoring your secure session...</p>
          </div>
        ) : !currentUser ? (
          <div className="profileState">
            <span className="profileStateIcon">◎</span>
            <h1>Sign in to view your profile</h1>
            <p>Your account details stay private and secure.</p>
            <button type="button" onClick={() => openAuth("login")}>
              Log in securely
            </button>
          </div>
        ) : (
          <div className="profileCard">
            <div className="profileCover" />

            <div className="profileMain">
              <div className="profileAvatarLarge">
                {profileImage && !avatarError ? (
                  <Image
                    src={profileImage}
                    alt={`${displayName}'s profile`}
                    width={132}
                    height={132}
                    priority
                    onError={() => setAvatarError(true)}
                  />
                ) : (
                  <span>{getInitials(displayName)}</span>
                )}
              </div>

              <div className="profileHeading">
                <span className="profileVerified">✓ Authenticated account</span>
                <h1>{displayName}</h1>
                <p>{currentUser.email}</p>
              </div>

              <Link className="profileHomeLink" href="/" prefetch={false}>
                ← Back to home
              </Link>
            </div>

            <div className="profileStatsGrid">
              <article><span>Published answers</span><strong>{stats.publishedAnswers}</strong></article>
              <article><span>Total likes</span><strong>{stats.totalLikes}</strong></article>
              <article><span>Total insights</span><strong>{stats.totalInsights}</strong></article>
            </div>

            <div className="profileDetails">
              <article><span>Full name</span><strong>{displayName}</strong></article>
              <article><span>Email address</span><strong>{currentUser.email || "Not available"}</strong></article>
              <article><span>University</span><strong>{selectedUniversity?.university_name || "Not selected"}</strong></article>
              <article><span>Branch</span><strong>{selectedBranch?.branch_name || "Not selected"}</strong></article>
              <article><span>Semester</span><strong>{profile.semester ? `Semester ${profile.semester}` : "Not selected"}</strong></article>
              <article><span>Member since</span><strong>{formatAccountDate(currentUser.created_at)}</strong></article>
            </div>

            <div className="profileAnswersBox">
              <div className="profileSectionHeading">
                <div>
                  <span>Contribution history</span>
                  <h2>Published Answers</h2>
                </div>
                <strong>{publishedAnswers.length} answers</strong>
              </div>

              {publishedAnswers.length === 0 ? (
                <div className="profileEmptyAnswers">
                  <h3>No published answers yet</h3>
                  <p>Once you publish answers, they will appear here with likes, views and verification score.</p>
                </div>
              ) : (
                <div className="profileAnswerList">
                  {publishedAnswers.map((answer) => (
                    <article key={answer.answer_id} className="profileAnswerItem">
                      <div className="profileAnswerTop">
                        <span>{answer.questions?.difficulty || "Question"} • {answer.questions?.marks || 0} marks</span>
                        <strong>Score {Number(answer.verification_score || 0)}%</strong>
                      </div>

                      <h3>{answer.questions?.question_text || "Question not available"}</h3>

                      <p>
                        {answer.answer_content.length > 180
                          ? `${answer.answer_content.slice(0, 180)}...`
                          : answer.answer_content}
                      </p>

                      <div className="profileAnswerMeta">
                        <span>👍 {answer.likes_count || 0} likes</span>
                        <span>Published {formatAccountDate(answer.published_at || answer.created_at)}</span>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>
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
