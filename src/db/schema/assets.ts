import { pgTable, uuid, text, date, timestamp } from 'drizzle-orm/pg-core';
import { organisations } from './organisations';
import { sites } from './sites';
import { assetTypes } from './asset_types';

export const assets = pgTable('assets', {
  id: uuid('id').defaultRandom().primaryKey(),
  organisationId: uuid('organisation_id').references(() => organisations.id, { onDelete: 'cascade' }).notNull(),
  siteId: uuid('site_id').references(() => sites.id, { onDelete: 'cascade' }).notNull(),
  assetTypeId: uuid('asset_type_id').references(() => assetTypes.id, { onDelete: 'restrict' }).notNull(),

  name: text('name').notNull(),
  serialNumber: text('serial_number'),
  manufacturer: text('manufacturer'),
  model: text('model'),

  installedAt: date('installed_at'),
  purchasedAt: date('purchased_at'),
  warrantyExpiresAt: date('warranty_expires_at'),
  lastInspectedAt: date('last_inspected_at'),
  nextInspectionDue: date('next_inspection_due'),

  status: text('status').notNull().default('active'),
  archivedAt: timestamp('archived_at', { withTimezone: true }),

  notes: text('notes'),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
