/**
 * Returns the first N lines of text (split on newlines), joined back.
 */
export function getFirstLines(text: string, lineCount: number): string {
  const lines: string[] = text.split(/\r?\n/);
  const slice: string[] = lines.slice(0, Math.max(0, lineCount));
  return slice.join('\n').trim();
}

/**
 * Truncates to a single line for previews (no ellipsis mid-word if possible).
 */
export function truncateOneLine(text: string, maxChars: number): string {
  const oneLine: string = text.replace(/\s+/g, ' ').trim();
  if (oneLine.length <= maxChars) {
    return oneLine;
  }
  return `${oneLine.slice(0, Math.max(0, maxChars - 1)).trim()}…`;
}
