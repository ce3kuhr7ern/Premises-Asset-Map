import { pgTable, uuid, text, integer, timestamp } from 'drizzle-orm/pg-core';

export const contractorCategories = pgTable('contractor_categories', {
  id: uuid('id').defaultRandom().primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  displayOrder: integer('display_order').notNull().default(100),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
