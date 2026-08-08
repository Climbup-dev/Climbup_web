import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

interface MathTextProps {
  text: string;
}

const MathText: React.FC<MathTextProps> = ({ text }) => {
  let processedText = text || '';

  // Robustly normalize text from database that might have escaped characters or HTML
  processedText = processedText
    .replace(/&lt;br\s*\/?&gt;/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>\s*<p>/gi, "\n\n")
    .replace(/<\/?p>/gi, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/\\n/g, "\n")
    .replace(/\r\n/g, "\n");

  // Fix flattened tables (where newlines were replaced by spaces)
  // e.g. "Text | Header |" -> "Text \n\n| Header |"
  processedText = processedText.replace(/([^\n|])\s+(\|.*\|.*\|)/g, '$1\n\n$2');
  
  // Fix flattened table rows (where "| |" indicates a lost newline between rows)
  processedText = processedText.replace(/\|\s+\|\s*(?=:?-+:?)/g, '|\n| '); // Before alignment row
  processedText = processedText.replace(/\|\s+\|\s*(?=[^|]+(?:\s*\|)+)/g, '|\n| '); // Between data rows
  
  // Remove backticks around math e.g., `$T(n)$` -> $T(n)$
  processedText = processedText.replace(/`(\$[^`]+\$)`/g, '$1');
  processedText = processedText.replace(/`(\$\$[^`]+\$\$)`/g, '$1');

  // Convert standard LaTeX delimiters to $ and $$
  processedText = processedText.replace(/\\\(([\s\S]*?)\\\)/g, '$$$1$$');
  processedText = processedText.replace(/\\\[([\s\S]*?)\\\]/g, '$$$$$1$$$$');

  // Fix tables that are directly after a line of text (without an empty line)
  processedText = processedText.replace(/([^\n])\n(\s*\|)/g, '$1\n\n$2');

  return (
    <div className="math-text-container" style={{ fontSize: '1rem', lineHeight: '1.6' }}>
      <ReactMarkdown
        remarkPlugins={[remarkMath, remarkGfm]}
        rehypePlugins={[rehypeKatex]}
        components={{
          table: ({ node, ...props }) => (
            <div style={{ overflowX: 'auto', margin: '16px 0' }}>
              <table style={{ borderCollapse: 'collapse', width: '100%', border: '1px solid #e2e8f0' }} {...props} />
            </div>
          ),
          th: ({ node, ...props }) => (
            <th style={{ border: '1px solid #e2e8f0', padding: '12px', backgroundColor: '#f8fafc', fontWeight: '600', textAlign: 'left' }} {...props} />
          ),
          td: ({ node, ...props }) => (
            <td style={{ border: '1px solid #e2e8f0', padding: '12px' }} {...props} />
          )
        }}
      >
        {processedText}
      </ReactMarkdown>
    </div>
  );
};

export default MathText;
