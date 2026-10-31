'use client';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams }               from 'next/navigation';
import Link                              from 'next/link';
import { format, parseISO, addDays }     from 'date-fns';

/* ── colours ────────────────────────────────────────────────────── */
const LABEL_META = {
  'PRODUKTIF':       { pill: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',   icon: '✅' },
  'TIDAK PRODUKTIF': { pill: 'bg-red-100  dark:bg-red-900/30  text-red-600  dark:text-red-400',    icon: '❌' },
};

/* ── helpers ────────────────────────────────────────────────────── */
function fmtMins(m) {
  if (m == null || isNaN(m)) return '—';
  const h = Math.floor(m / 60), r = m % 60;
  return h > 0 ? (r > 0 ? `${h}j ${r}m` : `${h} jam`) : `${m} mnt`;
}

function dateRange(startDate) {
  if (!startDate) return null;
  try {
    const mon = parseISO(startDate);
    return `${format(mon, 'd MMM')} – ${format(addDays(mon, 6), 'd MMM yyyy')}`;
  } catch { return null; }
}

/* ── sub-components ──────────────────────────────────────────────── */

function ScoreBar({ score, max = 100, height = 'h-2' }) {
  return (
    <div className={`w-full bg-zinc-100 dark:bg-zinc-800 rounded-full ${height}`}>
      <div
        className={`${height} rounded-full bg-blue-500 transition-all`}
        style={{ width: `${Math.max(2, score / max * 100)}%` }}
      />
    </div>
  );
}

function ActivityGroupRow({ g, rank }) {
  const barW = `${Math.max(2, g.durationPercent)}%`;
  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className="text-xs text-zinc-300 dark:text-zinc-600 w-5 text-right flex-shrink-0">{rank}</span>
      <span className="text-sm text-zinc-700 dark:text-zinc-300 flex-1 truncate" title={g.name}>{g.name}</span>
      {/* Duration bar */}
      <div className="w-24 sm:w-36 bg-zinc-100 dark:bg-zinc-800 rounded-full h-2 flex-shrink-0">
        <div className="h-2 rounded-full bg-blue-500" style={{ width: barW }} />
      </div>
      <span className="text-xs text-zinc-500 dark:text-zinc-400 w-16 text-right flex-shrink-0">
        {fmtMins(g.totalMinutes)}
      </span>
      <span className={`text-xs font-semibold w-10 text-right flex-shrink-0 ${g.avgScore >= 70 ? 'text-blue-600 dark:text-blue-400' : g.avgScore < 30 ? 'text-red-500 dark:text-red-400' : 'text-zinc-500'}`}>
        {g.avgScore}
      </span>
    </div>
  );
}

