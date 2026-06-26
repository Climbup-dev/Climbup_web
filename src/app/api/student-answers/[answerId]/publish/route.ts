import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";

import { createRouteHandlerClient } from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{ answerId: string }>;
};

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
      { ok: false, error: "Please login to publish this answer." },
      { status: 401 }
    );
  }

  await syncUserProfile(supabase, user);

  const { data, error } = await supabase
    .from("student_answers")
    .update({
      status: "published",
      published_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("answer_id", answerId)
    .eq("user_id", user.id)
    .select("answer_id,status,published_at,updated_at")
    .single();

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, answer: data });
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

function sanitizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getEmailName(email?: string | null) {
  const cleanEmail = sanitizeText(email);
  return cleanEmail ? cleanEmail.split("@")[0] : "";
}
