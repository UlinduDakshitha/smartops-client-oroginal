/** The API returns UTC timestamps; make sure they are parsed as UTC even if the "Z" is missing. */
export function parseUtc(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  const hasZone = /([zZ]|[+-]\d{2}:?\d{2})$/.test(value);
  const d = new Date(hasZone ? value : value + 'Z');
  return Number.isNaN(d.getTime()) ? null : d;
}

export function toMs(value: string | null | undefined): number | null {
  return parseUtc(value)?.getTime() ?? null;
}

/** 135 -> "2h 15m", 1500 -> "1d 1h", 45 -> "45m" */
export function formatMinutes(total: number | null | undefined): string {
  if (total === null || total === undefined || Number.isNaN(total)) return '–';
  const mins = Math.max(0, Math.round(total));
  if (mins < 1) return '<1m';
  const d = Math.floor(mins / 1440);
  const h = Math.floor((mins % 1440) / 60);
  const m = mins % 60;
  if (d > 0) return h > 0 ? `${d}d ${h}h` : `${d}d`;
  if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
  return `${m}m`;
}

export function formatMs(ms: number): string {
  return formatMinutes(Math.abs(ms) / 60000);
}

export function relativeTime(value: string | null | undefined, now = Date.now()): string {
  const d = parseUtc(value);
  if (!d) return '–';
  const diff = Math.round((now - d.getTime()) / 1000);
  const abs = Math.abs(diff);
  const suffix = diff >= 0 ? 'ago' : 'from now';
  if (abs < 45) return diff >= 0 ? 'just now' : 'in a moment';
  if (abs < 3600) return `${Math.round(abs / 60)}m ${suffix}`;
  if (abs < 86400) return `${Math.round(abs / 3600)}h ${suffix}`;
  if (abs < 86400 * 7) return `${Math.round(abs / 86400)}d ${suffix}`;
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}
