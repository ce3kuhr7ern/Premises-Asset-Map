import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { mapAssets, assets, assetTypes } from '@/db/schema';
import { resolveCurrentUser } from '@/lib/auth/provision';

export async function POST(req: NextRequest) {
  const user = await resolveCurrentUser();
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorised' }, { status: 401 });

  const body = await req.json();
  const { floorPlanId, label, x, y, iconKey } = body as {
    floorPlanId?: string;
    label?: string;
    x?: number;
    y?: number;
    iconKey?: string;
  };

  if (!floorPlanId || !label || x == null || y == null || !iconKey) {
    return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
  }

  // Resolve the asset type from icon_key (the modal sends iconKey, not assetTypeId)
  const [type] = await db
    .select({ id: assetTypes.id })
    .from(assetTypes)
    .where(eq(assetTypes.iconKey, iconKey))
    .limit(1);
  if (!type) {
    return NextResponse.json({ success: false, error: 'Unknown asset type for icon' }, { status: 400 });
  }

  // Create the canonical asset, then the placement that references it
  const [asset] = await db
    .insert(assets)
    .values({
      organisationId: user.organisationId,
      siteId: user.siteId,
      assetTypeId: type.id,
      name: label.trim(),
      status: 'active',
    })
    .returning({ id: assets.id });

  const [placement] = await db
    .insert(mapAssets)
    .values({ floorPlanId, assetId: asset.id, label: label.trim(), x, y, iconKey })
    .returning();

  return NextResponse.json({ success: true, data: placement });
}
