import { NextResponse } from "next/server";

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

  const { data, error } = await supabase
    .from("insights")
    .select("insight_id,user_id,answer_id,title,insight,created_at")
    .eq("answer_id", answerId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }

  const rows = (data || []) as InsightRow[];
  const profileMap = await getProfileMap(
    supabase,
    rows.map((row) => row.user_id).filter(Boolean)
  );

  return NextResponse.json({
    ok: true,
    insights: rows.map((row) => {
      const profile = profileMap.get(row.user_id);
      const authorName = getAuthorName(profile, user, row.user_id);

      return {
        insightId: row.insight_id,
        title: row.title || "Insight",
        insight: row.insight || "",
        updatedAt: row.created_at || "",
        canEdit: Boolean(user?.id && user.id === row.user_id),
        authorName,
        authorImage: sanitizeText(profile?.profile_image),
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

  const { data: answer, error: answerError } = await supabase
    .from("student_answers")
    .select("answer_id")
    .eq("answer_id", answerId)
    .maybeSingle();

  if (answerError) {
    return NextResponse.json(
      { ok: false, error: answerError.message },
      { status: 500 }
    );
  }

  if (!answer) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Insights can only be added to saved student answers. Save this answer first, then publish an insight.",
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

function sanitizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getAuthorName(
  profile: UserProfileRow | undefined,
  currentUser: CurrentUser | null,
  authorId: string
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
