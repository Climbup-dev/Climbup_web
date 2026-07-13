"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import type { AnswerEditorSnapshot } from "./answerSnapshot";

type PdfGenerationOptions = {
  targetWindow?: Window | null;
};

const accentColors = [
  "#0f766e",
  "#2563eb",
  "#9333ea",
  "#ea580c",
  "#dc2626",
  "#0891b2",
];

export async function generateAnswerPdfDocument(
  snapshot: AnswerEditorSnapshot,
  options: PdfGenerationOptions = {}
) {
  if (typeof window === "undefined") return;

  const printWindow =
    options.targetWindow || window.open("about:blank", "climbup-answer-pdf");

  if (!printWindow) {
    throw new Error("The PDF window was blocked. Allow popups and try again.");
  }

  const html = buildPdfHtml(snapshot, `${window.location.origin}/logo.png`);

  writePrintDocument(printWindow, html);
  await waitForPrintAssets(printWindow.document);
  focusAndPrint(printWindow);
}

function writePrintDocument(printWindow: Window, html: string) {
  const printDocument = printWindow.document;

  printDocument.open();
  printDocument.write(html);
  printDocument.close();
}

function focusAndPrint(printWindow: Window) {
  window.setTimeout(() => {
    printWindow.focus();
    printWindow.print();
  }, 120);
}

async function waitForPrintAssets(printDocument: Document) {
  if (printDocument.readyState !== "complete") {
    await new Promise<void>((resolve) => {
      printDocument.defaultView?.addEventListener("load", () => resolve(), {
        once: true,
      });
      window.setTimeout(resolve, 900);
    });
  }

  const images = Array.from(printDocument.images);

  await Promise.all(
    images.map((image) => {
      if (image.complete) return Promise.resolve();

      return new Promise<void>((resolve) => {
        image.addEventListener("load", () => resolve(), { once: true });
        image.addEventListener("error", () => resolve(), { once: true });
        window.setTimeout(resolve, 1200);
      });
    })
  );
}

