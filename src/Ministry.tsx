import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, formatHM, ministryTotalForMonth, parseHM, toHM, todayISO } from './db';

const DEFAULT_GOAL_MIN = 30 * 60;

export default function Ministry() {
  const today = todayISO();
  const month = today.slice(0, 7); // YYYY-MM — total resets each month
  const adjustKey = `totalAdjustMin:${month}`;
  const monthLabel = new Date(today + 'T00:00:00').toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });

  const data = useLiveQuery(async () => {
    const [{ logs, logged, adjust }, goal] = await Promise.all([
      ministryTotalForMonth(month),
      db.settings.get('goalMin'),
    ]);
    const todayMin = logs.filter((l) => l.date === today).reduce((s, l) => s + l.minutes, 0);
    const total = logged + adjust;
    return {
      logged,
      todayMin,
      total,
      goal: goal?.value ?? DEFAULT_GOAL_MIN,
      lastToday: logs.filter((l) => l.date === today).at(-1),
    };
  }, [today, month, adjustKey]);

  const [input, setInput] = useState('');
  const [editing, setEditing] = useState<null | 'total' | 'goal'>(null);
  const [editVal, setEditVal] = useState('');

  if (!data) return null;

  const { todayMin, total, goal, logged, lastToday } = data;
  const remaining = Math.max(goal - total, 0);
  const pct = goal > 0 ? Math.min(100, (total / goal) * 100) : 0;

  const parsed = parseHM(input);
  const inputInvalid = input.trim() !== '' && parsed === null;

  async function add() {
    if (!parsed) return;
    await db.ministryLogs.add({ date: today, minutes: parsed, createdAt: Date.now() });
    setInput('');
  }

  async function undoLast() {
    if (!lastToday?.id) return;
    if (!confirm(`Remove last entry (${formatHM(lastToday.minutes)}) from today?`)) return;
    await db.ministryLogs.delete(lastToday.id);
  }

  function startEdit(which: 'total' | 'goal') {
    setEditing(which);
    setEditVal(toHM(which === 'total' ? total : goal));
  }

  const editParsed = parseHM(editVal);

  async function saveEdit() {
    if (editParsed === null) return;
    if (editing === 'total') {
      // Keep the log history; store the difference as this month's adjustment
      await db.settings.put({ key: adjustKey, value: editParsed - logged });
    } else if (editing === 'goal') {
      await db.settings.put({ key: 'goalMin', value: editParsed });
    }
    setEditing(null);
  }

  return (
    <section className="ministry">
      <h2>
        Ministry total <span className="m-month">{monthLabel}</span>
      </h2>

      <div className="m-add">
        <div className="m-input">
          <input
            type="text"
            inputMode="decimal"
            placeholder="Add time today (e.g. 1.15)"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()}
            aria-invalid={inputInvalid}
          />
          <small className={inputInvalid ? 'err' : ''}>
            {inputInvalid
              ? 'Use hours.minutes — minutes must be 00–59'
              : parsed
                ? `= ${formatHM(parsed)}`
                : 'hours.minutes — 1.15 = 1h 15m, .45 = 45m'}
          </small>
        </div>
        <button className="primary" onClick={add} disabled={!parsed}>
          Add
        </button>
      </div>

      <dl className="m-stats">
        <div>
          <dt>Ministry today</dt>
          <dd>
            {formatHM(todayMin)}
            {lastToday && (
              <button className="link small" onClick={undoLast}>
                Undo last
              </button>
            )}
          </dd>
        </div>

        <EditableRow
          label="Ministry total"
          value={formatHM(total)}
          isEditing={editing === 'total'}
          editVal={editVal}
          setEditVal={setEditVal}
          valid={editParsed !== null}
          onEdit={() => startEdit('total')}
          onSave={saveEdit}
          onCancel={() => setEditing(null)}
        />

        <EditableRow
          label="Ministry goal"
          value={formatHM(goal)}
          isEditing={editing === 'goal'}
          editVal={editVal}
          setEditVal={setEditVal}
          valid={editParsed !== null}
          onEdit={() => startEdit('goal')}
          onSave={saveEdit}
          onCancel={() => setEditing(null)}
        />

        <div>
          <dt>Remaining</dt>
          <dd className={remaining === 0 ? 'done' : ''}>
            {remaining === 0 ? 'Goal reached 🎉' : formatHM(remaining)}
          </dd>
        </div>
      </dl>

      <div className="m-bar" role="progressbar" aria-valuenow={Math.round(pct)}>
        <span style={{ width: `${pct}%` }} />
      </div>
    </section>
  );
}

function EditableRow(props: {
  label: string;
  value: string;
  isEditing: boolean;
  editVal: string;
  setEditVal: (v: string) => void;
  valid: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const { label, value, isEditing, editVal, setEditVal, valid, onEdit, onSave, onCancel } = props;
  return (
    <div>
      <dt>{label}</dt>
      {isEditing ? (
        <dd className="m-edit">
          <input
            type="text"
            inputMode="decimal"
            value={editVal}
            autoFocus
            onChange={(e) => setEditVal(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onSave()}
            aria-invalid={!valid}
          />
          <button className="primary small" onClick={onSave} disabled={!valid}>
            Save
          </button>
          <button className="link small" onClick={onCancel}>
            Cancel
          </button>
        </dd>
      ) : (
        <dd>
          {value}
          <button className="link small" onClick={onEdit}>
            Edit
          </button>
        </dd>
      )}
    </div>
  );
}
