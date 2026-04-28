'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { assetTypes } from '@/db/schema';
import { can } from '@/lib/auth/can';
import { Permission } from '@/lib/auth/permissions';
import { ASSET_ICON_META, LAYERS } from '@/lib/icons/asset-icons';

const VALID_ICON_KEYS = Object.keys(ASSET_ICON_META);
const VALID_LAYERS = LAYERS.map((l) => l.key);

type ActionResult = { success: true } | { success: false; error: string };

export interface AssetTypeFormData {
  name: string;
  iconKey: string;
  layer: string;
  inspectionIntervalDays?: number | null;
  requiresCertificate: boolean;
  certificateType?: string | null;
  notes?: string | null;
}

function validate(data: AssetTypeFormData): string | null {
  const name = data.name?.trim();
  if (!name || name.length > 200) return 'Name is required and must be under 200 characters.';
  if (!data.iconKey || !VALID_ICON_KEYS.includes(data.iconKey)) return 'Invalid icon.';
  if (!VALID_LAYERS.includes(data.layer)) return 'Invalid layer.';
  if (
    data.inspectionIntervalDays !== null &&
    data.inspectionIntervalDays !== undefined &&
    (!Number.isInteger(data.inspectionIntervalDays) || data.inspectionIntervalDays < 1)
  ) {
    return 'Inspection interval must be a whole number of days.';
  }
  if (data.certificateType && data.certificateType.trim().length > 200) {
    return 'Certificate type must be under 200 characters.';
  }
  return null;
}

async function authorise(): Promise<{ userId: string } | { success: false; error: string }> {
  const { userId } = await auth();
  if (!userId) return { success: false, error: 'Unauthorised.' };
  const allowed = await can(userId, Permission.ManageAssetTypes);
  if (!allowed) return { success: false, error: 'Insufficient permissions.' };
  return { userId };
}

export async function createAssetType(data: AssetTypeFormData): Promise<ActionResult> {
  const auth = await authorise();
  if ('error' in auth) return auth;

  const validationError = validate(data);
  if (validationError) return { success: false, error: validationError };

  try {
    await db.insert(assetTypes).values({
      name: data.name.trim(),
      iconKey: data.iconKey,
      layer: data.layer,
      inspectionIntervalDays: data.inspectionIntervalDays ?? null,
      requiresCertificate: data.requiresCertificate,
      certificateType: data.requiresCertificate ? (data.certificateType?.trim() || null) : null,
      notes: data.notes?.trim() || null,
    });
    revalidatePath('/settings/asset-types');
    return { success: true };
  } catch (err) {
    console.error('[createAssetType]', err);
    return { success: false, error: 'Could not create asset type.' };
  }
}

export async function updateAssetType(id: string, data: AssetTypeFormData): Promise<ActionResult> {
  const auth = await authorise();
  if ('error' in auth) return auth;

  const validationError = validate(data);
  if (validationError) return { success: false, error: validationError };

  try {
    const [updated] = await db
      .update(assetTypes)
      .set({
        name: data.name.trim(),
        iconKey: data.iconKey,
        layer: data.layer,
        inspectionIntervalDays: data.inspectionIntervalDays ?? null,
        requiresCertificate: data.requiresCertificate,
        certificateType: data.requiresCertificate ? (data.certificateType?.trim() || null) : null,
        notes: data.notes?.trim() || null,
        updatedAt: new Date(),
      })
      .where(eq(assetTypes.id, id))
      .returning({ id: assetTypes.id });

    if (!updated) return { success: false, error: 'Asset type not found.' };
    revalidatePath('/settings/asset-types');
    return { success: true };
  } catch (err) {
    console.error('[updateAssetType]', err);
    return { success: false, error: 'Could not update asset type.' };
  }
}

export async function archiveAssetType(id: string): Promise<ActionResult> {
  const auth = await authorise();
  if ('error' in auth) return auth;

  try {
    await db
      .update(assetTypes)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(assetTypes.id, id));
    revalidatePath('/settings/asset-types');
    return { success: true };
  } catch (err) {
    console.error('[archiveAssetType]', err);
    return { success: false, error: 'Could not archive asset type.' };
  }
}

export async function restoreAssetType(id: string): Promise<ActionResult> {
  const auth = await authorise();
  if ('error' in auth) return auth;

  try {
    await db
      .update(assetTypes)
      .set({ isActive: true, updatedAt: new Date() })
      .where(eq(assetTypes.id, id));
    revalidatePath('/settings/asset-types');
    return { success: true };
  } catch (err) {
    console.error('[restoreAssetType]', err);
    return { success: false, error: 'Could not restore asset type.' };
  }
}
