import { useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { PhotoPicker, type PhotoItem } from '../components/Photos';
import Segmented from '../components/Segmented';
import { GENDERS, STATUSES, db, type Person } from '../db';
import { savePerson, type PersonFields } from '../lib/records';
import { todayISO } from '../lib/time';
import type { From, Go } from '../nav';

// "Inactive" is only offered once a record exists (editing), not when creating
const CREATE_STATUSES = STATUSES.filter((s) => s !== 'Inactive');

function blankFields(): PersonFields {
  return {
    name: '',
    status: 'New',
    gender: '',
    contact: '',
    date: todayISO(), // computed when the form opens, in local time
    availability: '',
    address: '',
    latestTopic: '',
    publication: '',
  };
}

function fieldsOf(p: Person): PersonFields {
  return {
    name: p.name,
    status: p.status ?? 'New',
    gender: p.gender ?? '',
    contact: p.contact ?? '',
    date: p.date,
    availability: p.availability,
    address: p.address,
    latestTopic: p.latestTopic,
    publication: p.publication,
  };
}

export default function FormPage({ id, from, go }: { id?: number; from: From; go: Go }) {
  const existing = useLiveQuery(() => (id ? db.people.get(id) : undefined), [id]);
  if (id !== undefined && existing === undefined) return null; // loading
  return <PersonForm key={id ?? 'new'} id={id} from={from} existing={existing} go={go} />;
}

function PersonForm({ id, from, existing, go }: { id?: number; from: From; existing?: Person; go: Go }) {
  const [f, setF] = useState<PersonFields>(() => (existing ? fieldsOf(existing) : blankFields()));
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const savedPhotoIds = useRef<number[]>([]);
  const [saving, setSaving] = useState(false);

  // Load saved photos when editing; changes are only applied on Save
  useEffect(() => {
    if (!id) return;
    db.photos
      .where({ personId: id })
      .sortBy('createdAt')
      .then((rows) => {
        savedPhotoIds.current = rows.map((r) => r.id!);
        setPhotos(rows.map((r) => ({ key: `db-${r.id}`, blob: r.blob })));
      });
  }, [id]);

  const set = <K extends keyof PersonFields>(key: K, value: PersonFields[K]) =>
    setF((prev) => ({ ...prev, [key]: value }));
  const text =
    (key: 'name' | 'date' | 'availability' | 'address' | 'latestTopic' | 'publication') =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      set(key, e.target.value);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const name = f.name.trim();
    if (!name || saving) return;
    setSaving(true);
    try {
      const keep = new Set(photos.filter((p) => p.key.startsWith('db-')).map((p) => Number(p.key.slice(3))));
      const personId = await savePerson(
        id,
        { ...f, name },
        {
          removeIds: savedPhotoIds.current.filter((pid) => !keep.has(pid)),
          add: photos.filter((p) => p.key.startsWith('new-')).map((p) => p.blob),
        },
        existing?.status,
      );
      go({ name: 'detail', id: personId, from });
    } catch (err) {
      alert('Could not save: ' + (err as Error).message);
      setSaving(false);
    }
  }

  const cancel = () => go(id ? { name: 'detail', id, from } : { name: from });

  return (
    <>
      <header className="bar">
        <button className="link" onClick={cancel}>
          ‹ Cancel
        </button>
        <h1>{id ? 'Edit' : 'New record'}</h1>
        <span />
      </header>

      <form className="form" onSubmit={onSubmit}>
        <label>
          Name *
          <input value={f.name} onChange={text('name')} required autoFocus={!id} />
        </label>

        <div className="field">
          <span>Status</span>
          <Segmented
            options={id ? STATUSES : CREATE_STATUSES}
            value={f.status}
            onChange={(s) => s && set('status', s)}
            danger="Inactive"
          />
        </div>

        <div className="field">
          <span>Gender</span>
          <Segmented options={GENDERS} value={f.gender} onChange={(g) => set('gender', g)} allowClear />
        </div>

        <label>
          Contact number
          <input
            type="tel"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={15}
            placeholder="e.g. 09171234567"
            value={f.contact}
            onChange={(e) => set('contact', e.target.value.replace(/\D/g, ''))}
          />
        </label>

        <label>
          Date
          <input type="date" value={f.date} onChange={text('date')} />
        </label>

        <label>
          Availability
          <textarea
            rows={2}
            value={f.availability}
            onChange={text('availability')}
            placeholder="e.g. Weekdays after 3pm, not available Nov 20–25"
          />
        </label>

        <label>
          Address
          <textarea rows={2} value={f.address} onChange={text('address')} />
        </label>

        <label>
          Latest topic
          <input value={f.latestTopic} onChange={text('latestTopic')} />
        </label>

        <label>
          Publication
          <input value={f.publication} onChange={text('publication')} />
        </label>

        <div className="field">
          <span>Photos (up to 4)</span>
          <PhotoPicker items={photos} onChange={setPhotos} />
        </div>

        <button className="primary block" type="submit" disabled={saving}>
          {saving ? 'Saving…' : id ? 'Save changes' : 'Create'}
        </button>
      </form>
    </>
  );
}
