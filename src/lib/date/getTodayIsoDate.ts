export function getTodayIsoDate(): string {
  // Use UTC boundary for a stable "day" definition across server + clients.
  return new Date().toISOString().slice(0, 10);
}

