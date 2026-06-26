import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";

import { createRouteHandlerClient } from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{ questionId: string }>;
};

type AnswerCard = {
  id: string;
  source: "ai" | "student";
  label: string;
  status: string;
  meta: string;
  preview: string;
  href: string;
  authorName: string;
  authorImage: string;
  authorInitials: string;
};

type AiAnswerRow = {
  ai_answer_id: string;
  answer: unknown;
  ai_model?: string | null;
  created_at?: string | null;
};

type StudentAnswerRow = {
  answer_id: string;
  answer_content?: string | null;
  status?: string | null;
  updated_at?: string | null;
  published_at?: string | null;
  user_id?: string | null;
};

type UserProfileRow = {
  user_id: string;
  full_name?: string | null;
  email?: string | null;
  profile_image?: string | null;
};

type CurrentUser = {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
};

export async function GET(request: Request, { params }: PageProps) {
  const { questionId } = await params;
  const response = NextResponse.json({ ok: true });
  const supabase = createRouteHandlerClient(request, response);

  if (!questionId) {
    return NextResponse.json(
      { ok: false, error: "Question id is required." },
      { status: 400 }
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    await syncUserProfile(supabase, user);
  }

  const studentVisibility = user
    ? `status.eq.published,user_id.eq.${user.id}`
    : "status.eq.published";

  const { data: studentAnswers, error: studentError } = await supabase
    .from("student_answers")
    .select(`
      answer_id,
      answer_content,
      status,
      updated_at,
      published_at,
      user_id
    `)
    .eq("question_id", questionId)
    .or(studentVisibility)
    .order("updated_at", { ascending: false });

  if (studentError) {
    return NextResponse.json(
      { ok: false, error: studentError.message },
      { status: 500 }
    );
  }

  const studentRows = (studentAnswers || []) as StudentAnswerRow[];
  const profileMap = await getProfileMap(
    supabase,
    studentRows
      .map((answer) => answer.user_id)
      .filter((id): id is string => Boolean(id))
  );

  const { data: aiAnswers, error: aiError } = await supabase
    .from("ai_answers")
    .select(`
      ai_answer_id,
      answer,
      ai_model,
      created_at
    `)
    .eq("question_id", questionId)
    .order("created_at", { ascending: false });

  if (aiError) {
    return NextResponse.json(
      { ok: false, error: aiError.message },
      { status: 500 }
    );
  }

  const studentCards = studentRows.map((answer) => {
    const isOwn = user?.id && answer.user_id === user.id;
    const status = answer.status || "draft";
    const profile = answer.user_id ? profileMap.get(answer.user_id) : null;
    const authorName = getAuthorName(profile, user, answer.user_id);
    const authorImage = sanitizeText(profile?.profile_image);

    return {
      id: answer.answer_id,
      source: "student" as const,
      label: isOwn && status === "draft" ? "Private draft" : "Public answer",
      status,
      meta: `${authorName} - ${formatDate(
        answer.updated_at || answer.published_at
      )}`,
      preview: getAnswerPreview(answer.answer_content),
      href: buildAnswerHref(questionId, answer.answer_id, "student"),
      authorName,
      authorImage,
      authorInitials: getInitials(authorName),
    };
  });

  const aiCards = ((aiAnswers || []) as AiAnswerRow[]).map((answer, index) => ({
    id: answer.ai_answer_id,
    source: "ai" as const,
    label: answer.ai_model || `AI answer ${index + 1}`,
    status: "ai",
    meta: formatDate(answer.created_at),
    preview: getAnswerPreview(answer.answer),
    href: buildAnswerHref(questionId, answer.ai_answer_id, "ai"),
    authorName: "ClimbUP AI",
    authorImage: "",
    authorInitials: "AI",
  }));

  const cards: AnswerCard[] = [...studentCards, ...aiCards];

  return NextResponse.json({ ok: true, answers: cards });
}

async function getProfileMap(
  supabase: ReturnType<typeof createRouteHandlerClient>,
  userIds: string[]
) {
  const uniqueIds = Array.from(new Set(userIds));
  const map = new Map<string, UserProfileRow>();

  if (!uniqueIds.length) return map;

  const { data } = await supabase
    .from("users")
    .select("user_id,full_name,email,profile_image")
    .in("user_id", uniqueIds);

  ((data || []) as UserProfileRow[]).forEach((profile) => {
    map.set(profile.user_id, profile);
  });

  return map;
}

async function syncUserProfile(
  supabase: ReturnType<typeof createRouteHandlerClient>,
  user: User
) {
  const fullName =
    sanitizeText(user.user_metadata?.full_name) ||
    sanitizeText(user.user_metadata?.name) ||
    getEmailName(user.email);

  const profileImage =
    sanitizeText(user.user_metadata?.avatar_url) ||
    sanitizeText(user.user_metadata?.picture) ||
    null;

  await supabase.from("users").upsert(
    {
      user_id: user.id,
      full_name: fullName,
      email: user.email || "",
      profile_image: profileImage,
    },
    { onConflict: "user_id" }
  );
}

function buildAnswerHref(
  questionId: string,
  answerId: string,
  answerSource: AnswerCard["source"]
) {
  const params = new URLSearchParams({
    answerId,
    answerSource,
  });

  return `/question/${questionId}?${params.toString()}`;
}

function formatDate(value?: string | null) {
  if (!value) return "No date";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "No date";
  }

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getAnswerPreview(value: unknown) {
  const text = extractText(value)
    .replace(/[#*_`=$[\]()>-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return text.slice(0, 180) || "Open this answer.";
}

function sanitizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getAuthorName(
  profile: UserProfileRow | undefined | null,
  currentUser: CurrentUser | null,
  authorId?: string | null
) {
  return (
    sanitizeText(profile?.full_name) ||
    (currentUser?.id === authorId ? getUserMetadataName(currentUser) : "") ||
    getEmailName(profile?.email) ||
    (currentUser?.id === authorId ? getEmailName(currentUser.email) : "") ||
    "Student"
  );
}

function getUserMetadataName(user: CurrentUser) {
  return (
    sanitizeText(user.user_metadata?.full_name) ||
    sanitizeText(user.user_metadata?.name)
  );
}

function getEmailName(email?: string | null) {
  const cleanEmail = sanitizeText(email);
  return cleanEmail ? cleanEmail.split("@")[0] : "";
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

function extractText(value: unknown): string {
  if (!value) return "";

  if (typeof value === "string") {
    const parsed = parseJson(value);
    return parsed ? extractText(parsed) : value;
  }

  if (Array.isArray(value)) {
    return value.map(extractText).join(" ");
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const usefulKeys = [
      "title",
      "content",
      "text",
      "description",
      "answer",
      "blocks",
      "items",
      "rows",
    ];

    return usefulKeys.map((key) => extractText(record[key])).join(" ");
  }

  return String(value);
}

function parseJson(value: string): unknown | null {
  const text = value.trim();

  if (!text.startsWith("{") && !text.startsWith("[")) return null;

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
