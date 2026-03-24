const DATE_FORMAT: Intl.DateTimeFormatOptions = {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  year: 'numeric'
};

const TIME_FORMAT: Intl.DateTimeFormatOptions = {
  hour: 'numeric',
  minute: '2-digit'
};

/**
 * Formats an ISO timestamp for journal list and detail headers.
 */
export function formatJournalDate(iso: string): string {
  const d: Date = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return '';
  }
  const datePart: string = d.toLocaleDateString(undefined, DATE_FORMAT);
  const timePart: string = d.toLocaleTimeString(undefined, TIME_FORMAT);
  return `${datePart} · ${timePart}`;
}