function buildPdfHtml(snapshot: AnswerEditorSnapshot, logoUrl: string) {
  const safeQuestion = escapeHtml(
    snapshot.answer?.question || snapshot.question || "Question unavailable"
  );
  const blocks = Array.isArray(snapshot.answer?.blocks)
    ? snapshot.answer.blocks
    : [];
  const savedAt = snapshot.savedAt
    ? new Intl.DateTimeFormat("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(snapshot.savedAt))
    : "";
  const content =
    blocks.length > 0
      ? blocks.map((block, index) => renderStudySection(block, index)).join("")
      : `<section class="study-section"><p>No answer content was found.</p></section>`;

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${safeQuestion}</title>
    <style>${pdfStyles()}</style>
  </head>
  <body>
    <div class="pdf-page-border"></div>
    <main class="pdf-page">
      <div class="pdf-watermark" aria-hidden="true">
        <span>myclimbup.xyz</span>
      </div>
      <header class="pdf-header">
        <h1>${safeQuestion}</h1>
        ${snapshot.questionImage ? `<img class="question-image" src="${escapeAttribute(snapshot.questionImage)}" alt="Question Image" />` : ""}
        <div class="pdf-meta">
          ${savedAt ? `<span>Generated on: ${escapeHtml(savedAt)}</span>` : ""}
          <span>Blocks: ${blocks.length}</span>
        </div>
      </header>
      ${content}
    </main>
  </body>
</html>`;
}

function renderStudySection(block: any, index: number) {
  if (!block || typeof block !== "object") return "";

  const title = block.title ? `<h2>${String(index + 1)}. ${escapeHtml(stripLinks(block.title))}</h2>` : "";
  const body = renderBlockBody(block);

  return `<section class="pdf-section">
    ${title}
    <div class="section-body">${body}</div>
  </section>`;
}

function renderBlockBody(block: any) {
  switch (block.type) {
    case "markdown":
      return renderMarkdown(String(block.content || block.text || block.description || ""));

    case "steps":
      return renderSteps(block.items || block.steps || []);

    case "table":
      return renderTable(block.columns, block.rows);

    case "code":
      return renderCode(block);

    case "image":
      return renderImage(block);

    case "mermaid":
      return renderDiagram(block);

    default:
      return renderMarkdown(String(block.content || block.text || block.description || ""));
  }
}

function renderMarkdown(text: string) {
  const lines = fixMathSyntax(text).split(/\r?\n/);
  const html: string[] = [];
  let listItems: string[] = [];
  let orderedItems: string[] = [];

  const flushLists = () => {
    if (listItems.length) {
      html.push(`<ul>${listItems.join("")}</ul>`);
      listItems = [];
    }

    if (orderedItems.length) {
      html.push(`<ol>${orderedItems.join("")}</ol>`);
      orderedItems = [];
    }
  };

  lines.forEach((line) => {
    const trimmed = line.trim();

    if (!trimmed) {
      flushLists();
      return;
    }

    if (trimmed.startsWith("### ")) {
      flushLists();
      html.push(`<h4>${renderInline(trimmed.slice(4))}</h4>`);
      return;
    }

    if (trimmed.startsWith("## ")) {
      flushLists();
      html.push(`<h3>${renderInline(trimmed.slice(3))}</h3>`);
      return;
    }

    if (trimmed.startsWith("# ")) {
      flushLists();
      html.push(`<h3>${renderInline(trimmed.slice(2))}</h3>`);
      return;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      orderedItems = [];
      listItems.push(`<li>${renderInline(trimmed.slice(2))}</li>`);
      return;
    }

    const orderedMatch = trimmed.match(/^\d+\.\s+(.+)$/);

    if (orderedMatch) {
      listItems = [];
      orderedItems.push(`<li>${renderInline(orderedMatch[1])}</li>`);
      return;
    }

    flushLists();
    html.push(`<p>${renderInline(trimmed)}</p>`);
  });

  flushLists();
  return html.join("");
}

function renderInline(text: string) {
  return escapeHtml(stripLinks(text))
    .replace(/==([^=]+)==/g, "<mark>$1</mark>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\$([^$]+)\$/g, '<span class="math">$1</span>');
}

function renderSteps(items: any[]) {
  if (!Array.isArray(items) || items.length === 0) {
    return `<p class="muted">No steps available.</p>`;
  }

  return `<div class="pdf-steps">${items
    .map((item, i) => {
      if (typeof item === "string") {
        return `<div class="pdf-step">
          <div class="step-number">${i + 1}.</div>
          <div class="step-content">${renderMarkdown(item)}</div>
        </div>`;
      }
      return `<div class="pdf-step">
        <div class="step-number">${i + 1}.</div>
        <div class="step-content">
          ${item.title ? `<strong>${escapeHtml(item.title)}</strong><br/>` : ""}
          ${renderMarkdown(item.content || item.text || "")}
        </div>
      </div>`;
    })
    .join("")}</div>`;
}

function renderTable(columns: any[], rows: any[]) {
  const safeColumns = Array.isArray(columns) ? columns : [];
  const safeRows = Array.isArray(rows) ? rows : [];

  if (!safeColumns.length) {
    return `<p class="muted">No table data available.</p>`;
  }

  return `<table>
    <thead>
      <tr>${safeColumns.map((column) => `<th>${renderInline(String(column || ""))}</th>`).join("")}</tr>
    </thead>
    <tbody>
      ${safeRows
        .map(
          (row) =>
            `<tr>${safeColumns
              .map((_, columnIndex) => {
                const value = Array.isArray(row) ? row[columnIndex] || "" : "";
                return `<td>${renderInline(String(value || ""))}</td>`;
              })
              .join("")}</tr>`
        )
        .join("")}
    </tbody>
  </table>`;
}

function renderCode(block: any) {
  const language = escapeHtml(block.language || "text");
  const content = escapeHtml(block.content || "");
  const explanation = Array.isArray(block.explanation) ? block.explanation : [];
  const output = block.output ? `<h3>Output</h3><pre>${escapeHtml(block.output)}</pre>` : "";

  return `<div class="code-meta">${language}</div>
    <pre>${content}</pre>
    ${
      explanation.length
        ? `<h3>Explanation</h3><ul>${explanation
            .map((point: any) => `<li>${escapeHtml(point)}</li>`)
            .join("")}</ul>`
        : ""
    }
    ${output}`;
}

function renderImage(block: any) {
  const url = block.url || block.src || "";
  const caption = block.caption || block.description || block.search_query || "";

  if (!url) {
    return `<p class="muted">No image available.</p>`;
  }

  return `<figure>
    <img src="${escapeAttribute(url)}" alt="${escapeAttribute(caption || block.title || "Answer image")}" />
    ${caption ? `<figcaption>${escapeHtml(stripLinks(caption))}</figcaption>` : ""}
  </figure>`;
}

function renderDiagram(block: any) {
  return `<div class="diagram-box">
    <div class="code-meta">${escapeHtml(block.diagram_type || "diagram")}</div>
    <pre>${escapeHtml(block.content || "")}</pre>
  </div>`;
}

function fixMathSyntax(text: string) {
  return normalizeMarkdownInput(text)
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/\u2032/g, "'")
    .replace(/\u2033/g, "''")
    .replace(/\\\(/g, "$")
    .replace(/\\\)/g, "$")
    .replace(/\\\[/g, "$$")
    .replace(/\\\]/g, "$$");
}

function cleanStepText(text: string) {
  return fixMathSyntax(text).replace(/^\d+\.\s*/, "").trim();
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
    .trim();
}

function stripLinks(value: any) {
  return String(value ?? "")
    .replace(/\[([^\]]+)\]\((?:https?:\/\/|www\.)[^)]+\)/gi, "$1")
    .replace(/\bhttps?:\/\/[^\s<>)]+/gi, "")
    .replace(/\bwww\.[^\s<>)]+/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function escapeHtml(value: any) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttribute(value: any) {
  return escapeHtml(value).replace(/`/g, "&#096;");
}

