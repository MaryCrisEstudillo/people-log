/* Date and duration helpers. All dates are local "YYYY-MM-DD"; months are "YYYY-MM". */

const pad = (n: number) => String(n).padStart(2, '0');

export function isoFromTs(ts: number) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayISO() {
  return isoFromTs(Date.now());
}

export function currentMonth() {
  return todayISO().slice(0, 7);
}

/** "2026-11" → "2026-10" (handles January → December of the previous year) */
export function prevMonth(month: string) {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

/** "2026-11" → "November" (or "November 2026" with year) */
export function monthName(month: string, withYear = false) {
  return new Date(`${month}-01T00:00:00`).toLocaleDateString(undefined, {
    month: 'long',
    ...(withYear && { year: 'numeric' }),
  });
}

/** "2026-11-06" → "Nov 6, 2026" */
export function formatDate(iso: string) {
  if (!iso) return '';
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Parse "hours.minutes" input into minutes.
 *   1.15 → 75 (1h 15m)   .45 → 45   2 → 120
 *   1.5  → 110 — one digit after the dot means tens of minutes (1h 50m)
 * Returns null if empty or invalid (e.g. minutes ≥ 60).
 */
export function parseHM(input: string): number | null {
  const s = input.trim();
  if (s === '' || s === '.' || !/^\d*(\.\d{0,2})?$/.test(s)) return null;
  const [h = '', m = ''] = s.split('.');
  const hours = h ? parseInt(h, 10) : 0;
  const mins = m ? parseInt(m.padEnd(2, '0'), 10) : 0;
  if (mins >= 60) return null;
  return hours * 60 + mins;
}

/** minutes → "h.mm" (prefills edit inputs) */
export function toHM(minutes: number) {
  const m = Math.max(0, Math.round(minutes));
  return `${Math.floor(m / 60)}.${pad(m % 60)}`;
}

/** minutes → "3h 30m" */
export function formatHM(minutes: number) {
  const m = Math.abs(Math.round(minutes));
  const h = Math.floor(m / 60);
  const r = m % 60;
  const s = r === 0 ? `${h}h` : h === 0 ? `${r}m` : `${h}h ${r}m`;
  return minutes < 0 ? `-${s}` : s;
}
