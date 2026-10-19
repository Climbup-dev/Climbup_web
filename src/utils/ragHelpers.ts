/**
 * ClimbUP - Lecture Video RAG Helpers
 * Parses timestamps and formats citation badges for student video synchronizer.
 */

/**
 * Converts HH:MM:SS or MM:SS string into seconds
 */
export function parseTimestampToSeconds(ts: string): number {
  if (!ts) return 0;
  const clean = ts.replace(/[\[\]]/g, '').trim();
  const parts = clean.split(':').map((p) => parseInt(p, 10));
  if (parts.length === 3) {
    return (parts[0] || 0) * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0);
  } else if (parts.length === 2) {
    return (parts[0] || 0) * 60 + (parts[1] || 0);
  }
  return 0;
}

/**
 * Splits text into segments, identifying [MM:SS] or [HH:MM:SS] timestamps
 * so React can render them as interactive clickable badges.
 */
export function parseTextWithTimestamps(text: string): Array<{ type: 'text' | 'timestamp'; content: string }> {
  if (!text) return [];
  const regex = /\[(\d{1,2}:\d{2}:\d{2}|\d{1,3}:\d{2})\]/g;
  const parts: Array<{ type: 'text' | 'timestamp'; content: string }> = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: text.substring(lastIndex, match.index) });
    }
    parts.push({ type: 'timestamp', content: match[1] });
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push({ type: 'text', content: text.substring(lastIndex) });
  }

  return parts;
}