function DayCard({ day }) {
  const meta  = LABEL_META[day.label] ?? {};
  const score = day.productivityScore;

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
      {/* Day header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <span className="text-base font-bold text-zinc-900 dark:text-white">{day.dayName}</span>
          {day.wakeTime && (
            <span className="text-xs text-zinc-400">Bangun {day.wakeTime}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {day.label && (
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${meta.pill}`}>
              {meta.icon} {day.label}
            </span>
          )}
          {score != null && (
            <span className="text-2xl font-bold text-blue-600 dark:text-blue-400 tabular-nums">
              {score.toFixed(1)}%
            </span>
          )}
        </div>
      </div>

      <div className="px-5 py-4 space-y-4">
        {/* Day insight text */}
        <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">{day.dayInsight}</p>

        {/* Stats row */}
        {(day.totalActivities > 0 || day.highPriorityCount != null) && (
          <div className="flex flex-wrap gap-4">
            {day.totalActivities > 0 && (
              <Stat label="Total Aktivitas" value={day.totalActivities} />
            )}
            {day.totalDurationMinutes != null && (
              <Stat label="Durasi Aktif"   value={fmtMins(day.totalDurationMinutes)} />
            )}
            {day.highPriorityCount != null && (
              <Stat label="HIGH Priority"  value={day.highPriorityCount} />
            )}
            {day.completedCount != null && (
              <Stat label="Selesai ✅"     value={day.completedCount} />
            )}
          </div>
        )}

        {/* Activity groups */}
        {day.activityGroups?.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">
              Klasifikasi Aktivitas (Skor = avg, kolom biru = durasi)
            </p>
            <div className="divide-y divide-zinc-50 dark:divide-zinc-800/60">
              {day.activityGroups.map((g, i) => (
                <ActivityGroupRow key={i} g={g} rank={i + 1} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <p className="text-[10px] text-zinc-400 uppercase tracking-wide">{label}</p>
      <p className="text-sm font-bold text-zinc-700 dark:text-zinc-200">{value}</p>
    </div>
  );
}

/* ── Main insight view ──────────────────────────────────────────── */

function InsightsContent() {
  const sp   = useSearchParams();
  const week = sp.get('week');
  const year = sp.get('year');

  const [insight, setInsight] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    if (!week || !year) { setLoading(false); setError('Parameter week dan year diperlukan.'); return; }
    fetch(`/api/insights?week=${week}&year=${year}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) throw new Error(d.error);
        if (!d.insight) throw new Error('no_insight');
        setInsight(d.insight);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [week, year]);

  if (loading) return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-500 border-t-transparent" />
    </div>
  );

  if (error === 'no_insight') return (
    <div className="max-w-xl mx-auto px-6 py-16 text-center">
      <p className="text-4xl mb-4">📭</p>
      <p className="text-zinc-700 dark:text-zinc-300 font-medium mb-2">Insight belum tersedia</p>
      <p className="text-zinc-400 text-sm mb-6">Upload ulang 7 file PDF minggu ini untuk generate insight aktivitas.</p>
      <Link href="/upload" className="inline-block px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors">
        Upload Sekarang →
      </Link>
    </div>
  );

  if (error) return (
    <div className="max-w-xl mx-auto px-6 py-16 text-center">
      <p className="text-red-500 text-sm">{error}</p>
      <Link href="/history" className="mt-4 inline-block text-blue-600 dark:text-blue-400 hover:underline text-sm">
        ← Kembali ke History
      </Link>
    </div>
  );

  const { weekAnalysis, days, weekNumber: wn, year: yr, startDate, generatedAt } = insight;
  const range = dateRange(startDate);

  return (
    <>
      {/* Print CSS — inlined so no extra file needed */}
      <style>{`
        @media print {
          nav, .no-print { display: none !important; }
          body, html { background: white !important; color: #111 !important; }
          * { font-family: Arial, Helvetica, sans-serif !important; color-adjust: exact; }
          .dark * { background-color: white !important; color: #111 !important; }
          .print-root { padding: 0 !important; }
          @page { size: A4 portrait; margin: 1.2cm 1.5cm; }
        }
      `}</style>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 print-root">
        {/* Top bar */}
        <div className="flex items-start justify-between mb-6 no-print">
          <Link href="/history" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">← History</Link>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            🖨️ Cetak / Simpan PDF
          </button>
        </div>

        {/* Title */}
        <div className="mb-7">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
            Insight Produktivitas — Minggu {wn}, {yr}
          </h1>
          {range && <p className="text-zinc-400 text-sm mt-0.5">{range}</p>}
          <p className="text-zinc-300 dark:text-zinc-700 text-xs mt-1">
            Digenerate: {new Date(generatedAt).toLocaleString('id-ID')}
          </p>
        </div>

        {/* ── Week summary card ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {weekAnalysis.avgScore != null && (
            <SumCard label="Rata-rata Skor" value={`${weekAnalysis.avgScore.toFixed(1)}%`} blue />
          )}
          <SumCard label="Hari Produktif"     value={`${weekAnalysis.productiveDays} / ${weekAnalysis.totalDays}`} />
          {weekAnalysis.bestDay && (
            <SumCard label="Hari Terbaik"  value={`${weekAnalysis.bestDay.dayName} (${weekAnalysis.bestDay.score}%)`} />
          )}
          {weekAnalysis.worstDay && (
            <SumCard label="Hari Terburuk" value={`${weekAnalysis.worstDay.dayName} (${weekAnalysis.worstDay.score}%)`} />
          )}
        </div>

        {/* Weekly insights */}
        {weekAnalysis.weekInsights?.length > 0 && (
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/40 rounded-2xl p-5 mb-6">
            <h2 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-3">
              💡 Temuan Utama Minggu Ini
            </h2>
            <ul className="space-y-2">
              {weekAnalysis.weekInsights.map((ins, i) => (
                <li key={i} className="flex gap-2 text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                  <span className="text-blue-500 mt-0.5 flex-shrink-0">›</span>
                  <span>{ins}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Top activities across week */}
        {weekAnalysis.activityGroups?.length > 0 && (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm mb-7">
            <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">
              📊 Distribusi Aktivitas Minggu Ini
            </h2>
            <p className="text-[11px] text-zinc-400 mb-3">Kolom biru = porsi waktu · Angka kanan = skor rata-rata (1–100)</p>
            <div className="divide-y divide-zinc-50 dark:divide-zinc-800/60">
              {weekAnalysis.activityGroups.slice(0, 12).map((g, i) => (
                <ActivityGroupRow key={i} g={g} rank={i + 1} />
              ))}
            </div>
          </div>
        )}

        {/* Per-day breakdown */}
        <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">
          Analisis Per Hari
        </h2>
        <div className="space-y-5">
          {days.map((day, i) => <DayCard key={i} day={day} />)}
        </div>

        {/* Footer (print only) */}
        <div className="mt-10 pt-4 border-t border-zinc-100 dark:border-zinc-800 text-[10px] text-zinc-300 dark:text-zinc-700">
          Productivity Tracker · Insight Minggu {wn}, {yr} · Digenerate {new Date(generatedAt).toLocaleString('id-ID')}
        </div>
      </div>
    </>
  );
}

function SumCard({ label, value, blue }) {
  return (
    <div className={`rounded-xl border p-4 ${blue ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800'}`}>
      <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${blue ? 'text-blue-200' : 'text-zinc-400'}`}>{label}</p>
      <p className={`text-sm font-bold leading-tight ${blue ? 'text-white' : 'text-zinc-900 dark:text-white'}`}>{value}</p>
    </div>
  );
}

/* ── Page export (Suspense for useSearchParams) ────────────────── */
export default function InsightsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-500 border-t-transparent" />
      </div>
    }>
      <InsightsContent />
    </Suspense>
  );
}
