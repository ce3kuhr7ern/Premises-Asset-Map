import { pgTable, uuid, text, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { complianceItems } from './compliance_items';
import { users } from './users';

/**
 * Documented payload contract per event_type — see PWA_Features/compliance-register.md §5.3
 */
export type ComplianceEventPayload =
  | { type: 'created' }
  | { type: 'status_changed'; reason?: string }
  | { type: 'noted'; note: string }
  | { type: 'document_linked'; documentId: string; role: 'quote' | 'satisfaction' | 'other' }
  | { type: 'rescheduled'; from: string; to: string }
  | { type: 'reopened' };

export const complianceEvents = pgTable('compliance_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  complianceItemId: uuid('compliance_item_id').references(() => complianceItems.id, { onDelete: 'cascade' }).notNull(),
  eventType: text('event_type').notNull(),
  fromStatus: text('from_status'),
  toStatus: text('to_status'),
  payload: jsonb('payload').$type<ComplianceEventPayload>().notNull().default({ type: 'created' }),
  recordedBy: uuid('recorded_by').references(() => users.id, { onDelete: 'set null' }),
  recordedAt: timestamp('recorded_at', { withTimezone: true }).defaultNow().notNull(),
});
