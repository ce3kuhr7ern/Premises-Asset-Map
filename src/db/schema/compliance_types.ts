import { pgTable, uuid, text, integer, timestamp } from 'drizzle-orm/pg-core';

export const complianceTypes = pgTable('compliance_types', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  defaultLeadDays: integer('default_lead_days').notNull().default(60),
  defaultIntervalDays: integer('default_interval_days'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
