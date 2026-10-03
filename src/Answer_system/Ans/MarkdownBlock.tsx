"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import type { ReactNode } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

import MathText from "@/components/MathText";

export default function MarkdownBlock({ block, content, title }: any) {
  const finalTitle = block?.title || title || "";
  let rawContent = block?.content || block?.text || block?.description || content || "";
  
  // Pass content as is
  rawContent = String(rawContent);

  if (!rawContent) {
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
      <div className="block-content">
        <MathText text={rawContent} />
      </div>
    </div>
  );
}


