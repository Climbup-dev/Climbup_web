"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState } from "react";

export default function CodeBlock({ block }: { block: any }) {
  const [copied, setCopied] = useState(false);

  const title = block?.title || "Code";
  const language = block?.language || "text";
  const content = block?.content || "";
  const output = block?.output || "";
  const explanation = Array.isArray(block?.explanation)
    ? block.explanation
    : [];

  const handleCopy = async () => {
    try {
      if (typeof navigator === "undefined" || !navigator.clipboard) return;
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="block code-block">
      <div className="code-header">
        <h2 className="block-title">{title}</h2>
        <button className="copy-btn" onClick={handleCopy}>
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      <div className="code-language">{language}</div>

      <pre className="code-box">
        <code>{content}</code>
      </pre>

      {explanation.length > 0 && (
        <div className="code-explanation">
          <h3>Explanation</h3>
          <ul>
            {explanation.map((point: any, index: number) => (
              <li key={index}>{point}</li>
            ))}
          </ul>
        </div>
      )}

      {output && (
        <div className="code-output">
          <h3>Output</h3>
          <pre>{output}</pre>
        </div>
      )}
    </div>
  );
}
