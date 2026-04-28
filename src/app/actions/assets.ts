'use server';

import { revalidatePath } from 'next/cache';
import { eq, and, isNotNull, sql } from 'drizzle-orm';
import { db } from '@/db';
import { assets, mapAssets, assetTypes } from '@/db/schema';
import { resolveCurrentUser } from '@/lib/auth/provision';
import { can } from '@/lib/auth/can';
import { Permission } from '@/lib/auth/permissions';

type ActionResult<T = undefined> =
  | (T extends undefined ? { success: true } : { success: true; data: T })
  | { success: false; error: string };

export interface AssetFormData {
  name: string;
  assetTypeId: string;
  serialNumber?: string | null;
  manufacturer?: string | null;
  model?: string | null;
  installedAt?: string | null;     // ISO date (YYYY-MM-DD)
  purchasedAt?: string | null;
  warrantyExpiresAt?: string | null;
  lastInspectedAt?: string | null;
  notes?: string | null;
}

function validate(data: AssetFormData): string | null {
  const name = data.name?.trim();
  if (!name) return 'Name is required.';
  if (name.length > 200) return 'Name must be under 200 characters.';
  if (!data.assetTypeId) return 'Asset type is required.';

  if (data.serialNumber && data.serialNumber.length > 100) return 'Serial number too long.';
  for (const f of ['manufacturer', 'model'] as const) {
    const v = data[f];
    if (v && v.length > 200) return `${f.charAt(0).toUpperCase() + f.slice(1)} too long.`;
  }
  return null;
}

async function computeNextInspectionDue(
  assetTypeId: string,
  lastInspectedAt: string | null | undefined,
): Promise<string | null> {
  if (!lastInspectedAt) return null;
  const [type] = await db
    .select({ days: assetTypes.inspectionIntervalDays })
    .from(assetTypes)
    .where(eq(assetTypes.id, assetTypeId))
    .limit(1);
  if (!type?.days) return null;

  const last = new Date(lastInspectedAt);
  if (Number.isNaN(last.getTime())) return null;
  last.setDate(last.getDate() + type.days);
  return last.toISOString().slice(0, 10);
}

export async function createAsset(data: AssetFormData): Promise<ActionResult<{ id: string }>> {
  const user = await resolveCurrentUser();
  if (!user) return { success: false, error: 'Unauthorised.' };
  if (!(await can(user.clerkId, Permission.EditAsset))) {
    return { success: false, error: 'Insufficient permissions.' };
  }

  const validationError = validate(data);
  if (validationError) return { success: false, error: validationError };

  const [type] = await db
    .select({ id: assetTypes.id })
    .from(assetTypes)
    .where(eq(assetTypes.id, data.assetTypeId))
    .limit(1);
  if (!type) return { success: false, error: 'Invalid asset type.' };

  const nextDue = await computeNextInspectionDue(data.assetTypeId, data.lastInspectedAt);

  try {
    const [asset] = await db
      .insert(assets)
      .values({
        organisationId: user.organisationId,
        siteId: user.siteId,
        assetTypeId: data.assetTypeId,
        name: data.name.trim(),
        serialNumber: data.serialNumber?.trim() || null,
        manufacturer: data.manufacturer?.trim() || null,
        model: data.model?.trim() || null,
        installedAt: data.installedAt || null,
        purchasedAt: data.purchasedAt || null,
        warrantyExpiresAt: data.warrantyExpiresAt || null,
        lastInspectedAt: data.lastInspectedAt || null,
        nextInspectionDue: nextDue,
        notes: data.notes?.trim() || null,
      })
      .returning({ id: assets.id });
    revalidatePath('/assets');
    return { success: true, data: { id: asset.id } };
  } catch (err) {
    console.error('[createAsset]', err);
    return { success: false, error: 'Could not create asset.' };
  }
}

export async function updateAsset(id: string, data: AssetFormData): Promise<ActionResult> {
  const user = await resolveCurrentUser();
  if (!user) return { success: false, error: 'Unauthorised.' };
  if (!(await can(user.clerkId, Permission.EditAsset))) {
    return { success: false, error: 'Insufficient permissions.' };
  }

  const validationError = validate(data);
  if (validationError) return { success: false, error: validationError };

  const nextDue = await computeNextInspectionDue(data.assetTypeId, data.lastInspectedAt);

  try {
    const [updated] = await db
      .update(assets)
      .set({
        assetTypeId: data.assetTypeId,
        name: data.name.trim(),
        serialNumber: data.serialNumber?.trim() || null,
        manufacturer: data.manufacturer?.trim() || null,
        model: data.model?.trim() || null,
        installedAt: data.installedAt || null,
        purchasedAt: data.purchasedAt || null,
        warrantyExpiresAt: data.warrantyExpiresAt || null,
        lastInspectedAt: data.lastInspectedAt || null,
        nextInspectionDue: nextDue,
        notes: data.notes?.trim() || null,
        updatedAt: new Date(),
      })
      .where(and(eq(assets.id, id), eq(assets.organisationId, user.organisationId)))
      .returning({ id: assets.id });

    if (!updated) return { success: false, error: 'Asset not found.' };

    // Keep map_assets denormalised cache in sync
    await db
      .update(mapAssets)
      .set({ label: data.name.trim(), updatedAt: new Date() })
      .where(eq(mapAssets.assetId, id));

    revalidatePath('/assets');
    revalidatePath(`/assets/${id}`);
    return { success: true };
  } catch (err) {
    console.error('[updateAsset]', err);
    return { success: false, error: 'Could not update asset.' };
  }
}

