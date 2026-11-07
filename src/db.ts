import Dexie, { type Table } from 'dexie';
import { isoFromTs } from './lib/time';

/* ---------- constants ---------- */

export const STATUSES = ['New', 'RV', 'Study', 'Inactive'] as const;
export const GENDERS = ['Female', 'Male', 'Child'] as const;
export const MAX_PHOTOS = 4;
export const DEFAULT_GOAL_MIN = 30 * 60;

export type Status = (typeof STATUSES)[number];
export type Gender = (typeof GENDERS)[number];

/* ---------- tables ---------- */

export interface Person {
  id?: number;
  name: string;
  status?: Status;
  gender?: Gender | '';
  contact?: string; // digits only
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

/** A status was set on a person (on create, or when changed). Drives monthly RV/Study counts. */
export interface StatusEvent {
  id?: number;
  personId: number;
  status: Status;
  date: string; // YYYY-MM-DD (local)
  createdAt: number;
}

/** A photo attached to a person (max 4 each). */
export interface Photo {
  id?: number;
  personId: number;
  blob: Blob;
  createdAt: number;
}

/** Simple key/value number settings (goal, monthly total corrections). */
export interface Setting {
  key: string;
  value: number;
}

export const settingKeys = {
  goal: 'goalMin',
  totalAdjust: (month: string) => `totalAdjustMin:${month}`,
};

/* ---------- database ---------- */

class AppDB extends Dexie {
  people!: Table<Person, number>;
  ministryLogs!: Table<MinistryLog, number>;
  settings!: Table<Setting, string>;
  statusEvents!: Table<StatusEvent, number>;
  photos!: Table<Photo, number>;

  constructor() {
    super('peopleLogDB');
    // Never edit an old version — add a new one. Existing phones upgrade step by step.
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
        const people: Person[] = await tx.table('people').toArray();
        await tx.table('statusEvents').bulkAdd(statusEventsFromPeople(people));
      });
    this.version(4).stores({
      people: '++id, name, date, updatedAt',
      ministryLogs: '++id, date',
      settings: 'key',
      statusEvents: '++id, personId, date, [personId+date]',
      photos: '++id, personId',
    });
  }
}

export const db = new AppDB();

// Ask the browser to keep data even under storage pressure (best effort on iOS)
navigator.storage?.persist?.().catch(() => {});

/** One status event per person, dated their last update (used for upgrades and old backups). */
export function statusEventsFromPeople(people: Person[]): StatusEvent[] {
  return people
    .filter((p) => p.status && p.id)
    .map((p) => ({
      personId: p.id!,
      status: p.status!,
      date: isoFromTs(p.updatedAt),
      createdAt: p.updatedAt,
    }));
}
