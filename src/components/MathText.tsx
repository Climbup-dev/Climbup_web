import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';

interface MathTextProps {
  text: string;
}

const MathText: React.FC<MathTextProps> = ({ text }) => {
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
        {text}
      </ReactMarkdown>
    </div>
  );
};

export default MathText;
