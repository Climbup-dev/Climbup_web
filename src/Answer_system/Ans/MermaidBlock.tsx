"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useId, useMemo, useRef, useState } from "react";

export default function MermaidBlock({ block }: { block: any }) {
  const reactId = useId();
  const renderCount = useRef(0);
  const [svg, setSvg] = useState("");
  const [error, setError] = useState("");

  const title = block?.title || "Diagram";
  const diagramType = block?.diagram_type || "flowchart";
  const rawContent = block?.content || block?.diagram || "";

  const mermaidCode = useMemo(() => {
    return normalizeMermaidCode(rawContent, diagramType);
  }, [rawContent, diagramType]);

  useEffect(() => {
    let isMounted = true;

    async function renderDiagram() {
      setSvg("");
      setError("");

      if (!mermaidCode) {
        setError("No diagram content available.");
        return;
      }

      try {
        const mermaid = (await import("mermaid")).default;

        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "strict",
          theme: "default",
          flowchart: {
            htmlLabels: false,
            curve: "basis",
          },
        });

        renderCount.current += 1;
        const safeId = `answer-mermaid-${reactId.replace(/[^a-zA-Z0-9_-]/g, "")}-${renderCount.current}`;
        await mermaid.parse(mermaidCode);
        const result = await mermaid.render(safeId, mermaidCode);

        if (/syntax error in text/i.test(result.svg)) {
          throw new Error("Mermaid returned a syntax-error diagram.");
        }

        if (isMounted) {
          setSvg(result.svg);
        }
      } catch (err) {
        console.error("Mermaid render failed:", err);

        if (isMounted) {
          setError("Diagram could not be rendered. Check the Mermaid syntax.");
        }
      }
    }

    renderDiagram();

    return () => {
      isMounted = false;
    };
  }, [mermaidCode, reactId]);

  return (
    <div className="block mermaid-block">
      <h2 className="block-title">{title}</h2>

      {svg ? (
        <div
          className="mermaid-container"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      ) : (
        <pre className="mermaid-fallback">
          {error ? `${error}\n\n${mermaidCode}` : "Rendering diagram..."}
        </pre>
      )}

      <details className="diagram-source">
        <summary>Source</summary>
        <pre className="mermaid-fallback">{mermaidCode}</pre>
      </details>
    </div>
  );
}

function normalizeMermaidCode(content: any, diagramType: string) {
  if (!content || typeof content !== "string") return "";

  const code = decodeEscapedMermaidText(removeMarkdownFence(content.trim()));

  if (isValidMermaidStart(code)) {
    return normalizeKnownMermaidCode(code);
  }

  if (diagramType === "flowchart" || looksLikeFlowchart(code)) {
    return normalizeFlowchartCode(code);
  }

  return normalizeFlowchartCode(code);
}

function removeMarkdownFence(code: string) {
  return code
    .replace(/^```mermaid\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
}

function decodeEscapedMermaidText(code: string) {
  return code
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, "  ")
    .replace(/\\([[\]{}()])/g, "$1")
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'")
    .trim();
}

function isValidMermaidStart(code: string) {
  return (
    code.startsWith("flowchart ") ||
    code.startsWith("graph ") ||
    code.startsWith("sequenceDiagram") ||
    code.startsWith("classDiagram") ||
    code.startsWith("stateDiagram") ||
    code.startsWith("stateDiagram-v2") ||
    code.startsWith("erDiagram") ||
    code.startsWith("journey") ||
    code.startsWith("gantt") ||
    code.startsWith("pie")
  );
}

function looksLikeFlowchart(code: string) {
  return (
    code.includes("-->") ||
    code.includes("---") ||
    code.includes("-.->") ||
    code.includes("==>")
  );
}

function normalizeFlowchartCode(code: string) {
  let cleaned = code.trim();
  const badDirectionNodeMatch = cleaned.match(/^(TD|LR|BT|RL)\[([^\]]+)\](.*)$/);

  if (badDirectionNodeMatch) {
    const direction = badDirectionNodeMatch[1];
    const firstNode = badDirectionNodeMatch[2];
    const rest = badDirectionNodeMatch[3];

    cleaned = `${firstNode}${rest}`.trim();
    return sanitizeFlowchartCode(`flowchart ${direction}\n${cleaned}`);
  }

  const directionSpaceMatch = cleaned.match(/^(TD|LR|BT|RL)\s+(.+)$/);

  if (directionSpaceMatch) {
    const direction = directionSpaceMatch[1];
    const rest = directionSpaceMatch[2];
    return sanitizeFlowchartCode(`flowchart ${direction}\n${rest}`);
  }

  if (cleaned.startsWith("graph ")) {
    return sanitizeFlowchartCode(cleaned);
  }

  return sanitizeFlowchartCode(`flowchart TD\n${cleaned}`);
}

function normalizeKnownMermaidCode(code: string) {
  if (code.startsWith("flowchart ") || code.startsWith("graph ")) {
    return sanitizeFlowchartCode(code);
  }

  return code;
}

function sanitizeFlowchartCode(code: string) {
  return code
    .split(/\r?\n/)
    .map((line) => sanitizeFlowchartLine(line))
    .join("\n")
    .trim();
}

function sanitizeFlowchartLine(line: string) {
  const indent = line.match(/^\s*/)?.[0] || "";
  let cleaned = line.trim();

  if (!cleaned || cleaned.startsWith("flowchart ") || cleaned.startsWith("graph ")) {
    return line;
  }

  cleaned = normalizeLabeledArrow(cleaned);
  cleaned = quoteNodeLabels(cleaned);

  return `${indent}${cleaned}`;
}

function normalizeLabeledArrow(line: string) {
  return line.replace(
    /^(.+?)\s+--\s+(.+?)\s+-->\s+(.+)$/,
    (_match: string, from: string, label: string, to: string) => `${from.trim()} -->|${escapeEdgeLabel(label)}| ${to.trim()}`
  );
}

function quoteNodeLabels(line: string) {
  return line.replace(
    /(^|[\s>|])([A-Za-z][A-Za-z0-9_-]*)([\[{])([^"'\]}{][^\]}{]*?)([\]}])/g,
    (_match: string, prefix: string, id: string, open: string, label: string, close: string) => {
      const trimmedLabel = String(label).trim();
      const quotedLabel = escapeNodeLabel(trimmedLabel);
      return `${prefix}${id}${open}"${quotedLabel}"${close}`;
    }
  );
}

function escapeEdgeLabel(label: string) {
  return String(label).replace(/\|/g, "/").trim();
}

function escapeNodeLabel(label: string) {
  return String(label).replace(/"/g, "'").trim();
}
