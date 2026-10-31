/**
 * Pure insight-generation functions — no DB, no async.
 * Input:  array of { fileName, dayData } from parseDayActivities
 * Output: InsightPayload JSON stored in insight_json column
 */

function fmtMins(mins) {
  if (mins == null || isNaN(mins)) return '?';
  const h = Math.floor(mins / 60);
  const r = mins % 60;
  return h > 0 ? (r > 0 ? `${h}j ${r}m` : `${h} jam`) : `${r} mnt`;
}

/**
 * Group activities by name, compute totals and duration-weighted avg score.
 * Returns array sorted by totalMinutes DESC.
 */
export function computeActivityGroups(activities, totalDurationMinutes) {
  if (!activities?.length) return [];
  const map = {};
  for (const a of activities) {
    if (!map[a.name]) map[a.name] = { name: a.name, totalMinutes: 0, count: 0, wscore: 0 };
    map[a.name].totalMinutes += a.durationMinutes;
    map[a.name].count++;
    map[a.name].wscore += a.score * a.durationMinutes;
  }
  const total = totalDurationMinutes
    || activities.reduce((s, a) => s + a.durationMinutes, 0)
    || 1;
  return Object.values(map)
    .map(g => ({
      name:            g.name,
      totalMinutes:    g.totalMinutes,
      count:           g.count,
      avgScore:        Math.round(g.wscore / g.totalMinutes),
      durationPercent: Math.round(g.totalMinutes / total * 1000) / 10,
    }))
    .sort((a, b) => b.totalMinutes - a.totalMinutes);
}

function generateDayInsight(dayData, groups) {
  const { dayName, productivityScore, label, activities = [], completedCount } = dayData;
  if (!activities.length) return `Hari ${dayName ?? '?'}: tidak ada data aktivitas yang terbaca.`;

  const topDur   = groups[0];
  const topScore = [...groups].sort((a, b) => b.avgScore - a.avgScore)[0];
  const scoreStr = productivityScore != null ? ` (${productivityScore}%)` : '';
  const labelStr = label === 'TIDAK PRODUKTIF' ? 'Tidak produktif' : label === 'PRODUKTIF' ? 'Produktif' : 'Skor tersedia';

  let text = `${labelStr}${scoreStr}.`;

  if (topDur) {
    text += ` Aktivitas dominan: "${topDur.name}" mengisi ${topDur.durationPercent}% waktu aktif — ${fmtMins(topDur.totalMinutes)}, ${topDur.count}× sesi, skor rata-rata ${topDur.avgScore}.`;
  }

  if (label === 'TIDAK PRODUKTIF' && topDur?.avgScore < 30) {
    text += ` Faktor utama rendahnya skor: porsi waktu terbesar diisi aktivitas bernilai sangat rendah.`;
  }

  if (topScore && topScore.name !== topDur?.name && topScore.avgScore >= 70) {
    text += ` Aktivitas paling bernilai: "${topScore.name}" (skor ${topScore.avgScore}, ${fmtMins(topScore.totalMinutes)}).`;
  }

  if (completedCount === 0 && activities.length > 3) {
    text += ` Tidak ada aktivitas yang ditandai selesai.`;
  }

  return text;
}

