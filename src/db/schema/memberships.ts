import { pgTable, uuid, boolean, timestamp } from 'drizzle-orm/pg-core';
import { users } from './users';
import { appRoleEnum } from './roles';
import { organisations } from './organisations';
import { sites } from './sites';
import { areas } from './areas';
import { assetTypes } from './asset_types';
import { documentTypes } from './document_types';

export const memberships = pgTable('memberships', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  role: appRoleEnum('role').notNull(),
  organisationId: uuid('organisation_id').references(() => organisations.id),
  siteId: uuid('site_id').references(() => sites.id),
  areaId: uuid('area_id').references(() => areas.id),
  assetTypeId: uuid('asset_type_id').references(() => assetTypes.id),
  docTypeId: uuid('doc_type_id').references(() => documentTypes.id),
  isActive: boolean('is_active').default(true),
  grantedAt: timestamp('granted_at', { withTimezone: true }).defaultNow(),
  grantedBy: uuid('granted_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
