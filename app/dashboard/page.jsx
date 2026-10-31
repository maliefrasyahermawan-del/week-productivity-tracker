'use client';
import { useEffect, useState } from 'react';
import { getISOWeek, getISOWeekYear } from 'date-fns';
import Link from 'next/link';
import ProductivityChart from '@/components/ProductivityChart';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function ScoreBar({ score, size = 'md' }) {
  if (score == null) return null;
  const pct   = Math.min(100, Math.max(0, score));
  const h     = size === 'sm' ? 'h-1' : 'h-1.5';
  return (
    <div className={`w-full bg-zinc-100 dark:bg-zinc-800 rounded-full ${h} mt-1.5`}>
      <div
        className={`bg-blue-500 ${h} rounded-full transition-all duration-700`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function StatCard({ label, value, sub }) {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-sm">
      <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">{label}</p>
      <p className="text-4xl font-bold text-zinc-900 dark:text-white mt-2">{value}</p>
      {sub && <p className="text-xs text-zinc-400 mt-1">{sub}</p>}
    </div>
  );
}

export default function DashboardPage() {
  const now         = new Date();
  const currentWeek = getISOWeek(now);
  const currentYear = getISOWeekYear(now);

  const [weekData,  setWeekData]  = useState(null);
  const [recent,    setRecent]    = useState([]);
  const [stats,     setStats]     = useState(null);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [wRes, rRes, sRes] = await Promise.all([
          fetch(`/api/weeks?week=${currentWeek}&year=${currentYear}`),
          fetch('/api/weeks?recent=12'),
          fetch('/api/weeks?stats=true'),
        ]);
        const [w, r, s] = await Promise.all([wRes.json(), rRes.json(), sRes.json()]);
        setWeekData(w);
        setRecent([...r].reverse());
        setStats(s);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [currentWeek, currentYear]);

  const dateStr = now.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[70vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Dashboard</h1>
        <p className="text-zinc-400 text-sm mt-1">
          {dateStr} · Week {currentWeek}, {currentYear}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard
          label="Weeks Tracked"
          value={stats?.total_weeks ?? 0}
        />
        <StatCard
          label="Overall Average"
          value={stats?.overall_avg != null ? `${stats.overall_avg.toFixed(1)}%` : '—'}
        />
        <StatCard
          label="Best Week"
          value={stats?.best_score != null ? `${stats.best_score.toFixed(1)}%` : '—'}
          sub={stats?.best_week ? `Week ${stats.best_week}, ${stats.best_week_year}` : null}
        />
      </div>

      {/* This week + chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* This week panel */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-5">
            This Week — Week {currentWeek}
          </p>

          {weekData ? (
            <>
              <div className="text-center mb-6">
                <p className="text-5xl font-bold text-blue-600 dark:text-blue-400">
                  {weekData.avg_score?.toFixed(1)}%
                </p>
                <p className="text-zinc-400 text-sm mt-1">Weekly Average</p>
                <ScoreBar score={weekData.avg_score} />
              </div>

              <div className="space-y-2.5">
                {DAY_LABELS.map((day, i) => {
                  const score = weekData[`day${i + 1}_score`];
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
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <p className="text-zinc-400 text-sm mb-4">No data for Week {currentWeek} yet.</p>
              <Link
                href="/upload"
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Upload files →
              </Link>
            </div>
          )}
        </div>

        {/* Chart panel */}
        <div className="lg:col-span-2 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm">
          <div className="flex items-baseline justify-between mb-5">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">
              Productivity Trend
            </p>
            <span className="text-xs text-zinc-400">last 12 weeks</span>
          </div>
          <ProductivityChart data={recent} />
        </div>
      </div>
    </div>
  );
}
