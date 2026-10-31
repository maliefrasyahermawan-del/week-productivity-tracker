import { NextResponse } from 'next/server';
import { getWeek }      from '@/lib/db';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const week = parseInt(searchParams.get('week'));
  const year = parseInt(searchParams.get('year'));

  if (!week || !year)
    return NextResponse.json({ error: 'Parameter week dan year diperlukan.' }, { status: 400 });

  const row = getWeek(week, year);
  if (!row)
    return NextResponse.json({ error: 'Data minggu tidak ditemukan.' }, { status: 404 });

  const insight = row.insight_json ? JSON.parse(row.insight_json) : null;
  return NextResponse.json({ insight, weekRow: row });
}
