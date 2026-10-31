'use client';
import { useState, useEffect } from 'react';
import Link                    from 'next/link';
import { useRouter }           from 'next/navigation';
import { format, parseISO, startOfISOWeek, addWeeks, addDays } from 'date-fns';

// Compute Mon of ISO week (fallback when start_date is null in DB)
function isoWeekStart(weekNumber, year) {
  // Jan 4 is always in week 1 of the ISO year
  const jan4 = new Date(year, 0, 4);
  const w1Mon = startOfISOWeek(jan4);
  return addWeeks(w1Mon, weekNumber - 1);
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/* ── Mini bar chart ─────────────────────────────────────────────────── */

function MiniBar({ score }) {
  const h = score != null ? Math.max(10, (score / 100) * 100) : 0;
  return (
    <div className="flex-1 flex flex-col items-center gap-0 h-8">
      {score != null ? (
        <div className="w-full flex items-end h-8">
          <div className="w-full bg-blue-500 rounded-t" style={{ height: `${h}%` }} />
        </div>
      ) : (
        <div className="w-full flex items-end h-8">
          <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-t h-px" />
        </div>
      )}
    </div>
  );
}

/* ── Week card ──────────────────────────────────────────────────────── */

function WeekCard({ week }) {
  const router   = useRouter();
  const [open, setOpen] = useState(false);

  const hasInsight = !!week.insight_json;

  const dateRange = (() => {
    try {
      const mon = week.start_date
        ? parseISO(week.start_date)
        : isoWeekStart(week.week_number, week.year);
      const sun = addDays(mon, 6);
      return `${format(mon, 'MMM d')} – ${format(sun, 'MMM d, yyyy')}`;
    } catch { return null; }
  })();

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm hover:border-zinc-300 dark:hover:border-zinc-600 transition-colors overflow-hidden">
      <div className="p-5 cursor-pointer" onClick={() => setOpen(v => !v)}>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-zinc-400 font-medium uppercase tracking-widest">
              Week {week.week_number} · {week.year}
            </p>
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-0.5">
              {week.avg_score?.toFixed(1)}%
            </p>
            {dateRange && (
              <p className="text-xs text-zinc-400 mt-0.5">{dateRange}</p>
            )}
          </div>
          <span className="text-zinc-300 dark:text-zinc-600 text-xs pt-1">{open ? '▲' : '▼'}</span>
        </div>

        {/* Mini bars */}
        <div className="flex gap-0.5 mt-4">
          {DAY_LABELS.map((_, i) => (
            <MiniBar key={i} score={week[`day${i + 1}_score`]} />
          ))}
        </div>
        <div className="flex gap-0.5 mt-1">
          {DAY_LABELS.map((d) => (
            <p key={d} className="flex-1 text-center text-[10px] text-zinc-300 dark:text-zinc-600">
              {d[0]}
            </p>
          ))}
        </div>

        {/* Insight button */}
        <div className="mt-3 pt-3 border-t border-zinc-50 dark:border-zinc-800 flex justify-end" onClick={e => e.stopPropagation()}>
          <Link
            href={`/insights?week=${week.week_number}&year=${week.year}`}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
              hasInsight
                ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40'
                : 'bg-zinc-50 dark:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'
            }`}
          >
            💡 {hasInsight ? 'Lihat Insight' : 'Belum ada insight'}
          </Link>
        </div>
      </div>

      {/* Expanded */}
      {open && (
        <div className="border-t border-zinc-100 dark:border-zinc-800 px-5 py-4 bg-zinc-50/50 dark:bg-zinc-950/40 space-y-2.5">
          {DAY_LABELS.map((day, i) => {
            const score = week[`day${i + 1}_score`];
            return (
              <div key={day} className="flex items-center gap-3">
                <span className="text-zinc-400 text-xs w-8 flex-shrink-0">{day}</span>
                {score != null ? (
                  <>
                    <div className="flex-1 bg-zinc-100 dark:bg-zinc-800 rounded-full h-1.5">
                      <div
                        className="h-1.5 rounded-full bg-blue-500"
                        style={{ width: `${score}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 w-12 text-right flex-shrink-0">
                      {score.toFixed(1)}%
                    </span>
                  </>
                ) : (
                  <span className="text-zinc-300 dark:text-zinc-600 text-xs">No data</span>
                )}
              </div>
            );
          })}
          <p className="text-[10px] text-zinc-300 dark:text-zinc-700 pt-2 border-t border-zinc-100 dark:border-zinc-800">
            Saved {new Date(week.created_at).toLocaleString()}
          </p>
        </div>
      )}
    </div>
  );
}

/* ── Page ───────────────────────────────────────────────────────────── */

export default function HistoryPage() {
  const [weeks,      setWeeks]   = useState([]);
  const [loading,    setLoading] = useState(true);
  const [yearFilter, setYear]    = useState(new Date().getFullYear());
  const [weekFilter, setWeekF]   = useState('');

  useEffect(() => {
    setLoading(true);
    fetch(`/api/weeks?year=${yearFilter}`)
      .then((r) => r.json())
      .then((d) => setWeeks(Array.isArray(d) ? d : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [yearFilter]);

  const filtered = weekFilter
    ? weeks.filter((w) => w.week_number === +weekFilter)
    : weeks;

  const years = [2024, 2025, 2026, 2027, 2028];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">History</h1>
        <p className="text-zinc-400 text-sm mt-1">Click a card to expand daily breakdown.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm mb-6">
        <div>
          <label className="block text-xs text-zinc-400 mb-1.5">Year</label>
          <select
            value={yearFilter}
            onChange={(e) => { setYear(+e.target.value); setWeekF(''); }}
            className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
          >
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs text-zinc-400 mb-1.5">Week</label>
          <input
            type="number" min="1" max="53" placeholder="All"
            value={weekFilter}
            onChange={(e) => setWeekF(e.target.value)}
            className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white rounded-lg px-3 py-2 text-sm w-24 focus:outline-none focus:border-blue-500"
          />
        </div>

        {weekFilter && (
          <button
            onClick={() => setWeekF('')}
            className="px-3 py-2 text-sm text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
          >
            Reset
          </button>
        )}

        <div className="ml-auto flex items-center gap-3">
          <p className="text-zinc-400 text-sm">{filtered.length} week{filtered.length !== 1 ? 's' : ''}</p>
          <Link
            href="/upload"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            + Upload
          </Link>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-9 w-9 border-2 border-blue-500 border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-zinc-400 mb-4">No weeks recorded for {yearFilter}.</p>
          <Link
            href="/upload"
            className="inline-block px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors"
          >
            Upload files →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((week) => (
            <WeekCard key={`${week.year}-${week.week_number}`} week={week} />
          ))}
        </div>
      )}
    </div>
  );
}
