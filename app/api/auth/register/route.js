import { NextResponse } from 'next/server';
import { createUser, getUserByUsername } from '@/lib/db';
import { hashPassword } from '@/lib/auth';

export async function POST(request) {
  try {
    const { username, password, full_name, origin, status, favorite_animal, father_name } =
      await request.json();

    if (!username?.trim() || !password)
      return NextResponse.json({ error: 'Username dan password wajib diisi.' }, { status: 400 });
    if (password.length < 3)
      return NextResponse.json({ error: 'Password minimal 3 karakter.' }, { status: 400 });
    if (!favorite_animal?.trim() || !father_name?.trim())
      return NextResponse.json({ error: 'Jawaban pertanyaan keamanan wajib diisi.' }, { status: 400 });

    const existing = getUserByUsername(username.trim());
    if (existing)
      return NextResponse.json({ error: 'Username sudah dipakai.' }, { status: 409 });

    createUser({
      username:        username.trim(),
      password_hash:   hashPassword(password),
      full_name:       full_name?.trim() || null,
      origin:          origin?.trim()    || null,
      status:          status            || null,
      favorite_animal,
      father_name,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[/api/auth/register]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
