import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const DUMMY_STORE_DIR = path.join(
  process.cwd(),
  "src",
  "Answer_system",
  "dummy_answer_store"
);

export async function POST(request: Request) {
  try {
    const snapshot = await request.json();

    await mkdir(DUMMY_STORE_DIR, { recursive: true });
    await writeFile(
      path.join(DUMMY_STORE_DIR, "latest-answer-editor-snapshot.json"),
      `${JSON.stringify(snapshot, null, 2)}\n`,
      "utf8"
    );

    return NextResponse.json({
      ok: true,
      file: "src/Answer_system/dummy_answer_store/latest-answer-editor-snapshot.json",
    });
  } catch (error) {
    console.error("Failed to save dummy answer snapshot:", error);

    return NextResponse.json(
      { ok: false, error: "Unable to save dummy answer snapshot." },
      { status: 500 }
    );
  }
}
