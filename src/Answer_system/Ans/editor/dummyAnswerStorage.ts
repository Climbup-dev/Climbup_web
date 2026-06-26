"use client";

import type { AnswerEditorSnapshot } from "./answerSnapshot";

const STORAGE_KEY = "climbup:answer-editor:dummy-snapshot";

export async function saveDummyAnswerSnapshot(snapshot: AnswerEditorSnapshot) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot, null, 2));
  }

  const response = await fetch("/api/answer-editor-dummy", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(snapshot),
  });

  if (!response.ok) {
    throw new Error("Dummy answer snapshot could not be saved.");
  }
}
