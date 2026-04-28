import { pgTable, uuid, primaryKey } from 'drizzle-orm/pg-core';
import { contractors } from './contractors';
import { contractorCategories } from './contractor_categories';

export const contractorCategoryAssignments = pgTable(
  'contractor_category_assignments',
  {
    contractorId: uuid('contractor_id').references(() => contractors.id, { onDelete: 'cascade' }).notNull(),
    categoryId: uuid('category_id').references(() => contractorCategories.id, { onDelete: 'cascade' }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.contractorId, t.categoryId] })],
);
