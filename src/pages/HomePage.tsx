import { useRef } from 'react';
import InstallBanner from '../components/InstallBanner';
import Ministry from '../components/Ministry';
import MonthSummary from '../components/MonthSummary';
import PeopleList from '../components/PeopleList';
import { exportJSON, importJSON } from '../lib/backup';
import type { Go } from '../nav';

export default function HomePage({ go }: { go: Go }) {
  return (
    <>
      <InstallBanner />
      <Ministry />
      <header className="bar">
        <h1>People</h1>
        <button className="primary" onClick={() => go({ name: 'form', from: 'home' })}>
          + Add
        </button>
      </header>
      <PeopleList go={go} from="home" preview />
      <MonthSummary />
      <BackupButtons />
    </>
  );
}

function BackupButtons() {
  const fileRef = useRef<HTMLInputElement>(null);

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

  async function onExport() {
    try {
      await exportJSON();
    } catch (err) {
      alert('Export failed: ' + (err as Error).message);
    }
  }

  return (
    <footer className="backup">
      <button onClick={onExport}>Export backup</button>
      <button onClick={() => fileRef.current?.click()}>Import backup</button>
      <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={onImport} />
    </footer>
  );
}
