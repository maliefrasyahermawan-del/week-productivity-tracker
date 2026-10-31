import { NextResponse } from 'next/server';
import { deleteSession } from '@/lib/db';
import { clearCookieOptions } from '@/lib/auth';

export async function POST(request) {
  const token = request.cookies.get('session_token')?.value;
  if (token) deleteSession(token);

  const res = NextResponse.json({ success: true });
  res.headers.set('Set-Cookie', clearCookieOptions());
  return res;
}
