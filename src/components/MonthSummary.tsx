import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ministryForMonth, statusCountsForMonth } from '../lib/records';
import { currentMonth, formatHM, monthName, prevMonth } from '../lib/time';
import Segmented from './Segmented';

/** Monthly report (hours, RVs, Studies) for this month or last month. */
export default function MonthSummary() {
  const current = currentMonth();
  const previous = prevMonth(current);
  const [month, setMonth] = useState(current);
  // If the month rolls over while the app is open, fall back to the new current month
  const shownMonth = month === current || month === previous ? month : current;

  const data = useLiveQuery(async () => {
    const [{ total }, count] = await Promise.all([
      ministryForMonth(shownMonth),
      statusCountsForMonth(shownMonth),
    ]);
    return { total, rv: count('RV'), study: count('Study') };
  }, [shownMonth]);

  if (!data) return null;

  return (
    <section className="card summary">
      <div className="card-head">
        <h2>{monthName(shownMonth)} report</h2>
        <Segmented
          size="small"
          options={[previous, current]}
          value={shownMonth}
          onChange={(m) => m && setMonth(m)}
          label={(m) => monthName(m).slice(0, 3)}
        />
      </div>
      <div className="summary-grid">
        <Stat value={formatHM(data.total)} label="Hours" />
        <Stat value={data.rv} label="RVs" />
        <Stat value={data.study} label="Studies" />
      </div>
    </section>
  );
}

function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <div>
      <span className="num">{value}</span>
      <span className="lbl">{label}</span>
    </div>
  );
}
