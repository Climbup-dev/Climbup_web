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
    <main class="pdf-page">
      <div class="pdf-watermark" aria-hidden="true">
        <img src="${escapeAttribute(logoUrl)}" alt="" />
        <span>ClimbUP</span>
      </div>
      <header class="pdf-hero">
        <div class="brand-row">
          <span class="brand-text">ClimbUP Answer Sheet</span>
          <img class="brand-logo" src="${escapeAttribute(logoUrl)}" alt="ClimbUp" />
        </div>
        <p class="eyebrow">Structured engineering answer</p>
        <h1>${safeQuestion}</h1>
        <div class="pdf-meta">
          <span>Source: Answer JSON</span>
          ${savedAt ? `<span>Generated: ${escapeHtml(savedAt)}</span>` : ""}
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

  const color = accentColors[index % accentColors.length];
  const title = block.title ? `<h2>${escapeHtml(stripLinks(block.title))}</h2>` : "";
  const body = renderBlockBody(block);

  return `<section class="study-section" style="--section-accent:${color}">
    <div class="section-top">
      <span class="section-index">${String(index + 1).padStart(2, "0")}</span>
      ${title}
    </div>
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
    .map((item, index) => {
      const step =
        typeof item === "string"
          ? { content: item }
          : {
              title: item?.title || "",
              content: item?.content || item?.text || item?.description || "",
            };

      return `<div class="pdf-step">
        <span class="step-number">${index + 1}</span>
        <div>
          ${step.title ? `<h3>${escapeHtml(stripLinks(step.title))}</h3>` : ""}
          ${renderMarkdown(cleanStepText(String(step.content || "")))}
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
      margin: 11mm 10mm 12mm;
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      color: #172033;
      background: #ffffff;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont,
        "Segoe UI", Arial, Helvetica, sans-serif;
      font-size: 12.2px;
      line-height: 1.62;
      -webkit-font-smoothing: antialiased;
      text-rendering: optimizeLegibility;
    }

    .pdf-page {
      width: 100%;
      position: relative;
      isolation: isolate;
    }

    .pdf-watermark {
      position: fixed;
      top: 50%;
      left: 50%;
      z-index: -1;
      display: grid;
      place-items: center;
      gap: 10px;
      width: 260px;
      height: 260px;
      pointer-events: none;
      opacity: 0.055;
      transform: translate(-50%, -50%) rotate(-22deg);
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
    }

    .pdf-watermark img {
      width: 116px;
      height: 116px;
      object-fit: contain;
      border: 0;
      border-radius: 0;
      filter: grayscale(1);
    }

    .pdf-watermark span {
      color: #021526;
      font-size: 40px;
      font-weight: 950;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }

    .pdf-hero {
      position: relative;
      overflow: hidden;
      padding: 18px 20px 20px;
      color: #ffffff;
      background:
        radial-gradient(circle at 86% 18%, rgba(158, 248, 220, 0.24), transparent 26%),
        linear-gradient(135deg, #031b2b 0%, #07564e 50%, #1d4ed8 100%);
      border: 1px solid rgba(158, 248, 220, 0.42);
      border-radius: 15px;
      box-shadow: 0 12px 30px rgba(15, 23, 42, 0.16);
      page-break-inside: avoid;
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
    }

    .pdf-hero::after {
      content: "";
      position: absolute;
      right: -44px;
      bottom: -74px;
      width: 180px;
      height: 180px;
      background: radial-gradient(circle, rgba(255, 255, 255, 0.16), transparent 68%);
      border-radius: 999px;
    }

    .brand-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
      margin-bottom: 10px;
      font-weight: 800;
    }

    .brand-text,
    .eyebrow {
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .brand-text {
      display: inline-flex;
      align-items: center;
      min-height: 28px;
      padding: 5px 10px;
      color: #dffdf5;
      background: rgba(2, 21, 38, 0.28);
      border: 1px solid rgba(255, 255, 255, 0.18);
      border-radius: 999px;
      font-size: 9px;
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
    }

    .brand-logo {
      width: 34px;
      height: 34px;
      object-fit: contain;
      padding: 4px;
      margin: 0;
      background: rgba(255, 255, 255, 0.94);
      border: 1px solid rgba(255, 255, 255, 0.55);
      border-radius: 11px;
      box-shadow: 0 8px 18px rgba(2, 21, 38, 0.18);
    }

    .eyebrow {
      margin: 0 0 7px;
      color: #cffafe;
      font-size: 9px;
      font-weight: 800;
    }

    h1 {
      max-width: 96%;
      margin: 0;
      font-size: 21px;
      line-height: 1.22;
      letter-spacing: 0;
    }

    .pdf-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 7px;
      margin-top: 12px;
    }

    .pdf-meta span {
      display: inline-flex;
      align-items: center;
      min-height: 24px;
      padding: 4px 9px;
      color: #e8fff8;
      background: rgba(2, 21, 38, 0.28);
      border: 1px solid rgba(255, 255, 255, 0.16);
      border-radius: 999px;
      font-size: 9px;
      font-weight: 800;
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
    }

    .study-section {
      margin: 11px 0 0;
      padding: 11px 12px 12px;
      background:
        linear-gradient(90deg, rgba(15, 118, 110, 0.07), transparent 34%),
        #ffffff;
      border: 1px solid #e2e8f0;
      border-left: 4px solid var(--section-accent, #0f766e);
      border-radius: 12px;
      box-shadow: 0 7px 20px rgba(15, 23, 42, 0.06);
      break-inside: auto;
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
    }

    .section-top {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      margin-bottom: 7px;
      page-break-after: avoid;
    }

    .section-index {
      display: inline-grid;
      place-items: center;
      flex: 0 0 25px;
      width: 25px;
      height: 25px;
      color: #ffffff;
      background: var(--section-accent, #0f766e);
      border-radius: 8px;
      font-size: 9px;
      font-weight: 950;
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
    }

    .section-body {
      min-width: 0;
    }

    h2 {
      margin: 1px 0 0;
      color: var(--section-accent, #0f766e);
      font-size: 14.6px;
      line-height: 1.32;
      letter-spacing: 0;
    }

    h3 {
      margin: 9px 0 4px;
      color: #111827;
      font-size: 12px;
      page-break-after: avoid;
    }

    h4 {
      margin: 7px 0 3px;
      color: #1f2937;
      font-size: 11px;
    }

    p {
      margin: 0 0 6px;
      font-family: inherit;
    }

    ul,
    ol {
      margin: 4px 0 5px 16px;
      padding: 0;
    }

    li {
      margin-bottom: 3px;
      font-family: inherit;
    }

    strong {
      color: #0f766e;
      font-weight: 900;
    }

    mark {
      padding: 0 3px 1px;
      color: #713f12;
      background: #fef08a;
      border-bottom: 1px solid #f59e0b;
      border-radius: 3px;
      box-decoration-break: clone;
      -webkit-box-decoration-break: clone;
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
    }

    code,
    .math {
      padding: 1px 4px;
      color: #0f172a;
      background: #f1f5f9;
      border: 1px solid #e2e8f0;
      border-radius: 5px;
      font-family: Consolas, Monaco, monospace;
      font-size: 10px;
    }

    pre {
      margin: 6px 0;
      padding: 10px;
      overflow-wrap: anywhere;
      white-space: pre-wrap;
      color: #e5f3ff;
      background: linear-gradient(135deg, #0f172a, #111827);
      border: 1px solid #1f3b57;
      border-radius: 10px;
      font-family: Consolas, Monaco, monospace;
      font-size: 9px;
      line-height: 1.42;
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
    }

    .code-meta {
      display: inline-flex;
      margin: 0 0 4px;
      padding: 3px 8px;
      color: #075985;
      background: #e0f2fe;
      border-radius: 999px;
      font-size: 9px;
      font-weight: 900;
      text-transform: uppercase;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      overflow: hidden;
      border: 1px solid #dbe3ef;
      border-radius: 10px;
    }

    th,
    td {
      padding: 6px 8px;
      border: 1px solid #dbe3ef;
      text-align: left;
      vertical-align: top;
      font-family: inherit;
    }

    th {
      color: #063a35;
      background: #ccfbf1;
      font-weight: 900;
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
    }

    tr:nth-child(even) td {
      background: #f8fafc;
    }

    .pdf-steps {
      display: grid;
      gap: 7px;
    }

    .pdf-step {
      display: grid;
      grid-template-columns: 28px 1fr;
      gap: 8px;
      padding: 8px;
      background: linear-gradient(180deg, #ffffff, #f8fafc);
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      break-inside: auto;
    }

    .step-number {
      display: grid;
      place-items: center;
      width: 24px;
      height: 24px;
      color: #ffffff;
      background: var(--section-accent, #0f766e);
      border-radius: 999px;
      font-weight: 900;
      font-size: 10px;
    }

    figure {
      margin: 0;
    }

    img {
      display: block;
      max-width: 100%;
      max-height: 250px;
      margin: 0 auto;
      object-fit: contain;
      border: 1px solid #dbe3ef;
      border-radius: 10px;
      box-shadow: 0 8px 22px rgba(15, 23, 42, 0.08);
    }

    figcaption,
    .muted {
      margin-top: 5px;
      color: #64748b;
      font-size: 10px;
    }

    .diagram-box {
      padding: 9px;
      background: #f8fafc;
      border: 1px dashed #94a3b8;
      border-radius: 10px;
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
    }
  `;
}
