import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';
import { complianceItems } from './compliance_items';
import { users } from './users';

export const complianceApprovals = pgTable('compliance_approvals', {
  id: uuid('id').defaultRandom().primaryKey(),
  complianceItemId: uuid('compliance_item_id').references(() => complianceItems.id, { onDelete: 'cascade' }).notNull(),
  decision: text('decision').notNull(),       // 'approved' | 'rejected'
  channel: text('channel').notNull(),         // 'meeting' | 'email' | 'whatsapp' | 'in_app'
  recordedAt: timestamp('recorded_at', { withTimezone: true }).defaultNow().notNull(),
  recordedBy: uuid('recorded_by').references(() => users.id, { onDelete: 'set null' }),
  // pg uuid[] — Drizzle exposes as string[]; cast at app boundary
  approverUserIds: uuid('approver_user_ids').array().notNull().default([]),
  notes: text('notes'),
  meetingId: uuid('meeting_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
