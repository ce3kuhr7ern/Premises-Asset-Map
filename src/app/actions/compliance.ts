'use server';

import { revalidatePath } from 'next/cache';
import { eq, and, desc, sql } from 'drizzle-orm';
import { db } from '@/db';
import {
  complianceItems,
  complianceTypes,
  complianceApprovals,
  complianceEvents,
  assets,
  contractors,
  documents,
  type ComplianceEventPayload,
} from '@/db/schema';
import { resolveCurrentUser } from '@/lib/auth/provision';
import { can } from '@/lib/auth/can';
import { Permission } from '@/lib/auth/permissions';

type ActionResult<T = undefined> =
  | (T extends undefined ? { success: true } : { success: true; data: T })
  | { success: false; error: string };

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type ComplianceStatus =
  | 'pending'
  | 'quoting'
  | 'awaiting_approval'
  | 'approved'
  | 'scheduled'
  | 'completed'
  | 'cancelled';

export interface ComplianceItemFormData {
  name: string;
  description?: string | null;
  complianceTypeId: string;
  assetId?: string | null;
  isRecurring: boolean;
  intervalDays?: number | null;
  leadDays: number;
  nextDue?: string | null; // ISO date
}

export interface ApprovalPayload {
  decision: 'approved' | 'rejected';
  channel: 'meeting' | 'email' | 'whatsapp' | 'in_app';
  approverUserIds: string[];
  notes?: string | null;
  recordedAt?: string | null; // ISO datetime; defaults to now
  meetingId?: string | null;
}

export interface SchedulePayload {
  contractorId?: string | null;
  scheduledFor?: string | null;  // ISO date
  notes?: string | null;
}

