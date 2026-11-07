import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Person } from '../db';
import type { From, Go } from '../nav';

const PREVIEW_COUNT = 5;

const isInactive = (p: Person) => p.status === 'Inactive';
const contains = (text: string | undefined, query: string) =>
  (text ?? '').toLowerCase().includes(query.trim().toLowerCase());

/**
 * People list with name/address search and a Show inactive toggle.
 * Active people (New / RV / Study) always come first; inactive ones only when toggled, at the bottom.
 * `preview` (home page): only the most recently updated few active people, plus a "Show all" button.
 */
export default function PeopleList({ go, from, preview = false }: { go: Go; from: From; preview?: boolean }) {
  const [qName, setQName] = useState('');
  const [qAddress, setQAddress] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const people = useLiveQuery(() => db.people.orderBy('name').toArray(), []);

  if (people === undefined) return null;

  const searching = qName.trim() !== '' || qAddress.trim() !== '';
  const inactiveCount = people.filter(isInactive).length;
  const matches = people.filter((p) => contains(p.name, qName) && contains(p.address, qAddress));
  const active = matches.filter((p) => !isInactive(p));

  const limited = preview && !searching && active.length > PREVIEW_COUNT;
  const activeShown = limited
    ? [...active].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, PREVIEW_COUNT)
    : active;
  const shown = showInactive ? [...activeShown, ...matches.filter(isInactive)] : activeShown;

  const emptyText =
    people.length === 0
      ? 'No records yet. Tap “+ Add”.'
      : matches.length > 0
        ? 'Only inactive records match.'
        : 'No match.';

  return (
    <>
      <div className="searches">
        <input
          className="search"
          type="search"
          placeholder="Search name…"
          value={qName}
          onChange={(e) => setQName(e.target.value)}
        />
        <input
          className="search"
          type="search"
          placeholder="Search address…"
          value={qAddress}
          onChange={(e) => setQAddress(e.target.value)}
        />
      </div>

      {people.length > 0 && (preview || inactiveCount > 0) && (
        <div className="toggle-row">
          {limited && <span className="list-caption">Recently updated</span>}
          {inactiveCount > 0 && (
            <button className="link small" onClick={() => setShowInactive(!showInactive)}>
              {showInactive ? 'Hide inactive' : `Show inactive (${inactiveCount})`}
            </button>
          )}
        </div>
      )}

      {shown.length === 0 ? (
        <p className="empty">{emptyText}</p>
      ) : (
        <ul className="list">
          {shown.map((p) => (
            <li key={p.id} className={isInactive(p) ? 'inactive' : undefined}>
              <button onClick={() => go({ name: 'detail', id: p.id!, from })}>
                <span className="name">{p.name}</span>
                {p.status && <span className={`pill ${p.status.toLowerCase()}`}>{p.status}</span>}
                {p.availability && <span className="sub">{p.availability}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}

      {preview && people.length > 0 && (
        <button className="show-all" onClick={() => go({ name: 'all' })}>
          Show all records ({people.length}) <span aria-hidden>›</span>
        </button>
      )}
    </>
  );
}
