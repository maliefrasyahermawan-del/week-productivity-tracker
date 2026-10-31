import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { updateUser } from '@/lib/db';

export async function GET(request) {
  const user = getSessionUser(request);
  if (!user) return NextResponse.json(null, { status: 401 });
  const { password_hash, favorite_animal, father_name, ...safe } = user;
  return NextResponse.json(safe);
}

export async function PUT(request) {
  const user = getSessionUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const contentType = request.headers.get('content-type') ?? '';

    if (contentType.includes('multipart/form-data')) {
      // Avatar upload
      const formData = await request.formData();
      const file     = formData.get('avatar');
      if (!file || file.size === 0)
        return NextResponse.json({ error: 'Tidak ada file.' }, { status: 400 });
      if (!file.type.startsWith('image/'))
        return NextResponse.json({ error: 'Harus berupa gambar.' }, { status: 400 });
      if (file.size > 2 * 1024 * 1024)
        return NextResponse.json({ error: 'Gambar maksimal 2 MB.' }, { status: 400 });

      const buffer = Buffer.from(await file.arrayBuffer());
      const b64    = `data:${file.type};base64,${buffer.toString('base64')}`;
      updateUser(user.id, { avatar_base64: b64 });
      return NextResponse.json({ success: true, avatar_base64: b64 });
    }

    // JSON field update
    const { full_name, origin, status, address, bio } = await request.json();
    updateUser(user.id, { full_name, origin, status, address, bio });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[/api/profile PUT]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
