import Dexie, { type Table } from 'dexie';

export const STATUSES = ['New', 'RV', 'Study'] as const;

export interface Person {
  id?: number;
  name: string;
  status?: string;
  date: string; // YYYY-MM-DD
  availability: string;
  address: string;
  latestTopic: string;
  publication: string;
  createdAt: number;
  updatedAt: number;
}

/** One ministry time entry (stored in minutes). */
export interface MinistryLog {
  id?: number;
  date: string; // YYYY-MM-DD (local)
  minutes: number;
  createdAt: number;
}

/** A status was set on a person (on create, or when changed). Used for monthly RV/Study counts. */
export interface StatusEvent {
  id?: number;
  personId: number;
  status: string;
  date: string; // YYYY-MM-DD (local)
  createdAt: number;
}

/** Simple key/value settings. */
export interface Setting {
  key: string;
  value: number;
}

class AppDB extends Dexie {
  people!: Table<Person, number>;
  ministryLogs!: Table<MinistryLog, number>;
  settings!: Table<Setting, string>;
  statusEvents!: Table<StatusEvent, number>;
  constructor() {
    super('peopleLogDB');
    this.version(1).stores({ people: '++id, name, date, updatedAt' });
    this.version(2).stores({
      people: '++id, name, date, updatedAt',
      ministryLogs: '++id, date',
      settings: 'key',
    });
    this.version(3)
      .stores({
        people: '++id, name, date, updatedAt',
        ministryLogs: '++id, date',
        settings: 'key',
        statusEvents: '++id, personId, date, [personId+date]',
      })
      .upgrade(async (tx) => {
        // Backfill: existing people with a status get one event on their last-updated day
        const people = await tx.table('people').toArray();
        const events = people
          .filter((p: Person) => p.status && p.id)
          .map((p: Person) => ({
            personId: p.id!,
            status: p.status!,
            date: isoFromTs(p.updatedAt),
            createdAt: p.updatedAt,
          }));
        await tx.table('statusEvents').bulkAdd(events);
      });
  }
}

export const db = new AppDB();

// Ask the browser to keep data even under storage pressure (best effort on iOS)
navigator.storage?.persist?.().catch(() => {});

export async function exportJSON() {
  const [people, ministryLogs, settings, statusEvents] = await Promise.all([
    db.people.toArray(),
    db.ministryLogs.toArray(),
    db.settings.toArray(),
    db.statusEvents.toArray(),
  ]);
  const blob = new Blob(
    [JSON.stringify({ version: 3, people, ministryLogs, settings, statusEvents }, null, 2)],
    { type: 'application/json' },
  );
  const filename = `people-backup-${todayISO()}.json`;
  const file = new File([blob], filename, { type: 'application/json' });

  // iOS: share sheet lets you "Save to Files" / iCloud Drive
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: filename });
      return;
    } catch {
      /* user cancelled — fall through to download */
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function importJSON(file: File) {
  const data = JSON.parse(await file.text());
  const people: Person[] = Array.isArray(data) ? data : data.people;
  if (!Array.isArray(people)) throw new Error('Invalid backup file');
  const logs: MinistryLog[] = Array.isArray(data.ministryLogs) ? data.ministryLogs : [];
  const settings: Setting[] = Array.isArray(data.settings) ? data.settings : [];
  const events: StatusEvent[] = Array.isArray(data.statusEvents) ? data.statusEvents : [];
  const tables = [db.people, db.ministryLogs, db.settings, db.statusEvents];
  await db.transaction('rw', tables, async () => {
    await db.people.clear();
    await db.people.bulkAdd(people);
    // Older backups have no ministry data — keep current ministry data in that case
    if (data.version >= 2) {
      await db.ministryLogs.clear();
      await db.ministryLogs.bulkAdd(logs);
      await db.settings.clear();
      await db.settings.bulkAdd(settings);
    }
    await db.statusEvents.clear();
    if (data.version >= 3) {
      await db.statusEvents.bulkAdd(events);
    } else {
      // Older backup: create one event per person from their last-updated day
      const restored = await db.people.toArray();
      await db.statusEvents.bulkAdd(
        restored
          .filter((p) => p.status && p.id)
          .map((p) => ({
            personId: p.id!,
            status: p.status!,
            date: isoFromTs(p.updatedAt),
            createdAt: p.updatedAt,
          })),
      );
    }
  });
  return people.length;
}

/* ---------- time helpers ---------- */

export function todayISO() {
  return isoFromTs(Date.now());
}

export function isoFromTs(ts: number) {
  const d = new Date(ts);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/**
 * Parse "hours.minutes" input into minutes.
 *  1.15 → 75   (1h 15m)
 *  .45  → 45
 *  2    → 120
 *  1.5  → 1h 50m is ambiguous, so a single digit after the dot is treated as tens of minutes (1.5 → 1h 50m).
 * Returns null if invalid (e.g. minutes ≥ 60).
 */
export function parseHM(input: string): number | null {
  const s = input.trim();
  if (!/^\d*(\.\d{0,2})?$/.test(s) || s === '' || s === '.') return null;
  const [h = '', m = ''] = s.split('.');
  const hours = h ? parseInt(h, 10) : 0;
  const mins = m ? parseInt(m.padEnd(2, '0'), 10) : 0;
  if (mins >= 60) return null;
  return hours * 60 + mins;
}

/** minutes → "h.mm" (for prefilling edit inputs) */
export function toHM(minutes: number) {
  const m = Math.max(0, Math.round(minutes));
  return `${Math.floor(m / 60)}.${String(m % 60).padStart(2, '0')}`;
}

/** minutes → "3h 30m" */
export function formatHM(minutes: number) {
  const neg = minutes < 0;
  const m = Math.abs(Math.round(minutes));
  const h = Math.floor(m / 60);
  const r = m % 60;
  const s = r === 0 ? `${h}h` : h === 0 ? `${r}m` : `${h}h ${r}m`;
  return neg ? `-${s}` : s;
}

/* ---------- status history ---------- */

/**
 * Record that a person's status was set today.
 * If they already had a status change today, replace it (so same-day corrections don't double-count).
 */
export async function recordStatus(personId: number, status: string) {
  const date = todayISO();
  await db.transaction('rw', db.statusEvents, async () => {
    await db.statusEvents.where({ personId, date }).delete();
    await db.statusEvents.add({ personId, status, date, createdAt: Date.now() });
  });
}

/** Ministry total (minutes) for a month "YYYY-MM", including any manual correction. */
export async function ministryTotalForMonth(month: string) {
  const [logs, adjust] = await Promise.all([
    db.ministryLogs.where('date').startsWith(month).toArray(),
    db.settings.get(`totalAdjustMin:${month}`),
  ]);
  return { logged: logs.reduce((s, l) => s + l.minutes, 0), adjust: adjust?.value ?? 0, logs };
}

/** Number of different people set to each status during a month "YYYY-MM". */
export async function statusCountsForMonth(month: string) {
  const events = await db.statusEvents.where('date').startsWith(month).toArray();
  const byStatus: Record<string, Set<number>> = {};
  for (const e of events) (byStatus[e.status] ??= new Set()).add(e.personId);
  return Object.fromEntries(Object.entries(byStatus).map(([k, v]) => [k, v.size])) as Record<string, number>;
}
