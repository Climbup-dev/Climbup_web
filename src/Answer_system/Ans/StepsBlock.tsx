"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { renderMarkdown } from "./MarkdownBlock";

export default function StepsBlock({ block }: { block: any }) {
  const title = block?.title || "Steps";
  const items = normalizeSteps(block?.items || block?.steps || []);

  return (
    <div className="block steps-block">
      <h2 className="block-title">{title}</h2>

      {items.length === 0 ? (
        <p className="block-content-placeholder">No steps available.</p>
      ) : (
        <div className="steps-timeline">
          {items.map((item: any, index: number) => (
            <div className="step-card" key={index}>
              <div className="step-badge">{index + 1}</div>

              <div className="step-body">
                {item.title && <h3 className="step-title">{item.title}</h3>}

                <div className="step-content">
                  {renderMarkdown(String(item.content || ""))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function normalizeSteps(items: any[]) {
  if (!Array.isArray(items)) return [];

  return items.map((item: any) => {
    if (typeof item === "string") {
      return {
        content: cleanStepText(fixMathSyntax(item)),
      };
    }

    return {
      ...item,
      content: cleanStepText(
        fixMathSyntax(item.content || item.text || item.description || "")
      ),
    };
  });
}

function fixMathSyntax(text: any) {
  if (typeof text !== "string") return "";

  return text
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/\u2032/g, "'")
    .replace(/\u2033/g, "''")
    .replace(/\\\(/g, "$")
    .replace(/\\\)/g, "$")
    .replace(/\\\[/g, "$$")
    .replace(/\\\]/g, "$$");
}

function cleanStepText(text: any) {
  if (typeof text !== "string") return "";

  return text.replace(/^\d+\.\s*/, "");
}
