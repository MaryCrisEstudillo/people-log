import { useLiveQuery } from 'dexie-react-hooks';
import { formatHM, ministryTotalForMonth, statusCountsForMonth, todayISO } from './db';

export default function MonthSummary() {
  const month = todayISO().slice(0, 7);
  const monthName = new Date(month + '-01T00:00:00').toLocaleDateString(undefined, { month: 'long' });

  const data = useLiveQuery(async () => {
    const [{ logged, adjust }, counts] = await Promise.all([
      ministryTotalForMonth(month),
      statusCountsForMonth(month),
    ]);
    return { total: logged + adjust, rv: counts['RV'] ?? 0, study: counts['Study'] ?? 0 };
  }, [month]);

  if (!data) return null;

  return (
    <section className="summary">
      <h2>{monthName} report</h2>
      <div className="summary-grid">
        <div>
          <span className="num">{formatHM(data.total)}</span>
          <span className="lbl">Hours</span>
        </div>
        <div>
          <span className="num">{data.rv}</span>
          <span className="lbl">RVs</span>
        </div>
        <div>
          <span className="num">{data.study}</span>
          <span className="lbl">Studies</span>
        </div>
      </div>
    </section>
  );
}
