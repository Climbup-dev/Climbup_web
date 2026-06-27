"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import Navbar from "@/components/Navbar";
import { useAuth } from "@/hooks/useAuth";
import { createClient } from "@/lib/supabase/client";
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
  totalComments: number;
  totalViews: number;
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

function CustomSelect({
  label,
  value,
  placeholder,
  options,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  disabled?: boolean;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);
  const selected = options.find((item) => item.value === value);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (
        selectRef.current &&
        !selectRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div
      className={`profileSelectField ${open ? "isOpen" : ""}`}
      ref={selectRef}
    >
      <span>{label}</span>

      <button
        type="button"
        className={`profileSelectButton ${open ? "isOpen" : ""}`}
        disabled={disabled}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <strong>{selected?.label || placeholder}</strong>
        <em aria-hidden>{open ? "^" : "v"}</em>
      </button>

      {open && !disabled && (
        <div className="profileSelectMenu">
          <button
            type="button"
            onClick={() => {
              onChange("");
              setOpen(false);
            }}
          >
            {placeholder}
          </button>

          {options.map((item) => (
            <button
              type="button"
              key={item.value}
              className={item.value === value ? "selected" : ""}
              onClick={() => {
                onChange(item.value);
                setOpen(false);
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
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
    totalComments: 0,
    totalViews: 0,
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
        setProfile({
          university_id: profileResult.data.university_id,
          branch_id: profileResult.data.branch_id,
          semester: profileResult.data.semester,
        });
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
    }

    loadBranches();
  }, [profile.university_id, supabase]);

  useEffect(() => {
    async function loadProfileActivity() {
      if (!currentUser || !supabase) return;

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

      setPublishedAnswers(displayAnswers);
      setStats({
        publishedAnswers: answers.length,
        totalLikes: answers.reduce((sum, a) => sum + Number(a.likes_count || 0), 0),
        totalViews: answers.reduce((sum, a) => sum + Number(a.views_count || 0), 0),
        totalComments: 0,
      });
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
              <article><span>Total comments</span><strong>{stats.totalComments}</strong></article>
              <article><span>Total views</span><strong>{stats.totalViews}</strong></article>
            </div>

            <div className="profileSelectorBox">
              <div className="profileSelectorHeader">
                <div>
                  <span>Personalized learning</span>
                  <h2>Academic Profile</h2>
                  <p>Select your university, branch and semester. ClimbUP will show subjects and PYQs according to this profile.</p>
                </div>
              </div>

              <div className="profileFormGrid">
                <CustomSelect
                  label="University"
                  value={profile.university_id || ""}
                  placeholder="Select university"
                  disabled={profileLoading}
                  options={universities.map((u) => ({
                    value: u.university_id,
                    label: u.university_name,
                  }))}
                  onChange={(value) =>
                    setProfile({
                      university_id: value || null,
                      branch_id: null,
                      semester: profile.semester,
                    })
                  }
                />

                <CustomSelect
                  label="Branch"
                  value={profile.branch_id || ""}
                  placeholder="Select branch"
                  disabled={!profile.university_id || profileLoading}
                  options={filteredBranches.map((b) => ({
                    value: b.branch_id,
                    label: `${b.branch_name}${b.branch_code ? ` (${b.branch_code})` : ""}`,
                  }))}
                  onChange={(value) =>
                    setProfile((current) => ({
                      ...current,
                      branch_id: value || null,
                    }))
                  }
                />

                <CustomSelect
                  label="Semester"
                  value={profile.semester ? String(profile.semester) : ""}
                  placeholder="Select semester"
                  disabled={profileLoading}
                  options={[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => ({
                    value: String(sem),
                    label: `Semester ${sem}`,
                  }))}
                  onChange={(value) =>
                    setProfile((current) => ({
                      ...current,
                      semester: value ? Number(value) : null,
                    }))
                  }
                />
              </div>

              <div className="profileFormActions">
                <button
                  type="button"
                  className="profileSaveButton"
                  disabled={profileSaving || profileLoading}
                  onClick={saveProfile}
                >
                  {profileSaving ? "Saving..." : "Save academic profile"}
                </button>

                {profileMessage && (
                  <p className="profileMessage">{profileMessage}</p>
                )}
              </div>
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
                        <span>👁 {answer.views_count || 0} views</span>
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
