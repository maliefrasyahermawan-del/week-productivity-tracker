import { NextResponse } from 'next/server';
import { getAllWeeks, getRecentWeeks, getWeek, getStats } from '@/lib/db';

// Strip the bulky insight_json — send only a boolean flag
function slim(row) {
  const { insight_json, ...rest } = row;
  return { ...rest, insight_json: insight_json ? true : null };
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const week = searchParams.get('week');
    const year = searchParams.get('year');
    const recent = searchParams.get('recent');
    const stats = searchParams.get('stats');

    if (stats === 'true') {
      return NextResponse.json(getStats());
    }
    if (week && year) {
      const row = getWeek(parseInt(week), parseInt(year));
      return NextResponse.json(row ? slim(row) : null);
    }
    if (recent) {
      return NextResponse.json(getRecentWeeks(parseInt(recent) || 12).map(slim));
    }
    return NextResponse.json(getAllWeeks(year ? parseInt(year) : null).map(slim));
  } catch (err) {
    console.error('[/api/weeks]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
