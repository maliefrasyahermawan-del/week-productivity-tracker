import { NextResponse }                         from 'next/server';
import { extractScoreFromFile, extractDayDataFromFile } from '@/lib/extractors';
import { upsertWeek, upsertInsight }            from '@/lib/db';
import { buildInsightPayload }                  from '@/lib/insights';

export async function POST(request) {
  try {
    const formData  = await request.formData();
    const weekNumber = parseInt(formData.get('week'));
    const year       = parseInt(formData.get('year'));
    const startDate  = formData.get('start_date') || null;

    if (!weekNumber || weekNumber < 1 || weekNumber > 53)
      return NextResponse.json({ error: 'Week number must be 1–53.' }, { status: 400 });
    if (!year || year < 2000 || year > 2100)
      return NextResponse.json({ error: 'Invalid year.' }, { status: 400 });

    const files = formData.getAll('files').filter(f => f?.size > 0);
    if (!files.length)
      return NextResponse.json({ error: 'No files were uploaded.' }, { status: 400 });

    const dayScores  = [];
    const results    = [];
    const fileResults = [];     // for insight generation

    for (let i = 0; i < Math.min(files.length, 7); i++) {
      const file   = files[i];
      const buffer = Buffer.from(await file.arrayBuffer());

      // Extract score (existing)
      const score = await extractScoreFromFile(buffer, file.type, file.name);
      dayScores.push(score);
      results.push({ day: i + 1, filename: file.name, score });

      // Extract full day data for insight
      const dayData = await extractDayDataFromFile(buffer, file.type, file.name);
      // Merge score from dayData or fallback to extracted score
      if (dayData && dayData.productivityScore == null) dayData.productivityScore = score;
      fileResults.push({ fileName: file.name, dayData });
    }

    const validScores = dayScores.filter(s => s !== null && !isNaN(s));
    if (!validScores.length) {
      return NextResponse.json({
        error: 'No productivity scores found. Ensure each file contains "DAILY PRODUCTIVITY SUMMARY" followed by a percentage.',
        results,
      }, { status: 422 });
    }

    const rawAvg   = validScores.reduce((a, b) => a + b, 0) / validScores.length;
    const avgScore = Math.round(rawAvg * 100) / 100;

    upsertWeek(weekNumber, year, startDate, dayScores, avgScore);

    // Generate and store insight
    try {
      const insight = buildInsightPayload(fileResults, { weekNumber, year, startDate, avgScore });
      upsertInsight(weekNumber, year, insight);
    } catch (insightErr) {
      console.error('[/api/upload] insight generation failed:', insightErr.message);
      // Non-fatal — week data is already saved
    }

    return NextResponse.json({
      success: true,
      week: weekNumber,
      year,
      startDate,
      avgScore,
      filesProcessed: results.length,
      scoresFound:    validScores.length,
      results,
    });
  } catch (err) {
    console.error('[/api/upload]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
