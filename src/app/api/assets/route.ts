import { NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db } from '@/db';
import { assets, assetTypes } from '@/db/schema';
import { resolveCurrentUser } from '@/lib/auth/provision';

export async function GET() {
  const user = await resolveCurrentUser();
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorised' }, { status: 401 });

  const rows = await db
    .select({
      id: assets.id,
      name: assets.name,
      serialNumber: assets.serialNumber,
      iconKey: assetTypes.iconKey,
      layer: assetTypes.layer,
      status: assets.status,
      nextInspectionDue: assets.nextInspectionDue,
    })
    .from(assets)
    .leftJoin(assetTypes, eq(assetTypes.id, assets.assetTypeId))
    .where(and(eq(assets.organisationId, user.organisationId), eq(assets.status, 'active')))
    .orderBy(assets.name);

  return NextResponse.json({ success: true, data: rows });
}
