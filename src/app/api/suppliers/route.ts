import { NextResponse } from 'next/server';
import { searchContractors } from '@/app/actions/suppliers';
import { resolveCurrentUser } from '@/lib/auth/provision';

export async function GET(request: Request) {
  const user = await resolveCurrentUser();
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorised' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q') ?? '';
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '10', 10) || 10, 50);

  const results = await searchContractors(q, limit);
  return NextResponse.json({ success: true, data: results });
}
