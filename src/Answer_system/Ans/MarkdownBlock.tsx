"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import type { ReactNode } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

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
  let processedText = normalizeMarkdownInput(text);
  const mathBlocks: string[] = [];
  
  // Extract multiline $$ blocks first so they aren't split by \n
  processedText = processedText.replace(/\$\$([\s\S]+?)\$\$/g, (match, math) => {
    mathBlocks.push(math);
    return `__MATH_BLOCK_${mathBlocks.length - 1}__`;
  });

  const lines = processedText.split(/\r?\n/);
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

    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      flushLists();
      const level = headingMatch[1].length;
      const content = renderInline(headingMatch[2], mathBlocks);
      const HeadingTag = `h${level}` as keyof JSX.IntrinsicElements;
      nodes.push(<HeadingTag key={index}>{content}</HeadingTag>);
      return;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      orderedListItems = [];
      listItems.push(<li key={index}>{renderInline(trimmed.slice(2), mathBlocks)}</li>);
      return;
    }

    const orderedMatch = trimmed.match(/^\d+\.\s+(.+)$/);

    if (orderedMatch) {
      listItems = [];
      orderedListItems.push(
        <li key={index}>{renderInline(orderedMatch[1], mathBlocks)}</li>
      );
      return;
    }

    // Match bare YouTube URLs (including shorts) and Markdown-formatted YouTube links
    const youtubeRegex = /^(?:\[.*?\]\()?<?(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})[^\s>)]*>?(?:\))?$/;
    const ytMatch = trimmed.match(youtubeRegex);
    
    if (ytMatch && ytMatch[1]) {
      flushLists();
      const videoId = ytMatch[1];
      nodes.push(
        <div key={`yt-${index}`} className="youtube-video-wrapper" style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden', margin: '24px 0', borderRadius: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}>
          <iframe 
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
            src={`https://www.youtube.com/embed/${videoId}`} 
            title="YouTube video player" 
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
            allowFullScreen 
          />
        </div>
      );
      return;
    }

    flushLists();
    nodes.push(<p key={index}>{renderInline(trimmed, mathBlocks)}</p>);
  });

  flushLists();
  return nodes;
}

function renderInline(text: string, mathBlocks: string[]) {
  const parts = text.split(/(__MATH_BLOCK_\d+__|`[^`]+`|\*\*[^*]+\*\*|==[^=]+==|<mark[^>]*>.*?<\/mark>|\$[^$]+\$|\[[^\]]+\]\([^)]+\))/g);

  return parts.map((part, index) => {
    const mathBlockMatch = part.match(/^__MATH_BLOCK_(\d+)__$/);
    if (mathBlockMatch) {
      const idx = parseInt(mathBlockMatch[1], 10);
      const math = mathBlocks[idx];
      let html = "";
      try {
        html = katex.renderToString(math, { throwOnError: false, displayMode: true });
      } catch (e) {
        html = `<div style="color:red">Math error: ${String(e)}</div>`;
      }
      return (
        <span 
          key={index} 
          className="math-block-container" 
          style={{ margin: '16px 0', overflowX: 'auto', display: 'block' }} 
          dangerouslySetInnerHTML={{ __html: html }} 
        />
      );
    }

    if (part.startsWith("`") && part.endsWith("`")) {
      return <code key={index}>{part.slice(1, -1)}</code>;
    }

    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }

    if (part.startsWith("==") && part.endsWith("==")) {
      return <mark key={index}>{part.slice(2, -2)}</mark>;
    }

    if (part.startsWith("<mark") && part.endsWith("</mark>")) {
      // Extract the text inside the <mark> tag
      const markMatch = part.match(/<mark[^>]*>(.*?)<\/mark>/);
      if (markMatch) {
        return <mark className="highlight" key={index}>{markMatch[1]}</mark>;
      }
    }

    if (part.startsWith("$") && part.endsWith("$")) {
      const math = part.slice(1, -1);
      let html = "";
      try {
        html = katex.renderToString(math, { throwOnError: false, displayMode: false });
      } catch (e) {
        return <span className="inline-math" key={index}>{part}</span>;
      }
      return (
        <span className="inline-math-rendered" key={index} dangerouslySetInnerHTML={{ __html: html }} />
      );
    }

    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      return (
        <a 
          key={index} 
          href={linkMatch[2]} 
          target="_blank" 
          rel="noopener noreferrer" 
          style={{ color: '#38bdf8', textDecoration: 'underline', textUnderlineOffset: '2px' }}
        >
          {linkMatch[1]}
        </a>
      );
    }

    if (typeof part === "string") {
      return part.replace(/<\/?mark[^>]*>/g, "");
    }
    
    return part;
  });
}

function fixMathSyntax(text: any) {
  if (typeof text !== "string") return "";

  let cleaned = normalizeMarkdownInput(text)
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

  // Remove backticks around math e.g., `$T(n)$` -> $T(n)$
  cleaned = cleaned.replace(/`(\$[^`]+\$)`/g, '$1');
  cleaned = cleaned.replace(/`(\$\$[^`]+\$\$)`/g, '$1');

  return cleaned;
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
