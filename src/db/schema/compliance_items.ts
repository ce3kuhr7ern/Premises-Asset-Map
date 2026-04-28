import { pgTable, uuid, text, integer, boolean, date, timestamp } from 'drizzle-orm/pg-core';
import { organisations } from './organisations';
import { assets } from './assets';
import { complianceTypes } from './compliance_types';
import { contractors } from './contractors';

export const complianceItems = pgTable('compliance_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  organisationId: uuid('organisation_id').references(() => organisations.id, { onDelete: 'cascade' }).notNull(),
  assetId: uuid('asset_id').references(() => assets.id, { onDelete: 'cascade' }),
  complianceTypeId: uuid('compliance_type_id').references(() => complianceTypes.id, { onDelete: 'set null' }),

  name: text('name').notNull(),
  description: text('description'),
  isRecurring: boolean('is_recurring').notNull().default(false),
  intervalDays: integer('interval_days'),
  leadDays: integer('lead_days').notNull().default(60),

  status: text('status').notNull().default('pending'),
  nextDue: date('next_due'),
  scheduledFor: date('scheduled_for'),
  lastCompletedAt: date('last_completed_at'),
  costCents: integer('cost_cents'),

  // FK is enforced at the DB level via 20260429_link_documents_to_compliance.sql
  // but Drizzle doesn't need .references() here since we don't traverse this relation in app code yet
  satisfactionDocId: uuid('satisfaction_doc_id'),

  // Suppliers v1.0 — FK constraint enforced at DB level via 20260429_link_contractors_to_compliance.sql
  contractorId: uuid('contractor_id').references(() => contractors.id, { onDelete: 'set null' }),

  // Forward-compatible — no .references() until Governance ships
  meetingId: uuid('meeting_id'),

  cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
  cancelledReason: text('cancelled_reason'),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
