import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db, settingKeys } from '../../db';
import { activatePerson, deletePerson, ministryForMonth, savePerson, statusCountsForMonth } from '../records';
import type { PersonFields } from '../records';

const noPhotos = { removeIds: [], add: [] };
const fields = (name: string, status: PersonFields['status'] = 'New'): PersonFields => ({
  name,
  status,
  gender: '',
  contact: '',
  date: '2026-11-01',
  availability: '',
  address: '',
  latestTopic: '',
  publication: '',
});

/** Pretend it's this local day. */
const onDay = (iso: string) => vi.setSystemTime(new Date(`${iso}T10:00:00`));

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  await Promise.all(db.tables.map((t) => t.clear()));
});
afterEach(() => vi.useRealTimers());

describe('monthly RV / Study counts', () => {
  it('matches the Ana / Lena / Sheila scenario (RV 2, Study 2)', async () => {
    onDay('2026-11-01');
    const ana = await savePerson(undefined, fields('Ana'), noPhotos);
    onDay('2026-11-02');
    const lena = await savePerson(undefined, fields('Lena'), noPhotos);

    onDay('2026-11-03');
    await savePerson(ana, fields('Ana', 'RV'), noPhotos, 'New');
    await savePerson(lena, fields('Lena', 'RV'), noPhotos, 'New');

    onDay('2026-11-06');
    await savePerson(ana, fields('Ana', 'Study'), noPhotos, 'RV');
    await savePerson(undefined, fields('Sheila', 'Study'), noPhotos);

    const count = await statusCountsForMonth('2026-11');
    expect(count('RV')).toBe(2);
    expect(count('Study')).toBe(2);
    expect((await statusCountsForMonth('2026-12'))('RV')).toBe(0);
  });

  it('a same-day correction replaces the earlier status', async () => {
    onDay('2026-11-06');
    const id = await savePerson(undefined, fields('Mistake', 'RV'), noPhotos);
    await savePerson(id, fields('Mistake', 'New'), noPhotos, 'RV');
    expect((await statusCountsForMonth('2026-11'))('RV')).toBe(0);
  });

  it('saving without changing status adds no event', async () => {
    onDay('2026-11-03');
    const id = await savePerson(undefined, fields('Ana', 'RV'), noPhotos);
    onDay('2026-11-04');
    await savePerson(id, { ...fields('Ana', 'RV'), address: 'Poblacion' }, noPhotos, 'RV');
    expect(await db.statusEvents.count()).toBe(1);
  });
});

describe('activate / delete', () => {
  it('activate sets Inactive back to New and keeps details', async () => {
    onDay('2026-11-07');
    const id = await savePerson(undefined, { ...fields('Bea'), address: 'Calutan' }, noPhotos);
    await savePerson(id, { ...fields('Bea', 'Inactive'), address: 'Calutan' }, noPhotos, 'New');
    await activatePerson(id);
    const bea = await db.people.get(id);
    expect(bea?.status).toBe('New');
    expect(bea?.address).toBe('Calutan');
  });

  it('delete removes the person, their photos and status history', async () => {
    onDay('2026-11-07');
    const id = await savePerson(undefined, fields('Temp', 'Study'), {
      removeIds: [],
      add: [new Blob(['a']), new Blob(['b'])],
    });
    expect(await db.photos.count()).toBe(2);
    await deletePerson(id);
    expect(await db.people.count()).toBe(0);
    expect(await db.photos.count()).toBe(0);
    expect(await db.statusEvents.count()).toBe(0);
  });

  it('photo changes remove and add in one save', async () => {
    onDay('2026-11-07');
    const id = await savePerson(undefined, fields('Ana'), { removeIds: [], add: [new Blob(['1']), new Blob(['2'])] });
    const [first] = await db.photos.where({ personId: id }).sortBy('createdAt');
    await savePerson(id, fields('Ana'), { removeIds: [first.id!], add: [new Blob(['3'])] }, 'New');
    expect(await db.photos.where({ personId: id }).count()).toBe(2);
  });
});

describe('ministry total', () => {
  it('sums the month, applies the correction, and ignores other months', async () => {
    await db.ministryLogs.bulkAdd([
      { date: '2026-10-31', minutes: 600, createdAt: 1 },
      { date: '2026-11-03', minutes: 90, createdAt: 2 },
      { date: '2026-11-04', minutes: 120, createdAt: 3 },
    ]);
    expect((await ministryForMonth('2026-11')).total).toBe(210); // 3h 30m

    await db.settings.put({ key: settingKeys.totalAdjust('2026-11'), value: -30 });
    expect((await ministryForMonth('2026-11')).total).toBe(180);
    expect((await ministryForMonth('2026-12')).total).toBe(0); // monthly reset
  });
});
