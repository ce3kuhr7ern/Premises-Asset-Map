import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { assetTypes } from '@/db/schema';

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ success: false, error: 'Unauthorised' }, { status: 401 });

  const types = await db
    .select({
      id: assetTypes.id,
      name: assetTypes.name,
      iconKey: assetTypes.iconKey,
      layer: assetTypes.layer,
    })
    .from(assetTypes)
    .where(eq(assetTypes.isActive, true))
    .orderBy(assetTypes.name);

  return NextResponse.json({ success: true, data: types });
}
