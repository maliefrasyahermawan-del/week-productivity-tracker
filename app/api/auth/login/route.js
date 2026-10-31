import { NextResponse } from 'next/server';
import { getUserByUsername, createSession } from '@/lib/db';
import { verifyPassword, generateToken, sessionCookieOptions } from '@/lib/auth';

export async function POST(request) {
  try {
    const { username, password } = await request.json();

    if (!username?.trim() || !password)
      return NextResponse.json({ error: 'Username dan password wajib diisi.' }, { status: 400 });

    const user = getUserByUsername(username.trim());
    if (!user || !verifyPassword(password, user.password_hash))
      return NextResponse.json({ error: 'Username atau password salah.' }, { status: 401 });

    const token     = generateToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    createSession(user.id, token, expiresAt);

    const res = NextResponse.json({
      success: true,
      user: { id: user.id, username: user.username, full_name: user.full_name },
    });
    res.headers.set('Set-Cookie', sessionCookieOptions(token, expiresAt));
    return res;
  } catch (err) {
    console.error('[/api/auth/login]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
