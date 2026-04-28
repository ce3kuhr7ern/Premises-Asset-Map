import { pgTable, uuid, text, boolean, integer, timestamp } from 'drizzle-orm/pg-core';

export const assetTypes = pgTable('asset_types', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  iconKey: text('icon_key').notNull().default('asset-fire-door'),
  layer: text('layer').notNull().default('fire-safety'),
  isActive: boolean('is_active').notNull().default(true),
  inspectionIntervalDays: integer('inspection_interval_days'),
  requiresCertificate: boolean('requires_certificate').notNull().default(false),
  certificateType: text('certificate_type'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
