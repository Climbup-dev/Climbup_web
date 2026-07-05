"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import MarkdownBlock from "./MarkdownBlock";
import ImageBlock from "./ImageBlock";
import TableBlock from "./TableBlock";
import StepsBlock from "./StepsBlock";
import CodeBlock from "./CodeBlock";
import MermaidBlock from "./MermaidBlock";

export default function AnswerRenderer({ data }: { data: any }) {
  if (!data) return null;

  const normalized = normalizeAnswerData(data);
  const question = normalized.question;
  const blocks = normalized.blocks;

  return (
    <div className="answer-container">
      <div className="question-header">
        <div className="question-label">Question</div>
        <h1>{question}</h1>
      </div>

      <div className="answer-content">
        {blocks.map((block: any, index: number) => renderBlock(block, index))}
      </div>
    </div>
  );
}

function renderBlock(block: any, index: number) {
  if (!block || typeof block !== "object") {
    return null;
  }

  const key = block.id || `${block.type || "block"}-${index}`;

  switch (block.type) {
    case "markdown":
      return <MarkdownBlock key={key} block={block} />;

    case "image":
      return <ImageBlock key={key} block={block} />;

    case "table":
      return <TableBlock key={key} block={block} />;

    case "steps":
      return <StepsBlock key={key} block={block} />;

    case "code":
      return <CodeBlock key={key} block={block} />;

    case "mermaid":
      return <MermaidBlock key={key} block={block} />;

    default:
      return (
        <div key={key} className="unknown-block">
          Unsupported block type: {block.type || "unknown"}
        </div>
      );
  }
}

function normalizeAnswerData(data: any) {
  // New backend format: data.answer.blocks[]
  if (
    data?.answer &&
    typeof data.answer === "object" &&
    Array.isArray(data.answer.blocks)
  ) {
    return {
      question:
        data.answer.question ||
        data.question ||
        "Question unavailable",
      blocks: data.answer.blocks,
    };
  }

  // Standard format: data.answer.answer[]
  if (
    data?.answer &&
    typeof data.answer === "object" &&
    Array.isArray(data.answer.answer)
  ) {
    return {
      question:
        data.answer.question ||
        data.question ||
        "Question unavailable",
      blocks: data.answer.answer,
    };
  }

  // Direct array at root: data.question + data.answer[]
  if (data?.question && Array.isArray(data?.answer)) {
    return {
      question: data.question,
      blocks: data.answer,
    };
  }

  // Direct blocks at root: data.question + data.blocks[]
  if (data?.question && Array.isArray(data?.blocks)) {
    return {
      question: data.question,
      blocks: data.blocks,
    };
  }

  return {
    question:
      data?.answer?.question ||
      data?.question ||
      "Question unavailable",
    blocks: [],
  };
}