function generateWeekAnalysis(processedDays, avgScore) {
  const validDays = processedDays.filter(d => d.activities?.length > 0);

  // Aggregate activity minutes across all days
  const weekMap   = {};
  let   totalMins = 0;
  for (const day of validDays) {
    for (const g of day.activityGroups) {
      if (!weekMap[g.name]) weekMap[g.name] = { name: g.name, totalMinutes: 0, dayCount: 0, wscore: 0 };
      weekMap[g.name].totalMinutes += g.totalMinutes;
      weekMap[g.name].dayCount++;
      weekMap[g.name].wscore += g.avgScore * g.totalMinutes;
      totalMins += g.totalMinutes;
    }
  }

  const actGroups = Object.values(weekMap)
    .map(g => ({
      name:            g.name,
      totalMinutes:    g.totalMinutes,
      dayCount:        g.dayCount,
      avgScore:        Math.round(g.wscore / g.totalMinutes),
      durationPercent: Math.round(g.totalMinutes / (totalMins || 1) * 1000) / 10,
    }))
    .sort((a, b) => b.totalMinutes - a.totalMinutes);

  const produktifDays    = processedDays.filter(d => d.label === 'PRODUKTIF');
  const tidakProdDays    = processedDays.filter(d => d.label === 'TIDAK PRODUKTIF');
  const scoredDays       = processedDays.filter(d => d.productivityScore != null).sort((a, b) => b.productivityScore - a.productivityScore);
  const bestDay          = scoredDays[0]  ?? null;
  const worstDay         = scoredDays[scoredDays.length - 1] ?? null;
  const topByScore       = [...actGroups].sort((a, b) => b.avgScore - a.avgScore)[0];

  const insights = [];

  if (actGroups[0]) {
    const t = actGroups[0];
    insights.push(
      `"${t.name}" mendominasi minggu ini: ${fmtMins(t.totalMinutes)} total (${t.durationPercent}% waktu aktif), ` +
      `muncul di ${t.dayCount} hari, skor rata-rata ${t.avgScore}.`
    );
  }

  insights.push(
    `${produktifDays.length} hari produktif, ${tidakProdDays.length} hari tidak produktif ` +
    `dari ${processedDays.length} hari yang diproses.`
  );

  if (bestDay && worstDay && bestDay.dayName !== worstDay.dayName) {
    insights.push(
      `Hari terbaik: ${bestDay.dayName} (${bestDay.productivityScore}%) — ` +
      `Hari terburuk: ${worstDay.dayName} (${worstDay.productivityScore}%).`
    );
  }

  if (topByScore && topByScore.name !== actGroups[0]?.name && topByScore.avgScore >= 70) {
    insights.push(
      `Aktivitas paling bernilai selama seminggu: "${topByScore.name}" ` +
      `(skor rata-rata ${topByScore.avgScore}, total ${fmtMins(topByScore.totalMinutes)}).`
    );
  }

  if (tidakProdDays.length > 0) {
    // Find the biggest time-drainer in unproductive days
    const drainerMap = {};
    for (const d of tidakProdDays) {
      for (const g of d.activityGroups) {
        if (g.avgScore < 30) {
          if (!drainerMap[g.name]) drainerMap[g.name] = 0;
          drainerMap[g.name] += g.totalMinutes;
        }
      }
    }
    const topDrainer = Object.entries(drainerMap).sort((a, b) => b[1] - a[1])[0];
    if (topDrainer) {
      insights.push(
        `Aktivitas dengan dampak negatif terbesar pada hari tidak produktif: "${topDrainer[0]}" ` +
        `(skor rendah, total ${fmtMins(topDrainer[1])} di hari-hari tidak produktif).`
      );
    }
  }

  return {
    totalDays:        processedDays.length,
    productiveDays:   produktifDays.length,
    unproductiveDays: tidakProdDays.length,
    avgScore:         avgScore ?? null,
    bestDay:          bestDay  ? { dayName: bestDay.dayName,  score: bestDay.productivityScore }  : null,
    worstDay:         worstDay ? { dayName: worstDay.dayName, score: worstDay.productivityScore } : null,
    topActivity:      actGroups[0]?.name ?? null,
    weekInsights:     insights,
    activityGroups:   actGroups,
  };
}

/**
 * Build the full insight payload from all 7 day files.
 * @param {Array<{ fileName: string, dayData: object|null }>} fileResults
 * @param {{ weekNumber, year, startDate, avgScore }} weekMeta
 */
export function buildInsightPayload(fileResults, weekMeta) {
  const processedDays = fileResults.map((r, i) => {
    const d = r.dayData;
    if (!d) {
      return {
        fileName: r.fileName, dayName: `Hari ${i + 1}`,
        wakeTime: null, productivityScore: null, label: null,
        totalActivities: 0, totalDurationMinutes: null,
        highPriorityCount: null, completedCount: null,
        activities: [], activityGroups: [],
        dayInsight: `Data tidak terbaca dari file ${r.fileName}.`,
      };
    }
    const groups = computeActivityGroups(d.activities, d.totalDurationMinutes);
    return {
      fileName:             r.fileName,
      dayName:              d.dayName ?? `Hari ${i + 1}`,
      wakeTime:             d.wakeTime,
      productivityScore:    d.productivityScore,
      label:                d.label,
      totalActivities:      d.totalActivities,
      totalDurationMinutes: d.totalDurationMinutes,
      highPriorityCount:    d.highPriorityCount,
      completedCount:       d.completedCount,
      activities:           d.activities ?? [],
      activityGroups:       groups,
      dayInsight:           generateDayInsight(d, groups),
    };
  });

  return {
    generatedAt:  new Date().toISOString(),
    weekNumber:   weekMeta.weekNumber,
    year:         weekMeta.year,
    startDate:    weekMeta.startDate,
    days:         processedDays,
    weekAnalysis: generateWeekAnalysis(processedDays, weekMeta.avgScore),
  };
}
