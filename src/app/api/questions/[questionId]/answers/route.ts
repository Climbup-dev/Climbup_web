import { NextResponse } from "next/server";

import { createRouteHandlerClient } from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{ questionId: string }>;
};

type AnswerBadge = "DRAFT" | "PUBLISHED" | "AI";

type AnswerCard = {
  id: string;
  source: "ai" | "student";
  badge: AnswerBadge;
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

type UserDisplayFields = {
  full_name?: string | null;
  profile_image?: string | null;
};

type PrivateAnswerRow = {
  answer_id: string;
  answer_content?: unknown;
  status?: string | null;
  created_at?: string | null;
  users?: UserDisplayFields | UserDisplayFields[] | null;
};

type PublicAnswerRow = {
  answer_id: string;
  answer_content?: unknown;
  verification_score?: number | null;
  likes_count?: number | null;
  views_count?: number | null;
  published_at?: string | null;
  full_name?: string | null;
  profile_image?: string | null;
  reputation?: number | null;
};

type CurrentUserDisplay = {
  fullName: string;
  profileImage: string;
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

  let privateAnswer: PrivateAnswerRow | null = null;
  const currentUserDisplay = user ? getCurrentUserDisplay(user) : null;

  if (user) {
    const { data, error } = await supabase
      .from("student_answers")
      .select(`
        answer_id,
        answer_content,
        status,
        created_at,
        users:user_id (
          full_name,
          profile_image
        )
      `)
      .eq("question_id", questionId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    privateAnswer = data as PrivateAnswerRow | null;
  }

  const { data: publicAnswers, error: publicError } = await supabase
    .from("public_answers")
    .select(`
      answer_id,
      answer_content,
      verification_score,
      likes_count,
      views_count,
      published_at,
      full_name,
      profile_image,
      reputation
    `)
    .eq("question_id", questionId);

  if (publicError) {
    return NextResponse.json(
      { ok: false, error: publicError.message },
      { status: 500 }
    );
  }

  const { data: aiAnswer, error: aiError } = await supabase
    .from("ai_answers")
    .select(`
      ai_answer_id,
      answer,
      ai_model,
      created_at
    `)
    .eq("question_id", questionId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (aiError) {
    return NextResponse.json(
      { ok: false, error: aiError.message },
      { status: 500 }
    );
  }

  const privateCards = privateAnswer
    ? [toPrivateAnswerCard(privateAnswer, questionId, currentUserDisplay)]
    : [];
  const privateAnswerId = privateAnswer?.answer_id || "";
  const publicCards = ((publicAnswers || []) as PublicAnswerRow[])
    .filter((answer) => answer.answer_id && answer.answer_id !== privateAnswerId)
    .map((answer) => toPublicAnswerCard(answer, questionId));
  const aiCards = aiAnswer
    ? [toAiAnswerCard(aiAnswer as AiAnswerRow, questionId)]
    : [];

  const cards: AnswerCard[] = [...privateCards, ...publicCards, ...aiCards];

  return NextResponse.json({ ok: true, answers: cards });
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

function toPrivateAnswerCard(
  answer: PrivateAnswerRow,
  questionId: string,
  currentUserDisplay: CurrentUserDisplay | null
): AnswerCard {
  const profile = getRelatedUser(answer.users);
  const authorName = getDisplayName(
    profile?.full_name || currentUserDisplay?.fullName
  );
  const authorImage = getAuthorImage(
    profile?.profile_image,
    currentUserDisplay?.profileImage
  );

  return {
    id: answer.answer_id,
    source: "student",
    badge: normalizeStudentBadge(answer.status),
    preview: getAnswerPreview(answer.answer_content),
    href: buildAnswerHref(questionId, answer.answer_id, "student"),
    authorName,
    authorImage,
    authorInitials: getInitials(authorName),
  };
}

function toPublicAnswerCard(
  answer: PublicAnswerRow,
  questionId: string
): AnswerCard {
  const authorName = getDisplayName(answer.full_name);
  const authorImage = getAuthorImage(answer.profile_image);

  return {
    id: answer.answer_id,
    source: "student",
    badge: "PUBLISHED",
    preview: getAnswerPreview(answer.answer_content),
    href: buildAnswerHref(questionId, answer.answer_id, "student"),
    authorName,
    authorImage,
    authorInitials: getInitials(authorName),
  };
}

function toAiAnswerCard(answer: AiAnswerRow, questionId: string): AnswerCard {
  return {
    id: answer.ai_answer_id,
    source: "ai",
    badge: "AI",
    preview: getAnswerPreview(answer.answer),
    href: buildAnswerHref(questionId, answer.ai_answer_id, "ai"),
    authorName: "ClimbUP AI",
    authorImage: "/images/climbup-ai.png",
    authorInitials: "AI",
  };
}

function getRelatedUser(value: PrivateAnswerRow["users"]) {
  if (Array.isArray(value)) {
    return value[0] || null;
  }

  return value || null;
}

function getCurrentUserDisplay(user: {
  user_metadata?: Record<string, unknown> | null;
}) {
  return {
    fullName:
      sanitizeText(user.user_metadata?.full_name) ||
      sanitizeText(user.user_metadata?.name),
    profileImage:
      sanitizeText(user.user_metadata?.avatar_url) ||
      sanitizeText(user.user_metadata?.picture),
  };
}

function normalizeStudentBadge(status?: string | null): AnswerBadge {
  return sanitizeText(status).toLowerCase() === "published"
    ? "PUBLISHED"
    : "DRAFT";
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

function getAuthorImage(value: unknown, fallback?: string | null) {
  return normalizeImageUrl(sanitizeText(value) || sanitizeText(fallback));
}

function normalizeImageUrl(value: string) {
  const clean = value.trim();

  if (!clean) return "";
  if (/^(https?:|data:image\/|blob:)/i.test(clean)) return clean;
  if (clean.startsWith("//")) return `https:${clean}`;
  if (clean.startsWith("/")) return clean;

  const supabaseUrl = sanitizeText(process.env.NEXT_PUBLIC_SUPABASE_URL).replace(
    /\/$/,
    ""
  );

  if (!supabaseUrl) return clean;

  const storagePath = clean.replace(/^\/+/, "").replace(/^public\//, "");

  if (storagePath.includes("storage/v1/object/")) {
    return `${supabaseUrl}/${storagePath}`;
  }

  if (storagePath.includes("/")) {
    return `${supabaseUrl}/storage/v1/object/public/${storagePath}`;
  }

  return clean;
}

function getDisplayName(value: unknown) {
  return sanitizeText(value) || "Student";
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
