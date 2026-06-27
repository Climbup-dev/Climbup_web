import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";

import { createRouteHandlerClient } from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{ answerId: string }>;
};

type InsightRow = {
  insight_id: string;
  user_id: string;
  answer_id: string;
  title?: string | null;
  insight?: string | null;
  created_at?: string | null;
  users?: UserDisplayFields | UserDisplayFields[] | null;
};

type UserDisplayFields = {
  full_name?: string | null;
  profile_image?: string | null;
};

type CurrentUser = {
  id: string;
  user_metadata?: Record<string, unknown> | null;
};

export async function GET(request: Request, { params }: PageProps) {
  const { answerId } = await params;
  const response = NextResponse.json({ ok: true });
  const supabase = createRouteHandlerClient(request, response);

  if (!answerId) {
    return NextResponse.json(
      { ok: false, error: "Answer id is required." },
      { status: 400 }
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    await syncUserProfile(supabase, user);
  }

  const { data, error } = await supabase
    .from("insights")
    .select(`
      insight_id,
      user_id,
      answer_id,
      title,
      insight,
      created_at,
      users:user_id (
        full_name,
        profile_image
      )
    `)
    .eq("answer_id", answerId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }

  const rows = (data || []) as InsightRow[];

  return NextResponse.json({
    ok: true,
    insights: rows.map((row) => {
      const profile = getRelatedUser(row.users);
      const authorName = getAuthorName(profile, user, row.user_id);
      const authorImage =
        normalizeImageUrl(sanitizeText(profile?.profile_image)) ||
        (user?.id === row.user_id
          ? normalizeImageUrl(getUserMetadataImage(user))
          : "");

      return {
        insightId: row.insight_id,
        title: row.title || "Insight",
        insight: row.insight || "",
        updatedAt: row.created_at || "",
        canEdit: Boolean(user?.id && user.id === row.user_id),
        authorName,
        authorImage,
        authorInitials: getInitials(authorName),
      };
    }),
  });
}

export async function POST(request: Request, { params }: PageProps) {
  const { answerId } = await params;
  const response = NextResponse.json({ ok: true });
  const supabase = createRouteHandlerClient(request, response);

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json(
      { ok: false, error: "Please login to publish an insight." },
      { status: 401 }
    );
  }

  await syncUserProfile(supabase, user);

  const body = (await request.json().catch(() => null)) as {
    title?: string;
    insight?: string;
  } | null;
  const title = sanitizeText(body?.title);
  const insight = sanitizeText(body?.insight);

  if (!answerId || !title || !insight) {
    return NextResponse.json(
      { ok: false, error: "Insight is required." },
      { status: 400 }
    );
  }

  const answerLookup = await getInsightAnswerTarget(
    supabase,
    answerId,
    user.id
  );

  if (answerLookup.error) {
    return NextResponse.json(
      { ok: false, error: answerLookup.error },
      { status: 500 }
    );
  }

  if (!answerLookup.exists) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Insights can only be added to an available answer. Open a saved answer first.",
      },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("insights")
    .insert({
      user_id: user.id,
      answer_id: answerId,
      title,
      insight,
    })
    .select("insight_id,title,insight,created_at")
    .single();

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, insight: data });
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

async function getInsightAnswerTarget(
  supabase: ReturnType<typeof createRouteHandlerClient>,
  answerId: string,
  userId: string
): Promise<{ exists: boolean; error: string | null }> {
  const { data: studentAnswer, error: studentError } = await supabase
    .from("student_answers")
    .select("answer_id")
    .eq("answer_id", answerId)
    .or(`status.eq.published,user_id.eq.${userId}`)
    .maybeSingle();

  if (studentError) {
    return { exists: false, error: studentError.message };
  }

  if (studentAnswer) {
    return { exists: true, error: null };
  }

  const { data: publicAnswer, error: publicError } = await supabase
    .from("public_answers")
    .select("answer_id")
    .eq("answer_id", answerId)
    .maybeSingle();

  if (publicError) {
    return { exists: false, error: publicError.message };
  }

  if (publicAnswer) {
    return { exists: true, error: null };
  }

  const { data: aiAnswer, error: aiError } = await supabase
    .from("ai_answers")
    .select("ai_answer_id")
    .eq("ai_answer_id", answerId)
    .maybeSingle();

  if (aiError) {
    return { exists: false, error: aiError.message };
  }

  return { exists: Boolean(aiAnswer), error: null };
}

function sanitizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getAuthorName(
  profile: UserDisplayFields | undefined | null,
  currentUser: CurrentUser | null,
  authorId: string
) {
  return (
    sanitizeText(profile?.full_name) ||
    (currentUser && currentUser.id === authorId
      ? getUserMetadataName(currentUser)
      : "") ||
    "Student"
  );
}

function getRelatedUser(value: InsightRow["users"]) {
  if (Array.isArray(value)) {
    return value[0] || null;
  }

  return value || null;
}

function getUserMetadataName(user: CurrentUser | null) {
  if (!user) return "";

  return (
    sanitizeText(user.user_metadata?.full_name) ||
    sanitizeText(user.user_metadata?.name)
  );
}

function getUserMetadataImage(user: CurrentUser | null) {
  if (!user) return "";

  return (
    sanitizeText(user.user_metadata?.avatar_url) ||
    sanitizeText(user.user_metadata?.picture)
  );
}

function getEmailName(email?: string | null) {
  const cleanEmail = sanitizeText(email);
  return cleanEmail ? cleanEmail.split("@")[0] : "";
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
