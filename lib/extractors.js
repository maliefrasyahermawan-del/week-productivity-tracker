/**
 * Extracts productivity score AND full activity data from daily schedule PDFs/images.
 */

const PATTERNS = [
  /DAILY\s+PRODUCTIVITY\s+SUMMARY[^\n]{0,80}?(\d+(?:\.\d+)?)\s*%/i,
  /DAILY\s+PRODUCTIVITY\s+SUMMARY[^\n]*\n[^\n]{0,80}?(\d+(?:\.\d+)?)\s*%/i,
  /DAILY\s+PRODUCTIVITY\s+SUMMARY[\s\S]{0,400}?(\d+(?:\.\d+)?)\s*%/i,
];

function matchPercentage(text) {
  for (const pattern of PATTERNS) {
    const m = text.match(pattern);
    if (m) {
      const val = parseFloat(m[1]);
      if (!isNaN(val) && val >= 0 && val <= 100) return val;
    }
  }
  return null;
}

/**
 * Parse full day data from extracted PDF/OCR text.
 *
 * Row format:  {n} {HH:MM} {HH:MM} {dur} mnt {Activity Name} {1-100} {optional detail}
 * Score range: integers 1-100 (uses word-boundary matching so years like 2026 are skipped)
 */
export function parseDayActivities(text) {
  // Day name — "JADWAL HARIAN — SELASA"
  const dayMatch = text.match(/JADWAL\s+HARIAN\s*[—\-–]+\s*([A-Z]+)/i);
  const dayName  = dayMatch ? dayMatch[1].trim().toUpperCase() : null;

  // Wake time
  const wakeMatch = text.match(/Jam\s+Bangun:\s*(\d{1,2}:\d{2})/i);
  const wakeTime  = wakeMatch ? wakeMatch[1] : null;

  // Activity rows: lazy name + word-bounded score (1-100) + optional detail
  const ROW_RE =
    /^\d+\s+(\d{1,2}:\d{2})\s+(\d{1,2}:\d{2})\s+(\d+)\s+mnt\s+(.+?)\s+\b(100|[1-9]\d?)\b\s*(.*)$/gm;
  const activities = [];
  let m;
  while ((m = ROW_RE.exec(text)) !== null) {
    const dur   = parseInt(m[3]);
    const score = parseFloat(m[5]);
    if (dur > 0 && !isNaN(score) && score >= 0 && score <= 100) {
      activities.push({
        start:           m[1],
        end:             m[2],
        durationMinutes: dur,
        name:            m[4].trim(),
        score,
        detail:          m[6].trim() || null,
      });
    }
  }

  // Overall productivity score
  const productivityScore = matchPercentage(text);

  // Day label
  const isNotProduktif = /TIDAK\s+PRODUKTIF/i.test(text);
  const label = isNotProduktif
    ? 'TIDAK PRODUKTIF'
    : /\bPRODUKTIF\b/i.test(text) ? 'PRODUKTIF' : null;

  // Summary stats
  const totalActMatch  = text.match(/Total\s+Aktivitas\s+Terjadwal\s+(\d+)/i);
  const totalDurMatch  = text.match(/Total\s+Durasi\s+Aktif[^0-9]*(\d+)/i);
  const highPrioMatch  = text.match(/Aktivitas\s+HIGH\s+Priority\s+(\d+)/i);
  const completedMatch = text.match(/Aktivitas\s+Selesai[^0-9]*(\d+)/i);

  return {
    dayName,
    wakeTime,
    productivityScore,
    label,
    totalActivities:      totalActMatch  ? parseInt(totalActMatch[1])  : activities.length,
    totalDurationMinutes: totalDurMatch  ? parseInt(totalDurMatch[1])  : null,
    highPriorityCount:    highPrioMatch  ? parseInt(highPrioMatch[1])  : null,
    completedCount:       completedMatch ? parseInt(completedMatch[1]) : null,
    activities,
  };
}

/* ── File extractors ─────────────────────────────────────────────── */

async function getPdfText(buffer) {
  const pdfParse = require('pdf-parse/lib/pdf-parse.js');
  const data     = await pdfParse(buffer);
  return data.text;
}

async function getImageText(buffer) {
  const { createWorker } = await import('tesseract.js');
  const worker           = await createWorker('eng');
  try {
    const { data: { text } } = await worker.recognize(buffer);
    return text;
  } finally {
    await worker.terminate();
  }
}

const IMAGE_EXTS = new Set(['jpg', 'jpeg', 'png', 'bmp', 'tiff', 'tif', 'webp', 'gif']);

function getExt(filename) { return filename.toLowerCase().split('.').pop(); }

export async function extractScoreFromFile(buffer, mimeType, filename) {
  try {
    const ext  = getExt(filename);
    let   text = null;
    if (mimeType === 'application/pdf' || ext === 'pdf')          text = await getPdfText(buffer);
    else if (mimeType?.startsWith('image/') || IMAGE_EXTS.has(ext)) text = await getImageText(buffer);
    else throw new Error(`Unsupported type: ${mimeType ?? ext}`);
    return matchPercentage(text);
  } catch (err) {
    console.error(`[extractor] score fail — ${filename}:`, err.message);
    return null;
  }
}

export async function extractDayDataFromFile(buffer, mimeType, filename) {
  try {
    const ext = getExt(filename);
    let text  = null;
    if (mimeType === 'application/pdf' || ext === 'pdf')            text = await getPdfText(buffer);
    else if (mimeType?.startsWith('image/') || IMAGE_EXTS.has(ext)) text = await getImageText(buffer);
    if (!text) return null;
    return parseDayActivities(text);
  } catch (err) {
    console.error(`[extractor] day-data fail — ${filename}:`, err.message);
    return null;
  }
}
