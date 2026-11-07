import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { DEFAULT_GOAL_MIN, db, settingKeys } from '../db';
import { ministryForMonth } from '../lib/records';
import { currentMonth, formatHM, monthName, parseHM, toHM, todayISO } from '../lib/time';

type Editing = null | 'total' | 'goal';

/** Ministry time card: add today's time, see today/total/goal/remaining. Total resets monthly. */
export default function Ministry() {
  const today = todayISO();
  const month = currentMonth();

  const data = useLiveQuery(async () => {
    const [{ logs, logged, total }, goal] = await Promise.all([
      ministryForMonth(month),
      db.settings.get(settingKeys.goal),
    ]);
    const todayLogs = logs.filter((l) => l.date === today);
    return {
      logged,
      total,
      goal: goal?.value ?? DEFAULT_GOAL_MIN,
      todayMin: todayLogs.reduce((sum, l) => sum + l.minutes, 0),
      lastToday: todayLogs.at(-1),
    };
  }, [today, month]);

  const [input, setInput] = useState('');
  const [editing, setEditing] = useState<Editing>(null);
  const [editVal, setEditVal] = useState('');

  if (!data) return null;

  const { todayMin, total, goal, logged, lastToday } = data;
  const remaining = Math.max(goal - total, 0);
  const pct = goal > 0 ? Math.min(100, (total / goal) * 100) : 0;

  const parsed = parseHM(input);
  const inputInvalid = input.trim() !== '' && parsed === null;
  const editParsed = parseHM(editVal);

  async function add() {
    if (!parsed) return;
    setInput(''); // clear first so a double tap can't add twice
    await db.ministryLogs.add({ date: today, minutes: parsed, createdAt: Date.now() });
  }

  async function undoLast() {
    if (!lastToday?.id) return;
    if (!confirm(`Remove last entry (${formatHM(lastToday.minutes)}) from today?`)) return;
    await db.ministryLogs.delete(lastToday.id);
  }

  function startEdit(which: Exclude<Editing, null>) {
    setEditing(which);
    setEditVal(toHM(which === 'total' ? total : goal));
  }

  async function saveEdit() {
    if (editParsed === null) return;
    if (editing === 'total') {
      // Keep the log history; store the difference as this month's correction
      await db.settings.put({ key: settingKeys.totalAdjust(month), value: editParsed - logged });
    } else if (editing === 'goal') {
      await db.settings.put({ key: settingKeys.goal, value: editParsed });
    }
    setEditing(null);
  }

  const editProps = {
    editVal,
    setEditVal,
    valid: editParsed !== null,
    onSave: saveEdit,
    onCancel: () => setEditing(null),
  };

  return (
    <section className="card ministry">
      <div className="card-head">
        <h2>Ministry total</h2>
        <span className="card-sub">{monthName(month, true)}</span>
      </div>

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
          <small className={inputInvalid ? 'err' : undefined}>
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
          onEdit={() => startEdit('total')}
          {...editProps}
        />
        <EditableRow
          label="Ministry goal"
          value={formatHM(goal)}
          isEditing={editing === 'goal'}
          onEdit={() => startEdit('goal')}
          {...editProps}
        />
        <div>
          <dt>Remaining</dt>
          <dd className={remaining === 0 ? 'done' : undefined}>
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

function EditableRow({
  label,
  value,
  isEditing,
  editVal,
  setEditVal,
  valid,
  onEdit,
  onSave,
  onCancel,
}: {
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
