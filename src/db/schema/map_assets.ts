import { pgTable, uuid, text, real, integer, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { floorPlans } from './floor_plans';
import { users } from './users';
import { assets } from './assets';

export const mapAssets = pgTable('map_assets', {
  id: uuid('id').defaultRandom().primaryKey(),
  floorPlanId: uuid('floor_plan_id').references(() => floorPlans.id, { onDelete: 'cascade' }).notNull(),
  assetId: uuid('asset_id').references(() => assets.id, { onDelete: 'cascade' }),
  label: text('label').notNull(),
  // x and y are percentages (0–100) of the image width/height
  x: real('x').notNull(),
  y: real('y').notNull(),
  rotation: integer('rotation').default(0).notNull(),
  scale: real('scale').default(1).notNull(),
  iconKey: text('icon_key').notNull(),
  metadata: jsonb('metadata'),
  placedBy: uuid('placed_by').references(() => users.id),
  placedAt: timestamp('placed_at', { withTimezone: true }).defaultNow(),
  removedAt: timestamp('removed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
