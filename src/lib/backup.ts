import {
  db,
  statusEventsFromPeople,
  type MinistryLog,
  type Person,
  type Photo,
  type Setting,
  type StatusEvent,
} from '../db';
import { blobToDataUrl, dataUrlToBlob } from './images';
import { todayISO } from './time';

/*
 * Backup file versions:
 *   1  people only           3  + status history
 *   2  + ministry time       4  + photos (as data URLs)
 */
const BACKUP_VERSION = 4;

type PhotoJSON = Omit<Photo, 'blob'> & { dataUrl: string };

interface BackupFile {
  version?: number;
  people: Person[];
  ministryLogs?: MinistryLog[];
  settings?: Setting[];
  statusEvents?: StatusEvent[];
  photos?: PhotoJSON[];
}

export async function exportJSON() {
  const [people, ministryLogs, settings, statusEvents, photoRows] = await Promise.all([
    db.people.toArray(),
    db.ministryLogs.toArray(),
    db.settings.toArray(),
    db.statusEvents.toArray(),
    db.photos.toArray(),
  ]);
  const photos: PhotoJSON[] = await Promise.all(
    photoRows.map(async ({ blob, ...rest }) => ({ ...rest, dataUrl: await blobToDataUrl(blob) })),
  );
  const data: BackupFile = { version: BACKUP_VERSION, people, ministryLogs, settings, statusEvents, photos };
  const filename = `people-backup-${todayISO()}.json`;
  const file = new File([JSON.stringify(data)], filename, { type: 'application/json' });

  // iPhone/Android: share sheet → "Save to Files" / iCloud Drive / Drive
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: filename });
      return;
    } catch (err) {
      if ((err as Error).name === 'AbortError') return; // user closed the share sheet
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000); // revoking immediately can cancel Safari downloads
}

/** Replace everything with the contents of a backup file. Returns the number of people restored. */
export async function importJSON(file: File) {
  const raw = JSON.parse(await file.text());
  const data: BackupFile = Array.isArray(raw) ? { version: 1, people: raw } : raw;
  if (!Array.isArray(data.people)) throw new Error('Invalid backup file');
  const version = data.version ?? 1;

  // Decode photos before the transaction (IndexedDB transactions can't wait on fetch)
  const photos: Photo[] = await Promise.all(
    (data.photos ?? []).map(async ({ dataUrl, ...rest }) => ({ ...rest, blob: await dataUrlToBlob(dataUrl) })),
  );

  await db.transaction('rw', [db.people, db.ministryLogs, db.settings, db.statusEvents, db.photos], async () => {
    await db.people.clear();
    await db.people.bulkAdd(data.people);

    // Backups older than v2 have no ministry data — keep what's on the phone
    if (version >= 2) {
      await db.ministryLogs.clear();
      await db.ministryLogs.bulkAdd(data.ministryLogs ?? []);
      await db.settings.clear();
      await db.settings.bulkAdd(data.settings ?? []);
    }

    await db.statusEvents.clear();
    await db.statusEvents.bulkAdd(
      version >= 3 ? (data.statusEvents ?? []) : statusEventsFromPeople(data.people),
    );

    await db.photos.clear();
    await db.photos.bulkAdd(photos);
  });
  return data.people.length;
}