export async function archiveAsset(id: string): Promise<ActionResult> {
  const user = await resolveCurrentUser();
  if (!user) return { success: false, error: 'Unauthorised.' };
  if (!(await can(user.clerkId, Permission.EditAsset))) {
    return { success: false, error: 'Insufficient permissions.' };
  }

  try {
    await db
      .update(assets)
      .set({ status: 'archived', archivedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(assets.id, id), eq(assets.organisationId, user.organisationId)));

    // Soft-removal from the map: mark the placement as removed but keep the row for history
    await db
      .update(mapAssets)
      .set({ removedAt: new Date(), updatedAt: new Date() })
      .where(eq(mapAssets.assetId, id));

    revalidatePath('/assets');
    revalidatePath(`/assets/${id}`);
    return { success: true };
  } catch (err) {
    console.error('[archiveAsset]', err);
    return { success: false, error: 'Could not archive asset.' };
  }
}

export async function restoreAsset(id: string): Promise<ActionResult> {
  const user = await resolveCurrentUser();
  if (!user) return { success: false, error: 'Unauthorised.' };
  if (!(await can(user.clerkId, Permission.EditAsset))) {
    return { success: false, error: 'Insufficient permissions.' };
  }

  try {
    await db
      .update(assets)
      .set({ status: 'active', archivedAt: null, updatedAt: new Date() })
      .where(and(eq(assets.id, id), eq(assets.organisationId, user.organisationId)));

    await db
      .update(mapAssets)
      .set({ removedAt: null, updatedAt: new Date() })
      .where(eq(mapAssets.assetId, id));

    revalidatePath('/assets');
    revalidatePath(`/assets/${id}`);
    return { success: true };
  } catch (err) {
    console.error('[restoreAsset]', err);
    return { success: false, error: 'Could not restore asset.' };
  }
}

export async function deleteAsset(id: string): Promise<ActionResult> {
  const user = await resolveCurrentUser();
  if (!user) return { success: false, error: 'Unauthorised.' };
  if (!(await can(user.clerkId, Permission.DeleteAsset))) {
    return { success: false, error: 'Insufficient permissions.' };
  }

  // Block hard delete while a map placement exists — user must archive first
  const [placement] = await db
    .select({ id: mapAssets.id })
    .from(mapAssets)
    .where(and(eq(mapAssets.assetId, id), isNotNull(mapAssets.assetId)))
    .limit(1);
  if (placement) {
    return { success: false, error: 'Asset is placed on a floor plan. Archive it first, or remove the placement.' };
  }

  try {
    await db
      .delete(assets)
      .where(and(eq(assets.id, id), eq(assets.organisationId, user.organisationId)));
    revalidatePath('/assets');
    return { success: true };
  } catch (err) {
    console.error('[deleteAsset]', err);
    return { success: false, error: 'Could not delete asset.' };
  }
}

export async function listAssetsForCurrentOrg() {
  const user = await resolveCurrentUser();
  if (!user) return [];

  return db
    .select({
      id: assets.id,
      name: assets.name,
      serialNumber: assets.serialNumber,
      assetTypeId: assets.assetTypeId,
      assetTypeName: assetTypes.name,
      iconKey: assetTypes.iconKey,
      layer: assetTypes.layer,
      status: assets.status,
      installedAt: assets.installedAt,
      lastInspectedAt: assets.lastInspectedAt,
      nextInspectionDue: assets.nextInspectionDue,
      hasPlacement: sql<boolean>`EXISTS (SELECT 1 FROM ${mapAssets} ma WHERE ma.asset_id = ${assets.id} AND ma.removed_at IS NULL)`,
    })
    .from(assets)
    .leftJoin(assetTypes, eq(assetTypes.id, assets.assetTypeId))
    .where(eq(assets.organisationId, user.organisationId))
    .orderBy(assets.nextInspectionDue, assets.name);
}
