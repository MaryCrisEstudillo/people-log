import { useLiveQuery } from 'dexie-react-hooks';
import PeopleList from '../components/PeopleList';
import { db } from '../db';
import type { Go } from '../nav';

export default function AllPage({ go }: { go: Go }) {
  const count = useLiveQuery(() => db.people.count(), []);
  return (
    <>
      <header className="bar">
        <button className="link" onClick={() => go({ name: 'home' })}>
          ‹ Home
        </button>
        <h1>All records{count !== undefined && ` (${count})`}</h1>
        <button className="primary compact" onClick={() => go({ name: 'form', from: 'all' })}>
          + Add
        </button>
      </header>
      <PeopleList go={go} from="all" />
    </>
  );
}
