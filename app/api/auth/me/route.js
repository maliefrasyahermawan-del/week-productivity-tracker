import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';

export async function GET(request) {
  const user = getSessionUser(request);
  if (!user) return NextResponse.json(null, { status: 401 });

  // Never return password_hash or security answers
  const { password_hash, favorite_animal, father_name, ...safe } = user;
  return NextResponse.json(safe);
}
