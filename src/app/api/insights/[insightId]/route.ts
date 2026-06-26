import { NextResponse } from "next/server";

import { createRouteHandlerClient } from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{ insightId: string }>;
};

export async function PATCH(request: Request, { params }: PageProps) {
  const { insightId } = await params;
  const response = NextResponse.json({ ok: true });
  const supabase = createRouteHandlerClient(request, response);

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json(
      { ok: false, error: "Please login to update this insight." },
      { status: 401 }
    );
  }

  const body = (await request.json().catch(() => null)) as {
    title?: string;
    insight?: string;
  } | null;
  const title = sanitizeText(body?.title);
  const insight = sanitizeText(body?.insight);

  if (!insightId || !title || !insight) {
    return NextResponse.json(
      { ok: false, error: "Insight is required." },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("insights")
    .update({
      title,
      insight,
    })
    .eq("insight_id", insightId)
    .eq("user_id", user.id)
    .select("insight_id,title,insight,created_at")
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }

  if (!data) {
    return NextResponse.json(
      { ok: false, error: "Insight not found or you do not have access." },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true, insight: data });
}

export async function DELETE(request: Request, { params }: PageProps) {
  const { insightId } = await params;
  const response = NextResponse.json({ ok: true });
  const supabase = createRouteHandlerClient(request, response);

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json(
      { ok: false, error: "Please login to delete this insight." },
      { status: 401 }
    );
  }

  if (!insightId) {
    return NextResponse.json(
      { ok: false, error: "Insight id is required." },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("insights")
    .delete()
    .eq("insight_id", insightId)
    .eq("user_id", user.id)
    .select("insight_id")
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }

  if (!data) {
    return NextResponse.json(
      { ok: false, error: "Insight not found or you do not have access." },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true });
}

function sanitizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}
