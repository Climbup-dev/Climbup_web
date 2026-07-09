import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";

import { createRouteHandlerClient } from "@/lib/supabase/server";

type SaveStudentAnswerBody = {
  questionId?: string;
  answerJson?: unknown;
  publish?: boolean;
};

type StudentAnswerSaveResult = {
  answer_id: string;
  status: string | null;
  published_at: string | null;
  updated_at: string | null;
};

export async function POST(request: Request) {
  const response = NextResponse.json({ ok: true });
  const supabase = createRouteHandlerClient(request, response);

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json(
      { ok: false, error: "Please login to save this answer." },
      { status: 401 }
    );
  }

  let body: SaveStudentAnswerBody;

  try {
    body = (await request.json()) as SaveStudentAnswerBody;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid answer payload." },
      { status: 400 }
    );
  }

  if (!body.questionId || !body.answerJson) {
    return NextResponse.json(
      { ok: false, error: "Question and answer are required." },
      { status: 400 }
    );
  }

  const status = body.publish ? "published" : "draft";
  const now = new Date().toISOString();
  const answerContent = JSON.stringify(body.answerJson);

  await syncUserProfile(supabase, user);

  const payload: Record<string, unknown> = {
    user_id: user.id,
    question_id: body.questionId,
    answer_content: answerContent,
    status,
    updated_at: now,
  };

  if (body.publish) {
    payload.published_at = now;
  }

  const { data, error } = await supabase
    .from("student_answers")
    .upsert(payload, { onConflict: "user_id,question_id" })
    .select("answer_id,status,published_at,updated_at")
    .single();

  if (error) {
    if (isMissingConflictConstraintError(error.message)) {
      const fallback = await saveWithoutConflictConstraint(
        supabase,
        user.id,
        body.questionId,
        payload
      );

      if (fallback.error) {
        return NextResponse.json(
          { ok: false, error: fallback.error },
          { status: 500 }
        );
      }

      return NextResponse.json({ ok: true, answer: fallback.data });
    }

    return NextResponse.json(
      { ok: false, error: "An unexpected error occurred while saving your answer. Please try again." },
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

function isMissingConflictConstraintError(message: string) {
  return /unique|exclusion|constraint|on conflict/i.test(message);
}

async function saveWithoutConflictConstraint(
  supabase: ReturnType<typeof createRouteHandlerClient>,
  userId: string,
  questionId: string,
  payload: Record<string, unknown>
): Promise<{ data: StudentAnswerSaveResult | null; error: string | null }> {
  const { data: existing, error: lookupError } = await supabase
    .from("student_answers")
    .select("answer_id")
    .eq("user_id", userId)
    .eq("question_id", questionId)
    .maybeSingle();

  if (lookupError) {
    return { data: null, error: lookupError.message };
  }

  if (existing?.answer_id) {
    const { data, error } = await supabase
      .from("student_answers")
      .update(payload)
      .eq("answer_id", existing.answer_id)
      .eq("user_id", userId)
      .select("answer_id,status,published_at,updated_at")
      .single();

    return { data, error: error?.message || null };
  }

  const { data, error } = await supabase
    .from("student_answers")
    .insert(payload)
    .select("answer_id,status,published_at,updated_at")
    .single();

  return { data, error: error?.message || null };
}
