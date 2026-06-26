"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

type NormalizedAnswer = {
  question: string;
  blocks: any[];
};

const accentColors = [
  "#0f766e",
  "#2563eb",
  "#9333ea",
  "#ea580c",
  "#dc2626",
  "#0891b2",
];

export function generateAnswerPdfDocument(answer: NormalizedAnswer) {
  if (typeof window === "undefined") return;

  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.position = "fixed";
  frame.style.right = "0";
  frame.style.bottom = "0";
  frame.style.width = "0";
  frame.style.height = "0";
  frame.style.border = "0";

  document.body.appendChild(frame);

  const printWindow = frame.contentWindow;
  const printDocument = frame.contentDocument;

  if (!printWindow || !printDocument) {
    frame.remove();
    return;
  }

  printDocument.open();
  printDocument.write(buildPdfHtml(answer, `${window.location.origin}/logo.png`));
  printDocument.close();

  const cleanup = () => {
    window.setTimeout(() => frame.remove(), 500);
  };

  frame.onload = () => {
    printWindow.focus();
    printWindow.print();
    cleanup();
  };
}

function buildPdfHtml(answer: NormalizedAnswer, logoUrl: string) {
  const safeQuestion = escapeHtml(answer.question || "Question unavailable");
  const blocks = Array.isArray(answer.blocks) ? answer.blocks : [];
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
      <header class="pdf-hero">
        <div class="brand-row">
          <span class="brand-text">ClimbUp Answer</span>
          <img class="brand-logo" src="${escapeAttribute(logoUrl)}" alt="ClimbUp" />
        </div>
        <p class="eyebrow">Structured Answer PDF</p>
        <h1>${safeQuestion}</h1>
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
    ${title}
    ${body}
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
      margin: 10mm;
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
      font-size: 12px;
      line-height: 1.55;
      -webkit-font-smoothing: antialiased;
      text-rendering: optimizeLegibility;
    }

    .pdf-page {
      width: 100%;
    }

    .pdf-hero {
      padding: 14px 18px;
      color: #ffffff;
      background: linear-gradient(135deg, #062923 0%, #0f766e 48%, #2563eb 100%);
      border-radius: 12px;
      page-break-inside: avoid;
    }

    .brand-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
      margin-bottom: 8px;
      font-weight: 800;
    }

    .brand-text,
    .eyebrow {
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .brand-logo {
      width: 34px;
      height: 34px;
      object-fit: contain;
      padding: 4px;
      margin: 0;
      background: rgba(255, 255, 255, 0.94);
      border: 1px solid rgba(255, 255, 255, 0.55);
      border-radius: 10px;
    }

    .eyebrow {
      margin: 0 0 5px;
      color: #cffafe;
      font-size: 9px;
      font-weight: 800;
    }

    h1 {
      max-width: 96%;
      margin: 0;
      font-size: 20px;
      line-height: 1.18;
    }

    .study-section {
      margin: 10px 0 0;
      padding: 0 0 1px 10px;
      border-left: 3px solid var(--section-accent, #0f766e);
    }

    h2 {
      margin: 0 0 6px;
      color: var(--section-accent, #0f766e);
      font-size: 15px;
      line-height: 1.28;
    }

    h3 {
      margin: 8px 0 4px;
      color: #111827;
      font-size: 12px;
    }

    h4 {
      margin: 7px 0 3px;
      color: #1f2937;
      font-size: 11px;
    }

    p {
      margin: 0 0 5px;
      font-family: inherit;
    }

    ul,
    ol {
      margin: 4px 0 5px 16px;
      padding: 0;
    }

    li {
      margin-bottom: 2px;
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
      margin: 5px 0;
      padding: 8px;
      overflow-wrap: anywhere;
      white-space: pre-wrap;
      color: #e5f3ff;
      background: #0f172a;
      border-radius: 8px;
      font-family: Consolas, Monaco, monospace;
      font-size: 9px;
      line-height: 1.35;
    }

    .code-meta {
      display: inline-flex;
      margin: 0 0 4px;
      padding: 3px 7px;
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
      border-radius: 12px;
    }

    th,
    td {
      padding: 5px 7px;
      border: 1px solid #dbe3ef;
      text-align: left;
      vertical-align: top;
      font-family: inherit;
    }

    th {
      color: #063a35;
      background: #ccfbf1;
      font-weight: 900;
    }

    tr:nth-child(even) td {
      background: #f8fafc;
    }

    .pdf-steps {
      display: grid;
      gap: 6px;
    }

    .pdf-step {
      display: grid;
      grid-template-columns: 26px 1fr;
      gap: 7px;
      padding: 7px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      break-inside: auto;
    }

    .step-number {
      display: grid;
      place-items: center;
      width: 22px;
      height: 22px;
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
      max-height: 240px;
      margin: 0 auto;
      object-fit: contain;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
    }

    figcaption,
    .muted {
      margin-top: 5px;
      color: #64748b;
      font-size: 10px;
    }

    .diagram-box {
      padding: 7px;
      background: #f8fafc;
      border: 1px dashed #94a3b8;
      border-radius: 8px;
    }
  `;
}
