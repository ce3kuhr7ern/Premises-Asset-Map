'use server';

import { revalidatePath } from 'next/cache';
import { eq, and, inArray, sql, desc, ilike, or } from 'drizzle-orm';
import { db } from '@/db';
import {
  contractors,
  contractorCategories,
  contractorCategoryAssignments,
  complianceItems,
  complianceTypes,
  documents,
  assets,
} from '@/db/schema';
import { resolveCurrentUser } from '@/lib/auth/provision';
import { can } from '@/lib/auth/can';
import { Permission } from '@/lib/auth/permissions';

type ActionResult<T = undefined> =
  | (T extends undefined ? { success: true } : { success: true; data: T })
  | { success: false; error: string };

export interface ContractorFormData {
  name: string;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  website?: string | null;
  notes?: string | null;
  categoryIds: string[];
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function authorise(permission: Permission) {
  const user = await resolveCurrentUser();
  if (!user) return { ok: false as const, error: 'Unauthorised.' };
  if (!(await can(user.clerkId, permission))) {
    return { ok: false as const, error: 'Insufficient permissions.' };
  }
  return { ok: true as const, user };
}

function validateForm(data: ContractorFormData): string | null {
  const name = data.name?.trim();
  if (!name) return 'Name is required.';
  if (name.length > 200) return 'Name must be under 200 characters.';
  if (!data.categoryIds || data.categoryIds.length === 0) return 'Select at least one category.';
  if (data.email && !EMAIL_REGEX.test(data.email.trim())) return 'Email is not valid.';
  if (data.contactName && data.contactName.length > 200) return 'Contact name too long.';
  if (data.phone && data.phone.length > 50) return 'Phone too long.';
  if (data.website && data.website.length > 500) return 'Website URL too long.';
  if (data.notes && data.notes.length > 5000) return 'Notes too long.';
  return null;
}

function normaliseWebsite(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

async function verifyCategoriesExist(ids: string[]): Promise<boolean> {
  if (ids.length === 0) return false;
  const rows = await db
    .select({ id: contractorCategories.id })
    .from(contractorCategories)
    .where(inArray(contractorCategories.id, ids));
  return rows.length === ids.length;
}

// ─────────────────────────────────────────────────────────────────────────────
// CRUD actions
// ─────────────────────────────────────────────────────────────────────────────

export async function createContractor(data: ContractorFormData): Promise<ActionResult<{ id: string }>> {
  const authz = await authorise(Permission.ManageContractors);
  if (!authz.ok) return { success: false, error: authz.error };
  const { user } = authz;

  const validationError = validateForm(data);
  if (validationError) return { success: false, error: validationError };

  if (!(await verifyCategoriesExist(data.categoryIds))) {
    return { success: false, error: 'Invalid category selected.' };
  }

  try {
    const [row] = await db
      .insert(contractors)
      .values({
        organisationId: user.organisationId,
        name: data.name.trim(),
        contactName: data.contactName?.trim() || null,
        email: data.email?.trim() || null,
        phone: data.phone?.trim() || null,
        address: data.address?.trim() || null,
        website: normaliseWebsite(data.website),
        notes: data.notes?.trim() || null,
      })
      .returning({ id: contractors.id });

    if (data.categoryIds.length > 0) {
      await db.insert(contractorCategoryAssignments).values(
        data.categoryIds.map((cid) => ({ contractorId: row.id, categoryId: cid })),
      );
    }

    revalidatePath('/suppliers');
    return { success: true, data: { id: row.id } };
  } catch (err) {
    console.error('[createContractor]', err);
    return { success: false, error: 'Could not create supplier.' };
  }
}

export async function updateContractor(id: string, data: ContractorFormData): Promise<ActionResult> {
  const authz = await authorise(Permission.ManageContractors);
  if (!authz.ok) return { success: false, error: authz.error };
  const { user } = authz;

  const validationError = validateForm(data);
  if (validationError) return { success: false, error: validationError };

  if (!(await verifyCategoriesExist(data.categoryIds))) {
    return { success: false, error: 'Invalid category selected.' };
  }

  try {
    const [updated] = await db
      .update(contractors)
      .set({
        name: data.name.trim(),
        contactName: data.contactName?.trim() || null,
        email: data.email?.trim() || null,
        phone: data.phone?.trim() || null,
        address: data.address?.trim() || null,
        website: normaliseWebsite(data.website),
        notes: data.notes?.trim() || null,
        updatedAt: new Date(),
      })
      .where(and(eq(contractors.id, id), eq(contractors.organisationId, user.organisationId)))
      .returning({ id: contractors.id });
    if (!updated) return { success: false, error: 'Supplier not found.' };

    // Re-sync category assignments: delete all, re-insert
    await db.delete(contractorCategoryAssignments).where(eq(contractorCategoryAssignments.contractorId, id));
    if (data.categoryIds.length > 0) {
      await db.insert(contractorCategoryAssignments).values(
        data.categoryIds.map((cid) => ({ contractorId: id, categoryId: cid })),
      );
    }

    revalidatePath('/suppliers');
    revalidatePath(`/suppliers/${id}`);
    return { success: true };
  } catch (err) {
    console.error('[updateContractor]', err);
    return { success: false, error: 'Could not update supplier.' };
  }
}

export async function archiveContractor(id: string): Promise<ActionResult> {
  const authz = await authorise(Permission.ManageContractors);
  if (!authz.ok) return { success: false, error: authz.error };
  const { user } = authz;
  try {
    await db
      .update(contractors)
      .set({ status: 'archived', archivedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(contractors.id, id), eq(contractors.organisationId, user.organisationId)));
    revalidatePath('/suppliers');
    revalidatePath(`/suppliers/${id}`);
    return { success: true };
  } catch (err) {
    console.error('[archiveContractor]', err);
    return { success: false, error: 'Could not archive supplier.' };
  }
}

export async function restoreContractor(id: string): Promise<ActionResult> {
  const authz = await authorise(Permission.ManageContractors);
  if (!authz.ok) return { success: false, error: authz.error };
  const { user } = authz;
  try {
    await db
      .update(contractors)
      .set({ status: 'active', archivedAt: null, updatedAt: new Date() })
      .where(and(eq(contractors.id, id), eq(contractors.organisationId, user.organisationId)));
    revalidatePath('/suppliers');
    revalidatePath(`/suppliers/${id}`);
    return { success: true };
  } catch (err) {
    console.error('[restoreContractor]', err);
    return { success: false, error: 'Could not restore supplier.' };
  }
}

export async function deleteContractor(id: string): Promise<ActionResult> {
  const authz = await authorise(Permission.ManageContractors);
  if (!authz.ok) return { success: false, error: authz.error };
  const { user } = authz;

  // Block delete if any compliance item references this contractor
  const [linked] = await db
    .select({ id: complianceItems.id })
    .from(complianceItems)
    .where(and(eq(complianceItems.contractorId, id), eq(complianceItems.organisationId, user.organisationId)))
    .limit(1);
  if (linked) {
    return {
      success: false,
      error: 'This supplier is referenced by compliance items. Archive them instead — the history is preserved.',
    };
  }

  try {
    await db
      .delete(contractors)
      .where(and(eq(contractors.id, id), eq(contractors.organisationId, user.organisationId)));
    revalidatePath('/suppliers');
    return { success: true };
  } catch (err) {
    console.error('[deleteContractor]', err);
    return { success: false, error: 'Could not delete supplier.' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Compliance integration
// ─────────────────────────────────────────────────────────────────────────────

export async function setContractorOnCompliance(complianceId: string, contractorId: string | null): Promise<ActionResult> {
  const authz = await authorise(Permission.ManageCompliance);
  if (!authz.ok) return { success: false, error: authz.error };
  const { user } = authz;

  if (contractorId) {
    const [c] = await db
      .select({ id: contractors.id })
      .from(contractors)
      .where(and(eq(contractors.id, contractorId), eq(contractors.organisationId, user.organisationId)))
      .limit(1);
    if (!c) return { success: false, error: 'Supplier not found.' };
  }

  try {
    const [updated] = await db
      .update(complianceItems)
      .set({ contractorId, updatedAt: new Date() })
      .where(and(eq(complianceItems.id, complianceId), eq(complianceItems.organisationId, user.organisationId)))
      .returning({ id: complianceItems.id });
    if (!updated) return { success: false, error: 'Compliance item not found.' };

    revalidatePath('/compliance');
    revalidatePath(`/compliance/${complianceId}`);
    return { success: true };
  } catch (err) {
    console.error('[setContractorOnCompliance]', err);
    return { success: false, error: 'Could not update supplier on compliance item.' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Read paths used by pages and the typeahead API
// ─────────────────────────────────────────────────────────────────────────────

interface ContractorListRow {
  id: string;
  name: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  lastUsedAt: string | null;
}

export async function listContractorsForCurrentOrg(): Promise<{
  rows: (ContractorListRow & { categories: { id: string; slug: string; name: string }[] })[];
  categories: { id: string; slug: string; name: string }[];
}> {
  const user = await resolveCurrentUser();
  if (!user) return { rows: [], categories: [] };

  const rows: ContractorListRow[] = await db
    .select({
      id: contractors.id,
      name: contractors.name,
      contactName: contractors.contactName,
      email: contractors.email,
      phone: contractors.phone,
      status: contractors.status,
      lastUsedAt: sql<string | null>`(
        SELECT MAX(COALESCE(${complianceItems.lastCompletedAt}::text, ${complianceItems.scheduledFor}::text))
        FROM ${complianceItems}
        WHERE ${complianceItems.contractorId} = ${contractors.id}
      )`,
    })
    .from(contractors)
    .where(eq(contractors.organisationId, user.organisationId))
    .orderBy(contractors.name);

  // Fetch category assignments in one go
  const ids = rows.map((r) => r.id);
  const assignments = ids.length === 0
    ? []
    : await db
        .select({
          contractorId: contractorCategoryAssignments.contractorId,
          categoryId: contractorCategories.id,
          slug: contractorCategories.slug,
          name: contractorCategories.name,
          displayOrder: contractorCategories.displayOrder,
        })
        .from(contractorCategoryAssignments)
        .innerJoin(contractorCategories, eq(contractorCategories.id, contractorCategoryAssignments.categoryId))
        .where(inArray(contractorCategoryAssignments.contractorId, ids))
        .orderBy(contractorCategories.displayOrder);

  const byContractor = new Map<string, { id: string; slug: string; name: string }[]>();
  for (const a of assignments) {
    const list = byContractor.get(a.contractorId) ?? [];
    list.push({ id: a.categoryId, slug: a.slug, name: a.name });
    byContractor.set(a.contractorId, list);
  }

  // Fetch all categories for filter UI
  const categories = await db
    .select({ id: contractorCategories.id, slug: contractorCategories.slug, name: contractorCategories.name })
    .from(contractorCategories)
    .orderBy(contractorCategories.displayOrder);

  return {
    rows: rows.map((r) => ({ ...r, categories: byContractor.get(r.id) ?? [] })),
    categories,
  };
}

export async function getContractorDetail(id: string) {
  const user = await resolveCurrentUser();
  if (!user) return null;

  const [contractor] = await db
    .select()
    .from(contractors)
    .where(and(eq(contractors.id, id), eq(contractors.organisationId, user.organisationId)))
    .limit(1);
  if (!contractor) return null;

  const categories = await db
    .select({
      id: contractorCategories.id,
      slug: contractorCategories.slug,
      name: contractorCategories.name,
    })
    .from(contractorCategoryAssignments)
    .innerJoin(contractorCategories, eq(contractorCategories.id, contractorCategoryAssignments.categoryId))
    .where(eq(contractorCategoryAssignments.contractorId, id))
    .orderBy(contractorCategories.displayOrder);

  const workHistory = await db
    .select({
      id: complianceItems.id,
      name: complianceItems.name,
      status: complianceItems.status,
      nextDue: complianceItems.nextDue,
      scheduledFor: complianceItems.scheduledFor,
      lastCompletedAt: complianceItems.lastCompletedAt,
      complianceTypeName: complianceTypes.name,
      assetId: complianceItems.assetId,
      assetName: assets.name,
    })
    .from(complianceItems)
    .leftJoin(complianceTypes, eq(complianceTypes.id, complianceItems.complianceTypeId))
    .leftJoin(assets, eq(assets.id, complianceItems.assetId))
    .where(and(eq(complianceItems.contractorId, id), eq(complianceItems.organisationId, user.organisationId)))
    .orderBy(desc(complianceItems.lastCompletedAt));

  // Recent documents linked to compliance items the contractor worked on
  const recentDocs = await db
    .select({
      id: documents.id,
      name: documents.name,
      mimeType: documents.mimeType,
      fileSize: documents.fileSize,
      createdAt: documents.createdAt,
      complianceItemId: documents.complianceItemId,
    })
    .from(documents)
    .innerJoin(complianceItems, eq(complianceItems.id, documents.complianceItemId))
    .where(and(eq(complianceItems.contractorId, id), eq(documents.organisationId, user.organisationId)))
    .orderBy(desc(documents.createdAt))
    .limit(20);

  return { contractor, categories, workHistory, recentDocs };
}

export async function searchContractors(query: string, limit = 10): Promise<{
  id: string; name: string; primaryCategory: string | null; email: string | null; phone: string | null;
}[]> {
  const user = await resolveCurrentUser();
  if (!user) return [];

  const q = query.trim();
  const where = and(
    eq(contractors.organisationId, user.organisationId),
    eq(contractors.status, 'active'),
    q
      ? or(
          ilike(contractors.name, `%${q}%`),
          ilike(contractors.contactName, `%${q}%`),
          ilike(contractors.email, `%${q}%`),
        )
      : undefined,
  );

  const rows = await db
    .select({
      id: contractors.id,
      name: contractors.name,
      email: contractors.email,
      phone: contractors.phone,
    })
    .from(contractors)
    .where(where)
    .orderBy(contractors.name)
    .limit(limit);

  if (rows.length === 0) return [];

  // Attach a "primary category" — first by display_order
  const ids = rows.map((r) => r.id);
  const cats = await db
    .select({
      contractorId: contractorCategoryAssignments.contractorId,
      name: contractorCategories.name,
      displayOrder: contractorCategories.displayOrder,
    })
    .from(contractorCategoryAssignments)
    .innerJoin(contractorCategories, eq(contractorCategories.id, contractorCategoryAssignments.categoryId))
    .where(inArray(contractorCategoryAssignments.contractorId, ids))
    .orderBy(contractorCategories.displayOrder);

  const primaryByContractor = new Map<string, string>();
  for (const c of cats) {
    if (!primaryByContractor.has(c.contractorId)) primaryByContractor.set(c.contractorId, c.name);
  }

  return rows.map((r) => ({
    ...r,
    primaryCategory: primaryByContractor.get(r.id) ?? null,
  }));
}