export interface CompletionPayload {
  completedAt: string; // ISO date
  satisfactionDocId?: string | null;
  costCents?: number | null;
  notes?: string | null;
  autoCreateNext?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// State machine — see PWA_Features/compliance-register.md §4.3
// ─────────────────────────────────────────────────────────────────────────────

const ALLOWED_TRANSITIONS: Record<ComplianceStatus, ComplianceStatus[]> = {
  pending:           ['quoting', 'scheduled', 'cancelled'],
  quoting:           ['awaiting_approval', 'pending', 'cancelled'],
  awaiting_approval: ['approved', 'pending', 'cancelled'],
  approved:          ['scheduled', 'pending', 'cancelled'],
  scheduled:         ['completed', 'approved', 'cancelled'],
  completed:         ['completed'],
  cancelled:         ['pending'],
};

function canTransition(from: ComplianceStatus, to: ComplianceStatus): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

async function authorise(permission: Permission) {
  const user = await resolveCurrentUser();
  if (!user) return { ok: false as const, error: 'Unauthorised.' };
  if (!(await can(user.clerkId, permission))) {
    return { ok: false as const, error: 'Insufficient permissions.' };
  }
  return { ok: true as const, user };
}

async function loadItemForOrg(id: string, organisationId: string) {
  const [row] = await db
    .select()
    .from(complianceItems)
    .where(and(eq(complianceItems.id, id), eq(complianceItems.organisationId, organisationId)))
    .limit(1);
  return row ?? null;
}

async function recordEvent(
  itemId: string,
  eventType: string,
  fromStatus: string | null,
  toStatus: string | null,
  payload: ComplianceEventPayload,
  recordedBy: string,
) {
  await db.insert(complianceEvents).values({
    complianceItemId: itemId,
    eventType,
    fromStatus,
    toStatus,
    payload,
    recordedBy,
  });
}

function validateForm(data: ComplianceItemFormData): string | null {
  const name = data.name?.trim();
  if (!name) return 'Name is required.';
  if (name.length > 200) return 'Name must be under 200 characters.';
  if (!data.complianceTypeId) return 'Compliance type is required.';
  if (data.isRecurring && (!data.intervalDays || data.intervalDays < 1)) {
    return 'Recurring items need a valid interval (1+ days).';
  }
  if (data.leadDays < 0 || data.leadDays > 365) return 'Lead days must be between 0 and 365.';
  if (data.nextDue && Number.isNaN(new Date(data.nextDue).getTime())) return 'Invalid next-due date.';
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Public actions
// ─────────────────────────────────────────────────────────────────────────────

export async function createComplianceItem(data: ComplianceItemFormData): Promise<ActionResult<{ id: string }>> {
  const authz = await authorise(Permission.ManageCompliance);
  if (!authz.ok) return { success: false, error: authz.error };
  const { user } = authz;

  const validationError = validateForm(data);
  if (validationError) return { success: false, error: validationError };

  // Verify compliance type
  const [type] = await db
    .select({ id: complianceTypes.id })
    .from(complianceTypes)
    .where(eq(complianceTypes.id, data.complianceTypeId))
    .limit(1);
  if (!type) return { success: false, error: 'Invalid compliance type.' };

  // Verify asset (if linked) belongs to org
  if (data.assetId) {
    const [asset] = await db
      .select({ id: assets.id })
      .from(assets)
      .where(and(eq(assets.id, data.assetId), eq(assets.organisationId, user.organisationId)))
      .limit(1);
    if (!asset) return { success: false, error: 'Linked asset not found.' };
  }

  try {
    const [row] = await db
      .insert(complianceItems)
      .values({
        organisationId: user.organisationId,
        assetId: data.assetId || null,
        complianceTypeId: data.complianceTypeId,
        name: data.name.trim(),
        description: data.description?.trim() || null,
        isRecurring: data.isRecurring,
        intervalDays: data.intervalDays ?? null,
        leadDays: data.leadDays,
        status: 'pending',
        nextDue: data.nextDue || null,
      })
      .returning({ id: complianceItems.id });

    await recordEvent(row.id, 'created', null, 'pending', { type: 'created' }, user.userId);

    revalidatePath('/compliance');
    if (data.assetId) revalidatePath(`/assets/${data.assetId}`);
    return { success: true, data: { id: row.id } };
  } catch (err) {
    console.error('[createComplianceItem]', err);
    return { success: false, error: 'Could not create compliance item.' };
  }
}

export async function updateComplianceItem(id: string, data: ComplianceItemFormData): Promise<ActionResult> {
  const authz = await authorise(Permission.ManageCompliance);
  if (!authz.ok) return { success: false, error: authz.error };
  const { user } = authz;

  const validationError = validateForm(data);
  if (validationError) return { success: false, error: validationError };

  const existing = await loadItemForOrg(id, user.organisationId);
  if (!existing) return { success: false, error: 'Compliance item not found.' };

  if (data.assetId) {
    const [asset] = await db
      .select({ id: assets.id })
      .from(assets)
      .where(and(eq(assets.id, data.assetId), eq(assets.organisationId, user.organisationId)))
      .limit(1);
    if (!asset) return { success: false, error: 'Linked asset not found.' };
  }

  try {
    await db
      .update(complianceItems)
      .set({
        assetId: data.assetId || null,
        complianceTypeId: data.complianceTypeId,
        name: data.name.trim(),
        description: data.description?.trim() || null,
        isRecurring: data.isRecurring,
        intervalDays: data.intervalDays ?? null,
        leadDays: data.leadDays,
        nextDue: data.nextDue || null,
        updatedAt: new Date(),
      })
      .where(and(eq(complianceItems.id, id), eq(complianceItems.organisationId, user.organisationId)));

    revalidatePath('/compliance');
    revalidatePath(`/compliance/${id}`);
    if (existing.assetId) revalidatePath(`/assets/${existing.assetId}`);
    if (data.assetId && data.assetId !== existing.assetId) revalidatePath(`/assets/${data.assetId}`);
    return { success: true };
  } catch (err) {
    console.error('[updateComplianceItem]', err);
    return { success: false, error: 'Could not update compliance item.' };
  }
}

export async function transitionStatus(id: string, target: ComplianceStatus): Promise<ActionResult> {
  const authz = await authorise(Permission.ManageCompliance);
  if (!authz.ok) return { success: false, error: authz.error };
  const { user } = authz;

  const existing = await loadItemForOrg(id, user.organisationId);
  if (!existing) return { success: false, error: 'Compliance item not found.' };

  const from = existing.status as ComplianceStatus;
  if (!canTransition(from, target)) {
    return { success: false, error: `Cannot move from ${from} to ${target}.` };
  }

  // Special-case checks
  if (from === 'quoting' && target === 'awaiting_approval') {
    const [quote] = await db
      .select({ id: documents.id })
      .from(documents)
      .where(and(eq(documents.complianceItemId, id), eq(documents.organisationId, user.organisationId)))
      .limit(1);
    if (!quote) return { success: false, error: 'Attach a quote document before requesting approval.' };
  }

  try {
    await db
      .update(complianceItems)
      .set({ status: target, updatedAt: new Date() })
      .where(eq(complianceItems.id, id));

    await recordEvent(id, 'status_changed', from, target, { type: 'status_changed' }, user.userId);

    revalidatePath('/compliance');
    revalidatePath(`/compliance/${id}`);
    return { success: true };
  } catch (err) {
    console.error('[transitionStatus]', err);
    return { success: false, error: 'Could not change status.' };
  }
}

/**
 * Schedule a compliance item — a richer transition than `transitionStatus(id, 'scheduled')`
 * that also captures the contractor, the booking date, and any notes. See
 * PWA_Features/suppliers.md §11.1.
 *
 * Allowed source statuses: 'approved' or 'pending' (the skip-quoting fast path).
 */
export async function scheduleComplianceItem(id: string, payload: SchedulePayload): Promise<ActionResult> {
  const authz = await authorise(Permission.ManageCompliance);
  if (!authz.ok) return { success: false, error: authz.error };
  const { user } = authz;

  const existing = await loadItemForOrg(id, user.organisationId);
  if (!existing) return { success: false, error: 'Compliance item not found.' };

  const from = existing.status as ComplianceStatus;
  if (!canTransition(from, 'scheduled')) {
    return { success: false, error: `Cannot schedule from ${from}.` };
  }

  if (payload.contractorId) {
    const [c] = await db
      .select({ id: contractors.id })
      .from(contractors)
      .where(and(eq(contractors.id, payload.contractorId), eq(contractors.organisationId, user.organisationId)))
      .limit(1);
    if (!c) return { success: false, error: 'Selected supplier not found.' };
  }

  if (payload.scheduledFor && Number.isNaN(new Date(payload.scheduledFor).getTime())) {
    return { success: false, error: 'Invalid scheduled date.' };
  }

  try {
    await db
      .update(complianceItems)
      .set({
        status: 'scheduled',
        contractorId: payload.contractorId ?? existing.contractorId ?? null,
        scheduledFor: payload.scheduledFor || null,
        updatedAt: new Date(),
      })
      .where(eq(complianceItems.id, id));

    await recordEvent(id, 'status_changed', from, 'scheduled', { type: 'status_changed' }, user.userId);
    if (payload.notes) {
      await recordEvent(id, 'noted', null, null, { type: 'noted', note: payload.notes }, user.userId);
    }

    revalidatePath('/compliance');
    revalidatePath(`/compliance/${id}`);
    return { success: true };
  } catch (err) {
    console.error('[scheduleComplianceItem]', err);
    return { success: false, error: 'Could not schedule compliance item.' };
  }
}

export async function recordApproval(id: string, payload: ApprovalPayload): Promise<ActionResult> {
  const authz = await authorise(Permission.ApproveCompliance);
  if (!authz.ok) return { success: false, error: authz.error };
  const { user } = authz;

  if (!['approved', 'rejected'].includes(payload.decision)) {
    return { success: false, error: 'Invalid decision.' };
  }
  if (!['meeting', 'email', 'whatsapp', 'in_app'].includes(payload.channel)) {
    return { success: false, error: 'Invalid channel.' };
  }
  if (!Array.isArray(payload.approverUserIds) || payload.approverUserIds.length === 0) {
    return { success: false, error: 'Please select at least one approving trustee.' };
  }
  if (payload.notes && payload.notes.length > 5000) {
    return { success: false, error: 'Notes too long.' };
  }

  const existing = await loadItemForOrg(id, user.organisationId);
  if (!existing) return { success: false, error: 'Compliance item not found.' };

  const from = existing.status as ComplianceStatus;
  if (from !== 'awaiting_approval' && from !== 'quoting') {
    return { success: false, error: 'Item is not currently awaiting approval.' };
  }

  const target: ComplianceStatus = payload.decision === 'approved' ? 'approved' : 'pending';

  try {
    await db.insert(complianceApprovals).values({
      complianceItemId: id,
      decision: payload.decision,
      channel: payload.channel,
      recordedAt: payload.recordedAt ? new Date(payload.recordedAt) : new Date(),
      recordedBy: user.userId,
      approverUserIds: payload.approverUserIds,
      notes: payload.notes?.trim() || null,
      meetingId: payload.meetingId || null,
    });

    await db
      .update(complianceItems)
      .set({ status: target, updatedAt: new Date() })
      .where(eq(complianceItems.id, id));

    await recordEvent(id, 'status_changed', from, target, { type: 'status_changed' }, user.userId);

    revalidatePath('/compliance');
    revalidatePath(`/compliance/${id}`);
    return { success: true };
  } catch (err) {
    console.error('[recordApproval]', err);
    return { success: false, error: 'Could not record approval.' };
  }
}

export async function recordCompletion(id: string, payload: CompletionPayload): Promise<ActionResult> {
  const authz = await authorise(Permission.ManageCompliance);
  if (!authz.ok) return { success: false, error: authz.error };
  const { user } = authz;

  if (!payload.completedAt || Number.isNaN(new Date(payload.completedAt).getTime())) {
    return { success: false, error: 'Valid completion date is required.' };
  }

  const existing = await loadItemForOrg(id, user.organisationId);
  if (!existing) return { success: false, error: 'Compliance item not found.' };

  const from = existing.status as ComplianceStatus;
  if (from !== 'scheduled' && from !== 'approved') {
    return { success: false, error: 'Item must be approved or scheduled before completion.' };
  }

  // Verify satisfaction doc (if provided) belongs to this org
  if (payload.satisfactionDocId) {
    const [doc] = await db
      .select({ id: documents.id })
      .from(documents)
      .where(and(eq(documents.id, payload.satisfactionDocId), eq(documents.organisationId, user.organisationId)))
      .limit(1);
    if (!doc) return { success: false, error: 'Satisfaction document not found.' };
  }

  try {
    await db
      .update(complianceItems)
      .set({
        status: 'completed',
        lastCompletedAt: payload.completedAt,
        satisfactionDocId: payload.satisfactionDocId || null,
        costCents: payload.costCents ?? null,
        updatedAt: new Date(),
      })
      .where(eq(complianceItems.id, id));

    await recordEvent(id, 'status_changed', from, 'completed', { type: 'status_changed' }, user.userId);

    if (payload.notes) {
      await recordEvent(id, 'noted', null, null, { type: 'noted', note: payload.notes }, user.userId);
    }

    if (payload.satisfactionDocId) {
      await recordEvent(
        id,
        'document_linked',
        null,
        null,
        { type: 'document_linked', documentId: payload.satisfactionDocId, role: 'satisfaction' },
        user.userId,
      );
      // Also link the doc back to this item if not already
      await db
        .update(documents)
        .set({ complianceItemId: id, updatedAt: new Date() })
        .where(eq(documents.id, payload.satisfactionDocId));
    }

    // Recurring? Spawn the next cycle.
    if (payload.autoCreateNext && existing.isRecurring && existing.intervalDays) {
      const nextDue = new Date(payload.completedAt);
      nextDue.setDate(nextDue.getDate() + existing.intervalDays);
      const [nextRow] = await db
        .insert(complianceItems)
        .values({
          organisationId: existing.organisationId,
          assetId: existing.assetId,
          complianceTypeId: existing.complianceTypeId,
          name: existing.name,
          description: existing.description,
          isRecurring: true,
          intervalDays: existing.intervalDays,
          leadDays: existing.leadDays,
          status: 'pending',
          nextDue: nextDue.toISOString().slice(0, 10),
        })
        .returning({ id: complianceItems.id });
      await recordEvent(nextRow.id, 'created', null, 'pending', { type: 'created' }, user.userId);
    }

    revalidatePath('/compliance');
    revalidatePath(`/compliance/${id}`);
    if (existing.assetId) revalidatePath(`/assets/${existing.assetId}`);
    return { success: true };
  } catch (err) {
    console.error('[recordCompletion]', err);
    return { success: false, error: 'Could not record completion.' };
  }
}

export async function cancelComplianceItem(id: string, reason: string): Promise<ActionResult> {
  const authz = await authorise(Permission.ManageCompliance);
  if (!authz.ok) return { success: false, error: authz.error };
  const { user } = authz;

  const trimmedReason = reason?.trim().slice(0, 1000);
  if (!trimmedReason) return { success: false, error: 'A reason is required.' };

  const existing = await loadItemForOrg(id, user.organisationId);
  if (!existing) return { success: false, error: 'Compliance item not found.' };

  try {
    await db
      .update(complianceItems)
      .set({
        status: 'cancelled',
        cancelledAt: new Date(),
        cancelledReason: trimmedReason,
        updatedAt: new Date(),
      })
      .where(eq(complianceItems.id, id));

    await recordEvent(id, 'status_changed', existing.status, 'cancelled', { type: 'status_changed', reason: trimmedReason }, user.userId);

    revalidatePath('/compliance');
    revalidatePath(`/compliance/${id}`);
    return { success: true };
  } catch (err) {
    console.error('[cancelComplianceItem]', err);
    return { success: false, error: 'Could not cancel compliance item.' };
  }
}

export async function reopenComplianceItem(id: string): Promise<ActionResult> {
  const authz = await authorise(Permission.ManageCompliance);
  if (!authz.ok) return { success: false, error: authz.error };
  const { user } = authz;

  const existing = await loadItemForOrg(id, user.organisationId);
  if (!existing) return { success: false, error: 'Compliance item not found.' };
  if (existing.status !== 'cancelled') return { success: false, error: 'Only cancelled items can be reopened.' };

  try {
    await db
      .update(complianceItems)
      .set({
        status: 'pending',
        cancelledAt: null,
        cancelledReason: null,
        updatedAt: new Date(),
      })
      .where(eq(complianceItems.id, id));

    await recordEvent(id, 'reopened', 'cancelled', 'pending', { type: 'reopened' }, user.userId);

    revalidatePath('/compliance');
    revalidatePath(`/compliance/${id}`);
    return { success: true };
  } catch (err) {
    console.error('[reopenComplianceItem]', err);
    return { success: false, error: 'Could not reopen compliance item.' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Read paths used by pages
// ─────────────────────────────────────────────────────────────────────────────

export async function listComplianceForCurrentOrg() {
  const user = await resolveCurrentUser();
  if (!user) return [];

  return db
    .select({
      id: complianceItems.id,
      name: complianceItems.name,
      status: complianceItems.status,
      nextDue: complianceItems.nextDue,
      lastCompletedAt: complianceItems.lastCompletedAt,
      isRecurring: complianceItems.isRecurring,
      assetId: complianceItems.assetId,
      assetName: assets.name,
      complianceTypeId: complianceItems.complianceTypeId,
      complianceTypeName: complianceTypes.name,
    })
    .from(complianceItems)
    .leftJoin(assets, eq(assets.id, complianceItems.assetId))
    .leftJoin(complianceTypes, eq(complianceTypes.id, complianceItems.complianceTypeId))
    .where(eq(complianceItems.organisationId, user.organisationId))
    .orderBy(sql`${complianceItems.nextDue} ASC NULLS LAST`, complianceItems.name);
}

export async function listComplianceForAsset(assetId: string) {
  const user = await resolveCurrentUser();
  if (!user) return [];

  return db
    .select({
      id: complianceItems.id,
      name: complianceItems.name,
      status: complianceItems.status,
      nextDue: complianceItems.nextDue,
      lastCompletedAt: complianceItems.lastCompletedAt,
      complianceTypeName: complianceTypes.name,
    })
    .from(complianceItems)
    .leftJoin(complianceTypes, eq(complianceTypes.id, complianceItems.complianceTypeId))
    .where(and(eq(complianceItems.assetId, assetId), eq(complianceItems.organisationId, user.organisationId)))
    .orderBy(sql`${complianceItems.nextDue} ASC NULLS LAST`, complianceItems.name);
}

export async function getComplianceDetail(id: string) {
  const user = await resolveCurrentUser();
  if (!user) return null;

  const [item] = await db
    .select({
      id: complianceItems.id,
      name: complianceItems.name,
      description: complianceItems.description,
      status: complianceItems.status,
      isRecurring: complianceItems.isRecurring,
      intervalDays: complianceItems.intervalDays,
      leadDays: complianceItems.leadDays,
      nextDue: complianceItems.nextDue,
      scheduledFor: complianceItems.scheduledFor,
      lastCompletedAt: complianceItems.lastCompletedAt,
      costCents: complianceItems.costCents,
      cancelledAt: complianceItems.cancelledAt,
      cancelledReason: complianceItems.cancelledReason,
      satisfactionDocId: complianceItems.satisfactionDocId,
      assetId: complianceItems.assetId,
      assetName: assets.name,
      complianceTypeId: complianceItems.complianceTypeId,
      complianceTypeName: complianceTypes.name,
      contractorId: complianceItems.contractorId,
      contractorName: contractors.name,
      contractorContactName: contractors.contactName,
      contractorEmail: contractors.email,
      createdAt: complianceItems.createdAt,
    })
    .from(complianceItems)
    .leftJoin(assets, eq(assets.id, complianceItems.assetId))
    .leftJoin(complianceTypes, eq(complianceTypes.id, complianceItems.complianceTypeId))
    .leftJoin(contractors, eq(contractors.id, complianceItems.contractorId))
    .where(and(eq(complianceItems.id, id), eq(complianceItems.organisationId, user.organisationId)))
    .limit(1);

  if (!item) return null;

  const events = await db
    .select()
    .from(complianceEvents)
    .where(eq(complianceEvents.complianceItemId, id))
    .orderBy(desc(complianceEvents.recordedAt));

  const approvals = await db
    .select()
    .from(complianceApprovals)
    .where(eq(complianceApprovals.complianceItemId, id))
    .orderBy(desc(complianceApprovals.recordedAt));

  const linkedDocs = await db
    .select({
      id: documents.id,
      name: documents.name,
      mimeType: documents.mimeType,
      fileUrl: documents.fileUrl,
      fileSize: documents.fileSize,
      createdAt: documents.createdAt,
    })
    .from(documents)
    .where(and(eq(documents.complianceItemId, id), eq(documents.organisationId, user.organisationId)));

  return { item, events, approvals, linkedDocs };
}
