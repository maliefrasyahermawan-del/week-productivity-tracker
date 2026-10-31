'use client';
import { useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  startOfMonth, endOfMonth,
  startOfWeek, endOfWeek,
  eachDayOfInterval,
  isSameMonth, isSameDay, isToday, isWithinInterval,
  startOfISOWeek, endOfISOWeek,
  getISOWeek, getISOWeekYear,
  format, addMonths, subMonths,
} from 'date-fns';

/* ── Calendar ──────────────────────────────────────────────────────── */

const WEEK_DAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const ACCEPTED  = new Set(['pdf','jpg','jpeg','png','bmp','tiff','tif','webp']);

function WeekCalendar({ onWeekSelect, selectedWeekStart }) {
  const [view, setView]       = useState(startOfMonth(new Date()));
  const [hovered, setHovered] = useState(null);

  const gridStart = startOfWeek(view, { weekStartsOn: 1 });
  const gridEnd   = endOfWeek(endOfMonth(view), { weekStartsOn: 1 });
  const days      = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const inWeek = (day, anchor) =>
    anchor && isWithinInterval(day, { start: startOfISOWeek(anchor), end: endOfISOWeek(anchor) });

  const isSelStart = (day) => selectedWeekStart && isSameDay(day, selectedWeekStart);
  const isSelEnd   = (day) => selectedWeekStart && isSameDay(day, endOfISOWeek(selectedWeekStart));

  const handleClick = (day) => {
    const wStart = startOfISOWeek(day);
    const wEnd   = endOfISOWeek(day);
    onWeekSelect({
      weekStart:  wStart,
      weekEnd:    wEnd,
      weekNumber: getISOWeek(day),
      weekYear:   getISOWeekYear(day),
      startDateStr: format(wStart, 'yyyy-MM-dd'),
    });
  };

  return (
    <div className="select-none">
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={() => setView(subMonths(view, 1))}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 transition-colors font-bold"
        >
          ‹
        </button>
        <span className="font-semibold text-zinc-900 dark:text-white">
          {format(view, 'MMMM yyyy')}
        </span>
        <button
          type="button"
          onClick={() => setView(addMonths(view, 1))}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 transition-colors font-bold"
        >
          ›
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 mb-1">
        {WEEK_DAYS.map((d) => (
          <div key={d} className="text-center text-xs font-medium text-zinc-400 py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const inSelected = inWeek(day, selectedWeekStart);
          const inHover    = !selectedWeekStart && inWeek(day, hovered);
          const selStart   = isSelStart(day);
          const selEnd     = isSelEnd(day);
          const inMonth    = isSameMonth(day, view);
          const todayDay   = isToday(day);

          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => handleClick(day)}
              onMouseEnter={() => setHovered(day)}
              onMouseLeave={() => setHovered(null)}
              className={[
                'relative h-9 text-sm transition-all focus:outline-none',
                // Selected week highlight
                inSelected
                  ? 'bg-blue-600 text-white'
                  : inHover
                  ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300'
                  : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200',
                // Rounded pill ends
                selStart ? 'rounded-l-full' : '',
                selEnd   ? 'rounded-r-full' : '',
                // Faded if outside current month
                !inMonth  ? 'opacity-25' : '',
              ].join(' ')}
            >
              <span className={[
                'relative z-10 flex items-center justify-center w-full h-full',
                todayDay && !inSelected ? 'font-bold underline decoration-blue-500' : '',
              ].join(' ')}>
                {format(day, 'd')}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── File row ──────────────────────────────────────────────────────── */

function FileRow({ file, day, result, onRemove }) {
  const ext = file.name.split('.').pop().toUpperCase();
  return (
    <div className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-200 dark:border-zinc-700">
      <div className="flex-shrink-0 w-9 h-9 bg-zinc-200 dark:bg-zinc-700 rounded-lg flex items-center justify-center">
        <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-300">{ext}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">{file.name}</p>
        <p className="text-xs text-zinc-400">Day {day} · {(file.size / 1024).toFixed(0)} KB</p>
      </div>
      {result !== undefined && (
        <span className={`text-sm font-bold flex-shrink-0 ${result?.score != null ? 'text-blue-600 dark:text-blue-400' : 'text-zinc-400'}`}>
          {result?.score != null ? `${result.score.toFixed(1)}%` : 'Not found'}
        </span>
      )}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="flex-shrink-0 text-zinc-300 dark:text-zinc-600 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors text-lg leading-none"
        >
          ×
        </button>
      )}
    </div>
  );
}

/* ── Page ──────────────────────────────────────────────────────────── */

export default function UploadPage() {
  const [selectedWeek, setSelectedWeek] = useState(null);
  const [files,      setFiles]          = useState([]);
  const [isDragging, setDragging]       = useState(false);
  const [processing, setProc]           = useState(false);
  const [results,    setResults]        = useState(null);
  const [error,      setError]          = useState(null);
  const inputRef = useRef(null);

  const addFiles = useCallback((incoming) => {
    const valid = Array.from(incoming).filter((f) => ACCEPTED.has(f.name.toLowerCase().split('.').pop()));
    setFiles((prev) => [...prev, ...valid].slice(0, 7));
    setResults(null);
    setError(null);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files);
  }, [addFiles]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedWeek || !files.length) return;
    setProc(true); setResults(null); setError(null);

    const fd = new FormData();
    fd.append('week',       selectedWeek.weekNumber);
    fd.append('year',       selectedWeek.weekYear);
    fd.append('start_date', selectedWeek.startDateStr);
    files.forEach((f) => fd.append('files', f));

    try {
      const res  = await fetch('/api/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Upload failed.'); if (data.results) setResults(data.results); }
      else          { setResults(data.results); }
    } catch (err) {
      setError(err.message);
    } finally {
      setProc(false);
    }
  };

  const validResults = results?.filter((r) => r.score != null) ?? [];
  const avgDisplay   = validResults.length
    ? (validResults.reduce((a, b) => a + b.score, 0) / validResults.length).toFixed(1)
    : null;

  const canSubmit = !!selectedWeek && files.length > 0 && !processing;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-1">Upload Weekly Files</h1>
      <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-8">
        Pick a week from the calendar, then upload up to 7 daily schedule files.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* ── Calendar card ── */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-sm">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-4">
            Step 1 — Select Week
          </p>
          <WeekCalendar
            onWeekSelect={(w) => { setSelectedWeek(w); setResults(null); setError(null); }}
            selectedWeekStart={selectedWeek?.weekStart ?? null}
          />

          {/* Selected week label */}
          <div className={`mt-4 rounded-xl px-4 py-3 text-sm transition-all ${
            selectedWeek
              ? 'bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800'
              : 'bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700'
          }`}>
            {selectedWeek ? (
              <p className="text-blue-700 dark:text-blue-300 font-medium">
                ✓ Week {selectedWeek.weekNumber}, {selectedWeek.weekYear}
                &nbsp;—&nbsp;
                {format(selectedWeek.weekStart, 'MMM d')} → {format(selectedWeek.weekEnd, 'MMM d, yyyy')}
              </p>
            ) : (
              <p className="text-zinc-400 dark:text-zinc-500">Click any date to select that week</p>
            )}
          </div>
        </div>

        {/* ── Drop zone ── */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-sm">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-4">
            Step 2 — Upload Files (max 7)
          </p>

          <div
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onClick={() => inputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
                : 'border-zinc-200 dark:border-zinc-700 hover:border-blue-400 dark:hover:border-blue-600 hover:bg-zinc-50 dark:hover:bg-zinc-800/40'
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.bmp,.tiff,.tif,.webp"
              onChange={(e) => addFiles(e.target.files)}
              className="hidden"
            />
            <div className="text-3xl mb-2">{isDragging ? '📂' : '📁'}</div>
            <p className="text-zinc-700 dark:text-zinc-300 font-medium">
              {isDragging ? 'Drop to add' : 'Drop files or click to browse'}
            </p>
            <p className="text-zinc-400 text-xs mt-1">
              PDF / JPG / PNG / BMP&nbsp;&nbsp;·&nbsp;&nbsp;
              <span className={files.length === 7 ? 'text-blue-500 font-semibold' : ''}>
                {files.length}/7
              </span>
            </p>
          </div>

          {/* File list */}
          {files.length > 0 && (
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs text-zinc-400">Files selected</p>
                <button
                  type="button"
                  onClick={() => { setFiles([]); setResults(null); setError(null); }}
                  className="text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
                >
                  Clear all
                </button>
              </div>
              {files.map((f, i) => {
                const res = results?.find((r) => r.filename === f.name);
                return (
                  <FileRow
                    key={i}
                    file={f}
                    day={i + 1}
                    result={results ? res : undefined}
                    onRemove={processing ? null : () => setFiles((prev) => prev.filter((_, j) => j !== i))}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-4">
            <p className="text-red-600 dark:text-red-400 text-sm font-medium">⚠️ {error}</p>
          </div>
        )}

        {/* Success */}
        {results && !error && (
          <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 p-5">
            <p className="text-blue-700 dark:text-blue-300 font-semibold mb-1">✓ Saved successfully</p>
            <p className="text-zinc-600 dark:text-zinc-300 text-sm">
              Week {selectedWeek?.weekNumber}, {selectedWeek?.weekYear} average:&nbsp;
              <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {avgDisplay != null ? `${avgDisplay}%` : '—'}
              </span>
            </p>
            <p className="text-zinc-400 text-xs mt-1">
              {validResults.length}/{results.length} files extracted successfully
            </p>
            <div className="flex gap-2 mt-3">
              <Link
                href="/dashboard"
                className="text-sm px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                View Dashboard →
              </Link>
              <button
                type="button"
                onClick={() => { setFiles([]); setResults(null); setError(null); setSelectedWeek(null); }}
                className="text-sm px-4 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg transition-colors"
              >
                Upload another week
              </button>
            </div>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-100 dark:disabled:bg-zinc-800 disabled:text-zinc-400 dark:disabled:text-zinc-500 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
        >
          {processing ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              Processing… (OCR may take ~30s per image)
            </>
          ) : (
            'Process & Save to Database'
          )}
        </button>
      </form>
    </div>
  );
}
