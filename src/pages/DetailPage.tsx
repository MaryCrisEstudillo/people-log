import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { PhotoGallery } from '../components/Photos';
import { db } from '../db';
import { activatePerson, deletePerson } from '../lib/records';
import { formatDate } from '../lib/time';
import type { From, Go } from '../nav';

export default function DetailPage({ id, from, go }: { id: number; from: From; go: Go }) {
  const person = useLiveQuery(() => db.people.get(id), [id]);
  const photos = useLiveQuery(() => db.photos.where({ personId: id }).sortBy('createdAt'), [id]);
  const photoBlobs = useMemo(() => (photos ?? []).map((p) => p.blob), [photos]);

  if (!person) return null;
  const p = person;
  const inactive = p.status === 'Inactive';
  const back = () => go({ name: from });

  async function onActivate() {
    if (!confirm(`Activate ${p.name}? Status will be set back to New.`)) return;
    await activatePerson(id);
  }

  async function onDelete() {
    if (!confirm(`Delete ${p.name}? This can't be undone.`)) return;
    await deletePerson(id);
    back();
  }

  return (
    <>
      <header className="bar">
        <button className="link" onClick={back}>
          ‹ Back
        </button>
      </header>

      <h2 className="title">{p.name}</h2>
      {inactive && <p className="locked">🔒 Inactive — details are locked. Activate to edit.</p>}
      <PhotoGallery blobs={photoBlobs} />

      <dl className="details">
        <Row label="Status">{p.status}</Row>
        <Row label="Gender">{p.gender}</Row>
        <Row label="Contact number">
          {p.contact && <a href={`tel:${p.contact}`}>{p.contact}</a>}
        </Row>
        <Row label="Date">{formatDate(p.date)}</Row>
        <Row label="Availability">{p.availability}</Row>
        <Row label="Address">{p.address}</Row>
        <Row label="Latest topic">{p.latestTopic}</Row>
        <Row label="Publication">{p.publication}</Row>
      </dl>
      <p className="meta">Last updated {new Date(p.updatedAt).toLocaleString()}</p>

      <div className="actions">
        {inactive ? (
          <button className="success" onClick={onActivate}>
            Activate
          </button>
        ) : (
          <button className="primary" onClick={() => go({ name: 'form', id, from })}>
            Edit
          </button>
        )}
        <button className="danger" onClick={onDelete}>
          Delete
        </button>
      </div>
    </>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{children || '—'}</dd>
    </div>
  );
}
