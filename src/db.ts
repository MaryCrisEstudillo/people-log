import Dexie, { type Table } from 'dexie';

export interface Person {
  id?: number;
  name: string;
  date: string; // YYYY-MM-DD
  availability: string;
  address: string;
  latestTopic: string;
  publication: string;
  createdAt: number;
  updatedAt: number;
}

class AppDB extends Dexie {
  people!: Table<Person, number>;
  constructor() {
    super('peopleLogDB');
    this.version(1).stores({ people: '++id, name, date, updatedAt' });
  }
}

export const db = new AppDB();

// Ask the browser to keep data even under storage pressure (best effort on iOS)
navigator.storage?.persist?.().catch(() => {});

export async function exportJSON() {
  const people = await db.people.toArray();
  const blob = new Blob([JSON.stringify({ version: 1, people }, null, 2)], {
    type: 'application/json',
  });
  const filename = `people-backup-${new Date().toISOString().slice(0, 10)}.json`;
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
  await db.transaction('rw', db.people, async () => {
    await db.people.clear();
    await db.people.bulkAdd(people);
  });
  return people.length;
}
