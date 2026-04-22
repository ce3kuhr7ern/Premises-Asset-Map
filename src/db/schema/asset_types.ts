import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';

export const assetTypes = pgTable('asset_types', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
