"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import type { ReactNode } from "react";

export default function MarkdownBlock({ block, content, title }: any) {
  const finalTitle = block?.title || title || "";
  const rawContent =
    block?.content || block?.text || block?.description || content || "";
  const finalContent = fixMathSyntax(String(rawContent));

  if (!finalContent) {
    return (
      <div className="block markdown-block empty">
        {finalTitle && <h3 className="block-title">{finalTitle}</h3>}
        <div className="block-content-placeholder">No content available</div>
      </div>
    );
  }

  return (
    <div className="block markdown-block">
      {finalTitle && <h3 className="block-title">{finalTitle}</h3>}
      <div className="block-content">{renderMarkdown(finalContent)}</div>
    </div>
  );
}

export function renderMarkdown(text: string) {
  const lines = normalizeMarkdownInput(text).split(/\r?\n/);
  const nodes: ReactNode[] = [];
  let listItems: ReactNode[] = [];
  let orderedListItems: ReactNode[] = [];

  const flushLists = () => {
    if (listItems.length) {
      nodes.push(<ul key={`ul-${nodes.length}`}>{listItems}</ul>);
      listItems = [];
    }

    if (orderedListItems.length) {
      nodes.push(<ol key={`ol-${nodes.length}`}>{orderedListItems}</ol>);
      orderedListItems = [];
    }
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    if (!trimmed) {
      flushLists();
      nodes.push(
        <div
          aria-hidden="true"
          className="markdown-line-break"
          key={`line-break-${index}`}
        />
      );
      return;
    }

    if (trimmed.startsWith("### ")) {
      flushLists();
      nodes.push(<h3 key={index}>{renderInline(trimmed.slice(4))}</h3>);
      return;
    }

    if (trimmed.startsWith("## ")) {
      flushLists();
      nodes.push(<h2 key={index}>{renderInline(trimmed.slice(3))}</h2>);
      return;
    }

    if (trimmed.startsWith("# ")) {
      flushLists();
      nodes.push(<h1 key={index}>{renderInline(trimmed.slice(2))}</h1>);
      return;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      orderedListItems = [];
      listItems.push(<li key={index}>{renderInline(trimmed.slice(2))}</li>);
      return;
    }

    const orderedMatch = trimmed.match(/^\d+\.\s+(.+)$/);

    if (orderedMatch) {
      listItems = [];
      orderedListItems.push(
        <li key={index}>{renderInline(orderedMatch[1])}</li>
      );
      return;
    }

    flushLists();
    nodes.push(<p key={index}>{renderInline(trimmed)}</p>);
  });

  flushLists();
  return nodes;
}

function renderInline(text: string) {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*|==[^=]+==|\$[^$]+\$)/g);

  return parts.map((part, index) => {
    if (part.startsWith("`") && part.endsWith("`")) {
      return <code key={index}>{part.slice(1, -1)}</code>;
    }

    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }

    if (part.startsWith("==") && part.endsWith("==")) {
      return <mark key={index}>{part.slice(2, -2)}</mark>;
    }

    if (part.startsWith("$") && part.endsWith("$")) {
      return (
        <span className="inline-math" key={index}>
          {part}
        </span>
      );
    }

    return part;
  });
}

function fixMathSyntax(text: any) {
  if (typeof text !== "string") return "";

  return normalizeMarkdownInput(text)
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/\u2032/g, "'")
    .replace(/\u2033/g, "''")
    .replace(/\\\(/g, "$")
    .replace(/\\\)/g, "$")
    .replace(/\\\[/g, "$$")
    .replace(/\\\]/g, "$$")
    .replace(/\$\s+/g, "$")
    .replace(/\s+\$/g, "$");
}

function normalizeMarkdownInput(text: string) {
  return text
    .replace(/&lt;br\s*\/?&gt;/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>\s*<p>/gi, "\n\n")
    .replace(/<\/?p>/gi, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/\\n/g, "\n")
    .replace(/\r\n/g, "\n")
    .replace(/\n\s*([*-]\s+)/g, "\n$1")
    .trim();
}
