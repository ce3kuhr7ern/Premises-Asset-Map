import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { mapAssets, assets, assetTypes } from '@/db/schema';
import { resolveCurrentUser } from '@/lib/auth/provision';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: Request, { params }: RouteContext) {
  const user = await resolveCurrentUser();
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorised' }, { status: 401 });

  const { id } = await params;
  const { label, iconKey } = (await req.json()) as { label?: string; iconKey?: string };
  if (!label || !iconKey) {
    return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
  }

  // Resolve the new asset type
  const [type] = await db
    .select({ id: assetTypes.id })
    .from(assetTypes)
    .where(eq(assetTypes.iconKey, iconKey))
    .limit(1);
  if (!type) {
    return NextResponse.json({ success: false, error: 'Unknown asset type for icon' }, { status: 400 });
  }

  const [updated] = await db
    .update(mapAssets)
    .set({ label: label.trim(), iconKey, updatedAt: new Date() })
    .where(eq(mapAssets.id, id))
    .returning();
  if (!updated) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

  // Sync the canonical asset row
  if (updated.assetId) {
    await db
      .update(assets)
      .set({ name: label.trim(), assetTypeId: type.id, updatedAt: new Date() })
      .where(eq(assets.id, updated.assetId));
  }

  return NextResponse.json({
    success: true,
    data: { id: updated.id, label: updated.label, iconKey: updated.iconKey },
  });
}

export async function DELETE(_req: Request, { params }: RouteContext) {
  const user = await resolveCurrentUser();
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorised' }, { status: 401 });

  const { id } = await params;

  // Soft-remove the placement; the asset record stays in the register
  await db
    .update(mapAssets)
    .set({ removedAt: new Date(), updatedAt: new Date() })
    .where(eq(mapAssets.id, id));

  return NextResponse.json({ success: true });
}
