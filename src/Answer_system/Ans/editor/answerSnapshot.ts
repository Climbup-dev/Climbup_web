"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

export type AnswerBlockType =
  | "markdown"
  | "image"
  | "table"
  | "steps"
  | "code"
  | "mermaid";

export type AnswerEditorSnapshot = {
  schema: "climbup.answer-editor.snapshot";
  schemaVersion: 1;
  savedAt: string;
  question: string;
  questionImage?: string;
  visibility: "public" | "private";
  feedback: "like" | "dislike" | null;
  answer: {
    question: string;
    blocks: any[];
  };
  rendererContract: {
    source: "src/Answer_system/Ans/AnswerRenderer.tsx";
    blockTypes: AnswerBlockType[];
    mermaid: {
      inputField: "content";
      renderMode: "client";
      renderer: "src/Answer_system/Ans/MermaidBlock.tsx";
    };
  };
};

type SnapshotInput = {
  question: string;
  questionImage?: string;
  blocks: any[];
  isPublic: boolean;
  feedback: "like" | "dislike" | null;
};

export function createAnswerEditorSnapshot({
  question,
  questionImage,
  blocks,
  isPublic,
  feedback,
}: SnapshotInput): AnswerEditorSnapshot {
  const cleanQuestion = asText(question || "Question unavailable");

  return {
    schema: "climbup.answer-editor.snapshot",
    schemaVersion: 1,
    savedAt: new Date().toISOString(),
    question: cleanQuestion,
    questionImage,
    visibility: isPublic ? "public" : "private",
    feedback,
    answer: {
      question: cleanQuestion,
      blocks: blocks.map((block, index) => normalizeEditableBlock(block, index)),
    },
    rendererContract: {
      source: "src/Answer_system/Ans/AnswerRenderer.tsx",
      blockTypes: ["markdown", "image", "table", "steps", "code", "mermaid"],
      mermaid: {
        inputField: "content",
        renderMode: "client",
        renderer: "src/Answer_system/Ans/MermaidBlock.tsx",
      },
    },
  };
}

function normalizeEditableBlock(block: any, index: number) {
  const type = asBlockType(block?.type);
  const base = {
    id: asText(block?.id || `${type}-${index + 1}`),
    type,
    title: asText(block?.title || ""),
    order: index,
  };

  switch (type) {
    case "image":
      return {
        ...base,
        url: asText(block?.url || block?.src || ""),
        alt: asText(block?.alt || block?.caption || block?.title || ""),
        caption: asText(block?.caption || block?.alt || ""),
        search_query: asText(block?.search_query || ""),
        recommended_websites: asStringArray(block?.recommended_websites),
      };

    case "table": {
      const columns = asStringArray(block?.columns);

      return {
        ...base,
        columns,
        rows: normalizeRows(block?.rows, columns.length),
      };
    }

    case "steps":
      return {
        ...base,
        items: normalizeSteps(block?.items),
      };

    case "code":
      return {
        ...base,
        language: asText(block?.language || "text"),
        content: asText(block?.content || ""),
      };

    case "mermaid":
      return {
        ...base,
        diagram_type: asText(block?.diagram_type || "flowchart"),
        content: asText(block?.content || block?.diagram || ""),
        render: {
          engine: "mermaid",
          inputField: "content",
          output: "diagram",
        },
      };

    case "markdown":
    default:
      return {
        ...base,
        content: asText(block?.content || block?.text || block?.description || ""),
      };
  }
}

function asBlockType(type: any): AnswerBlockType {
  if (
    type === "markdown" ||
    type === "image" ||
    type === "table" ||
    type === "steps" ||
    type === "code" ||
    type === "mermaid"
  ) {
    return type;
  }

  return "markdown";
}

function normalizeRows(rows: any, columnCount: number) {
  if (!Array.isArray(rows)) return [];

  return rows.map((row) => {
    const rowCells = Array.isArray(row) ? row : [];
    const width = Math.max(columnCount, rowCells.length);

    return Array.from({ length: width }, (_, index) => asText(rowCells[index] || ""));
  });
}

function normalizeSteps(items: any) {
  if (!Array.isArray(items)) return [];

  return items.map((item, index) => {
    if (typeof item === "string") {
      return {
        id: `step-${index + 1}`,
        content: item,
      };
    }

    return {
      id: asText(item?.id || `step-${index + 1}`),
      title: asText(item?.title || ""),
      content: asText(item?.content || item?.text || item?.description || ""),
    };
  });
}

function asStringArray(value: any) {
  if (!Array.isArray(value)) return [];

  return value.map((item) => asText(item));
}

function asText(value: any) {
  if (value === null || value === undefined) return "";

  return String(value);
}
