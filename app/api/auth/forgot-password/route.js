import { NextResponse } from 'next/server';
import { verifySecurityAnswers, updateUser } from '@/lib/db';
import { hashPassword } from '@/lib/auth';

/** POST /api/auth/forgot-password
 *  body: { step: 'verify', username, favorite_animal, father_name }
 *    → 200 { verified: true } or 401
 *  body: { step: 'reset', username, favorite_animal, father_name, new_password }
 *    → 200 { success: true } or 401/400
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { step, username, favorite_animal, father_name } = body;

    const user = verifySecurityAnswers(username?.trim(), favorite_animal, father_name);
    if (!user)
      return NextResponse.json({ error: 'Jawaban keamanan salah atau username tidak ditemukan.' }, { status: 401 });

    if (step === 'verify') {
      return NextResponse.json({ verified: true });
    }

    if (step === 'reset') {
      const { new_password } = body;
      if (!new_password || new_password.length < 3)
        return NextResponse.json({ error: 'Password baru minimal 3 karakter.' }, { status: 400 });
      updateUser(user.id, { password_hash: hashPassword(new_password) });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Step tidak valid.' }, { status: 400 });
  } catch (err) {
    console.error('[/api/auth/forgot-password]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