function pdfStyles() {
  return `
    @page {
      size: A4;
      margin: 15mm;
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      padding: 0;
      color: #0f172a;
      background: #ffffff;
      font-family: "Times New Roman", Times, serif;
      font-size: 11.5pt;
      line-height: 1.6;
      text-rendering: optimizeLegibility;
    }
    
    .pdf-page-border {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      border: 3px solid #0284c7;
      border-radius: 6px;
      pointer-events: none;
      z-index: 999;
    }

    .pdf-page { 
      width: 100%; 
      position: relative; 
      padding: 25px;
    }

    .pdf-watermark {
      position: fixed; top: 50%; left: 50%; z-index: -1;
      display: grid; place-items: center;
      width: 100%; height: 100%; pointer-events: none;
      transform: translate(-50%, -50%) rotate(-45deg);
    }
    .pdf-watermark span { 
      color: #e2e8f0; 
      font-size: 70px; 
      font-weight: 800; 
      font-family: Arial, sans-serif; 
      letter-spacing: 0.05em;
      text-transform: lowercase; 
      white-space: nowrap;
      opacity: 0.25; 
    }

    .pdf-header {
      text-align: center;
      margin-bottom: 25px;
      font-family: "Plus Jakarta Sans", Arial, sans-serif;
    }
    
    h1 {
      margin: 0 0 16px; font-size: 18pt; line-height: 1.4;
      color: #0f172a;
      font-weight: 800;
      text-align: center;
      border-bottom: 3px solid #0ea5e9;
      padding-bottom: 15px;
      white-space: pre-wrap;
      word-break: break-word;
    }
    
    .question-image {
      max-width: 100%; max-height: 300px;
      margin: 20px auto; display: block;
      border-radius: 8px; border: 1px solid #cbd5e1;
      box-shadow: 0 4px 12px rgba(0,0,0,0.05);
    }

    .pdf-meta {
      font-size: 10pt; color: #475569;
      display: flex; justify-content: space-between;
      margin-bottom: 15px;
      padding: 12px;
      background: #f8fafc;
      border-radius: 6px;
      border-left: 4px solid #94a3b8;
    }

    .pdf-section {
      margin: 20px 0;
    }
    .pdf-section h2 {
      margin: 0 0 12px; font-size: 14pt; font-weight: bold;
      border-bottom: 2px solid #38bdf8; padding-bottom: 6px;
      color: #0369a1;
    }

    h3 { margin: 16px 0 6px; font-size: 12.5pt; color: #1d4ed8; page-break-after: avoid; }
    h4 { margin: 12px 0 4px; font-size: 11.5pt; font-style: italic; color: #4338ca; page-break-after: avoid; }
    p { margin: 0 0 10px; color: #1e293b; text-align: justify; }
    ul, ol { margin: 6px 0 10px 24px; padding: 0; color: #1e293b; }
    li { margin-bottom: 6px; }
    strong { font-weight: bold; color: #0f766e; }
    
    mark { background: transparent; font-weight: bold; text-decoration: underline; color: #000; }

    pre, code, .math {
      font-family: Consolas, Monaco, monospace;
      font-size: 9.5pt;
    }
    
    code, .math {
      padding: 2px 4px; border: 1px solid #e2e8f0; border-radius: 4px; background: #f8fafc; color: #c2410c;
    }
    
    pre {
      margin: 12px 0; padding: 12px; white-space: pre-wrap; word-wrap: break-word;
      background: #f8fafc; border: 1px solid #cbd5e1; border-left: 4px solid #0284c7;
      border-radius: 4px;
      page-break-inside: avoid;
    }

    .code-meta {
      display: block; font-size: 8.5pt; font-weight: bold; color: #64748b; margin-bottom: 6px; text-transform: uppercase;
    }

    table {
      width: 100%; border-collapse: collapse; margin: 15px 0;
      page-break-inside: avoid; font-family: "Plus Jakarta Sans", Arial, sans-serif; font-size: 10.5pt;
    }
    th, td { padding: 10px 12px; border: 1px solid #cbd5e1; text-align: left; vertical-align: top; }
    th { background: #f1f5f9; font-weight: 700; color: #334155; }
    td { color: #475569; }
    tr:nth-child(even) { background-color: #f8fafc; }

    .pdf-steps { margin: 10px 0; }
    .pdf-step {
      display: flex; gap: 10px; margin-bottom: 8px;
      page-break-inside: avoid;
    }
    .step-number { font-weight: bold; min-width: 20px; }
    .step-content { flex: 1; }

    img { max-width: 100%; max-height: 250px; margin: 10px auto; display: block; object-fit: contain; }
    figcaption, .muted { font-size: 9pt; color: #666; text-align: center; margin-top: 5px; }
    
    .diagram-box {
      padding: 10px; border: 1px solid #ccc; text-align: center; margin: 10px 0; page-break-inside: avoid;
    }
  `;
}
