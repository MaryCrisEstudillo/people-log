/* All writes to people, their photos and status history live here, each in one transaction. */
import { db, settingKeys, type Person, type Status } from '../db';
import { todayISO } from './time';

export type PersonFields = Omit<Person, 'id' | 'createdAt' | 'updatedAt'>;

export interface PhotoChanges {
  removeIds: number[];
  add: Blob[];
}

/**
 * Record that a person's status was set today.
 * A second change on the same day replaces the first, so same-day corrections don't double-count.
 * Must be called inside a transaction that includes db.statusEvents.
 */
async function recordStatus(personId: number, status: Status) {
  const date = todayISO();
  await db.statusEvents.where({ personId, date }).delete();
  await db.statusEvents.add({ personId, status, date, createdAt: Date.now() });
}

async function applyPhotos(personId: number, { removeIds, add }: PhotoChanges) {
  if (removeIds.length) await db.photos.bulkDelete(removeIds);
  if (add.length) {
    const now = Date.now();
    await db.photos.bulkAdd(add.map((blob, i) => ({ personId, blob, createdAt: now + i })));
  }
}

/** Create (id undefined) or update a person. Returns the person's id. */
export function savePerson(
  id: number | undefined,
  fields: PersonFields,
  photos: PhotoChanges,
  previousStatus?: Status,
) {
  return db.transaction('rw', [db.people, db.photos, db.statusEvents], async () => {
    const now = Date.now();
    let personId: number;
    if (id) {
      await db.people.update(id, { ...fields, updatedAt: now });
      personId = id;
    } else {
      personId = await db.people.add({ ...fields, createdAt: now, updatedAt: now });
    }
    await applyPhotos(personId, photos);
    if (fields.status && (!id || fields.status !== previousStatus)) {
      await recordStatus(personId, fields.status);
    }
    return personId;
  });
}

/** Inactive → New, keeping all other details. */
export function activatePerson(id: number) {
  return db.transaction('rw', [db.people, db.statusEvents], async () => {
    await db.people.update(id, { status: 'New', updatedAt: Date.now() });
    await recordStatus(id, 'New');
  });
}

/** Delete a person with their photos and status history. */
export function deletePerson(id: number) {
  return db.transaction('rw', [db.people, db.statusEvents, db.photos], async () => {
    await db.people.delete(id);
    await db.statusEvents.where({ personId: id }).delete();
    await db.photos.where({ personId: id }).delete();
  });
}

/* ---------- monthly numbers ---------- */

/** Ministry minutes for a month "YYYY-MM": logged entries plus any manual correction. */
export async function ministryForMonth(month: string) {
  const [logs, adjust] = await Promise.all([
    db.ministryLogs.where('date').startsWith(month).sortBy('createdAt'),
    db.settings.get(settingKeys.totalAdjust(month)),
  ]);
  const logged = logs.reduce((sum, l) => sum + l.minutes, 0);
  const adjustMin = adjust?.value ?? 0;
  return { logs, logged, total: logged + adjustMin };
}

/** How many different people were set to each status during a month "YYYY-MM". */
export async function statusCountsForMonth(month: string) {
  const events = await db.statusEvents.where('date').startsWith(month).toArray();
  const people: Partial<Record<Status, Set<number>>> = {};
  for (const e of events) (people[e.status] ??= new Set()).add(e.personId);
  return (status: Status) => people[status]?.size ?? 0;
}
