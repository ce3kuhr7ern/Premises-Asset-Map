import { pgTable, uuid, text, integer, real, boolean, date, timestamp } from 'drizzle-orm/pg-core';
import { organisations } from './organisations';
import { assets } from './assets';
import { complianceItems } from './compliance_items';
import { documentTypes } from './document_types';
import { users } from './users';

export const documents = pgTable('documents', {
  id: uuid('id').defaultRandom().primaryKey(),
  organisationId: uuid('organisation_id').references(() => organisations.id, { onDelete: 'cascade' }).notNull(),
  assetId: uuid('asset_id').references(() => assets.id, { onDelete: 'set null' }),
  complianceItemId: uuid('compliance_item_id').references(() => complianceItems.id, { onDelete: 'set null' }),
  docTypeId: uuid('doc_type_id').references(() => documentTypes.id, { onDelete: 'set null' }),

  name: text('name').notNull(),
  filename: text('filename').notNull(),
  mimeType: text('mime_type').notNull(),
  fileSize: integer('file_size').notNull(),
  fileUrl: text('file_url').notNull(),

  expiresAt: date('expires_at'),
  notes: text('notes'),

  // AI auto-categorisation provenance (v1.1) — see PWA_Features/document-vault.md §13.10
  aiSuggested: boolean('ai_suggested').notNull().default(false),
  aiConfidence: real('ai_confidence'),
  aiReasoning: text('ai_reasoning'),

  uploadedBy: uuid('uploaded_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
