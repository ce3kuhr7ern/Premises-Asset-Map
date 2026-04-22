import { pgEnum } from 'drizzle-orm/pg-core';

export const appRoleEnum = pgEnum('app_role', [
  'trust_admin',
  'trustee',
  'club_manager',
  'club_user',
  'contractor',
  'auditor',
]);
