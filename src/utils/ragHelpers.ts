/**
 * ClimbUP - Lecture Video RAG Helpers
 * Parses timestamps and formats citation badges for student video synchronizer.
 */

/**
 * Converts HH:MM:SS or MM:SS string into seconds
 */
export function parseTimestampToSeconds(ts: string): number {
  if (!ts) return 0;
  // Strip out brackets, parentheses, play arrows, backticks, and whitespace
  const clean = ts.replace(/[\[\]\(\)`▶\s]/g, '').trim();
  const parts = clean.split(':').map((p) => parseInt(p, 10));
  if (parts.length === 3) {
    return (parts[0] || 0) * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0);
  } else if (parts.length === 2) {
    return (parts[0] || 0) * 60 + (parts[1] || 0);
  }
  return 0;
}

export type InlinePart = 
  | { type: 'text'; value: string }
  | { type: 'bold'; value: string }
  | { type: 'code'; value: string }
  | { type: 'timestamp'; value: string };

/**
 * Parses inline formatting:
 * - Bold: **text**
 * - Inline code: `code`
 * - Timestamps: [MM:SS], `▶ MM:SS`, ▶ MM:SS, (MM:SS)
 */
export function parseInlineFormatted(text: string): InlinePart[] {
  if (!text) return [];

  // Match bold, inline code, or timestamp formats
  const tokenRegex = /(\*\*[^*]+\*\*|`[^`]+`|(?:`?▶\s*|\[|\()(?:\d{1,2}:\d{2}:\d{2}|\d{1,3}:\d{2})(?:`|\]|\))?)/g;
  const parts: InlinePart[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', value: text.substring(lastIndex, match.index) });
    }

    const token = match[0];
    if (token.startsWith('**') && token.endsWith('**')) {
      parts.push({ type: 'bold', value: token.slice(2, -2) });
    } else if (token.startsWith('`') && token.endsWith('`') && !token.includes('▶')) {
      parts.push({ type: 'code', value: token.slice(1, -1) });
    } else {
      const timeMatch = token.match(/\d{1,2}:\d{2}:\d{2}|\d{1,3}:\d{2}/);
      if (timeMatch) {
        parts.push({ type: 'timestamp', value: timeMatch[0] });
      } else {
        parts.push({ type: 'text', value: token });
      }
    }

    lastIndex = tokenRegex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push({ type: 'text', value: text.substring(lastIndex) });
  }

  return parts;
}

/**
 * Backward compatibility: Splits text into segments identifying timestamps
 */
export function parseTextWithTimestamps(text: string): Array<{ type: 'text' | 'timestamp'; content: string }> {
  return parseInlineFormatted(text).map(p => ({
    type: p.type === 'timestamp' ? 'timestamp' : 'text',
    content: p.value
  }));
}
