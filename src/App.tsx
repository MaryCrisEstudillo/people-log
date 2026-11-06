import { useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { STATUSES, recordStatus, db, exportJSON, importJSON, type Person } from './db';
import InstallBanner from './InstallBanner';
import Ministry from './Ministry';
import MonthSummary from './MonthSummary';

type View =
  | { name: 'list' }
  | { name: 'detail'; id: number }
  | { name: 'form'; id?: number };

export default function App() {
  const [view, setView] = useState<View>({ name: 'list' });

  return (
    <div className="app">
      {view.name === 'list' && <ListPage go={setView} />}
      {view.name === 'detail' && <DetailPage id={view.id} go={setView} />}
      {view.name === 'form' && <FormPage id={view.id} go={setView} />}
    </div>
  );
}

/* ---------- Page 1: list of names ---------- */
function ListPage({ go }: { go: (v: View) => void }) {
  const [q, setQ] = useState('');
  const people = useLiveQuery(() => db.people.orderBy('name').toArray(), []);
  const fileRef = useRef<HTMLInputElement>(null);

  const filtered = (people ?? []).filter((p) =>
    p.name.toLowerCase().includes(q.toLowerCase()),
  );

  async function onImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!confirm('Importing will REPLACE all current records. Continue?')) return;
    try {
      const n = await importJSON(file);
      alert(`Imported ${n} record(s).`);
    } catch (err) {
      alert('Import failed: ' + (err as Error).message);
    }
  }

  return (
    <>
      <InstallBanner />
      <Ministry />
      <header className="bar">
        <h1>People</h1>
        <button className="primary" onClick={() => go({ name: 'form' })}>
          + Add
        </button>
      </header>

      <input
        className="search"
        type="search"
        placeholder="Search name…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />

      {people === undefined ? null : filtered.length === 0 ? (
        <p className="empty">
          {people.length === 0 ? 'No records yet. Tap “+ Add”.' : 'No match.'}
        </p>
      ) : (
        <ul className="list">
          {filtered.map((p) => (
            <li key={p.id}>
              <button onClick={() => go({ name: 'detail', id: p.id! })}>
                <span className="name">{p.name}</span>
                {p.status && <span className={`pill ${p.status.toLowerCase()}`}>{p.status}</span>}
                {p.availability && <span className="sub">{p.availability}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}

      <MonthSummary />

      <footer className="backup">
        <button onClick={exportJSON}>Export backup</button>
        <button onClick={() => fileRef.current?.click()}>Import backup</button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={onImport}
        />
      </footer>
    </>
  );
}

/* ---------- Details ---------- */
function DetailPage({ id, go }: { id: number; go: (v: View) => void }) {
  const p = useLiveQuery(() => db.people.get(id), [id]);

  if (p === undefined) return null;

  async function onDelete() {
    if (!confirm(`Delete ${p!.name}? This can't be undone.`)) return;
    await db.transaction('rw', db.people, db.statusEvents, async () => {
      await db.people.delete(id);
      await db.statusEvents.where({ personId: id }).delete();
    });
    go({ name: 'list' });
  }

  return (
    <>
      <header className="bar">
        <button className="link" onClick={() => go({ name: 'list' })}>
          ‹ Back
        </button>
      </header>

      <h2 className="title">{p.name}</h2>
      <dl className="details">
        <Row label="Status" value={p.status ?? ''} />
        <Row label="Date" value={formatDate(p.date)} />
        <Row label="Availability" value={p.availability} />
        <Row label="Address" value={p.address} />
        <Row label="Latest topic" value={p.latestTopic} />
        <Row label="Publication" value={p.publication} />
      </dl>
      <p className="meta">Last updated {new Date(p.updatedAt).toLocaleString()}</p>

      <div className="actions">
        <button className="primary" onClick={() => go({ name: 'form', id })}>
          Edit
        </button>
        <button className="danger" onClick={onDelete}>
          Delete
        </button>
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value || '—'}</dd>
    </div>
  );
}

/* ---------- Create / Edit form ---------- */
const empty = {
  name: '',
  status: STATUSES[0] as string,
  date: new Date().toISOString().slice(0, 10),
  availability: '',
  address: '',
  latestTopic: '',
  publication: '',
};

function FormPage({ id, go }: { id?: number; go: (v: View) => void }) {
  const existing = useLiveQuery(() => (id ? db.people.get(id) : undefined), [id]);
  const loading = id !== undefined && existing === undefined;

  if (loading) return null;
  return <Form key={id ?? 'new'} id={id} initial={existing ?? empty} go={go} />;
}

function Form({
  id,
  initial,
  go,
}: {
  id?: number;
  initial: typeof empty | Person;
  go: (v: View) => void;
}) {
  const [f, setF] = useState({
    name: initial.name,
    status: initial.status ?? STATUSES[0],
    date: initial.date,
    availability: initial.availability,
    address: initial.address,
    latestTopic: initial.latestTopic,
    publication: initial.publication,
  });

  const set =
    (k: keyof typeof f) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setF({ ...f, [k]: e.target.value });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const data = { ...f, name: f.name.trim() };
    if (!data.name) return;
    const now = Date.now();
    if (id) {
      await db.people.update(id, { ...data, updatedAt: now });
      if (data.status !== initial.status) await recordStatus(id, data.status);
      go({ name: 'detail', id });
    } else {
      const newId = await db.people.add({ ...data, createdAt: now, updatedAt: now });
      await recordStatus(newId, data.status);
      go({ name: 'detail', id: newId });
    }
  }

  return (
    <>
      <header className="bar">
        <button
          className="link"
          onClick={() => go(id ? { name: 'detail', id } : { name: 'list' })}
        >
          ‹ Cancel
        </button>
        <h1>{id ? 'Edit' : 'New record'}</h1>
        <span />
      </header>

      <form className="form" onSubmit={onSubmit}>
        <label>
          Name *
          <input value={f.name} onChange={set('name')} required autoFocus={!id} />
        </label>
        <label>
          Status
          <div className="segmented" role="radiogroup">
            {STATUSES.map((t) => (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={f.status === t}
                className={f.status === t ? 'on' : ''}
                onClick={() => setF({ ...f, status: t })}
              >
                {t}
              </button>
            ))}
          </div>
        </label>
        <label>
          Date
          <input type="date" value={f.date} onChange={set('date')} />
        </label>
        <label>
          Availability
          <textarea
            rows={2}
            value={f.availability}
            onChange={set('availability')}
            placeholder="e.g. Weekdays after 3pm, not available Nov 20–25"
          />
        </label>
        <label>
          Address
          <textarea rows={2} value={f.address} onChange={set('address')} />
        </label>
        <label>
          Latest topic
          <input value={f.latestTopic} onChange={set('latestTopic')} />
        </label>
        <label>
          Publication
          <input value={f.publication} onChange={set('publication')} />
        </label>
        <button className="primary block" type="submit">
          {id ? 'Save changes' : 'Create'}
        </button>
      </form>
    </>
  );
}

/* ---------- helpers ---------- */
function formatDate(d: string) {
  if (!d) return '';
  const dt = new Date(d + 'T00:00:00');
  return dt.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}
