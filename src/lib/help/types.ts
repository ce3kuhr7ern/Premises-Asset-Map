// Help & Guidance v1.0 — type definitions for static topic content.
// See PWA_Features/help-guidance.md §3.

export type HelpCategory =
  | 'getting-started'
  | 'map'
  | 'assets'
  | 'asset-types'
  | 'documents'
  | 'compliance'
  | 'suppliers'
  | 'workflow';

export interface HelpTopic {
  slug: HelpTopicSlug;
  title: string;
  category: HelpCategory;
  shortDescription: string;
  body: HelpBlock[];
  related?: HelpTopicSlug[];
}

export type HelpBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'heading'; text: string; level: 2 | 3 }
  | { type: 'list'; items: string[]; ordered?: boolean }
  | { type: 'tip'; text: string }
  | { type: 'callout'; tone: 'info' | 'warning'; text: string };

/**
 * Compile-time enumeration of every help topic slug. Keeps `<HelpIcon topic="..." />`
 * type-safe — TypeScript will reject unknown slugs.
 */
export type HelpTopicSlug =
  | 'dashboard-overview'
  | 'map-overview'
  | 'placing-an-asset'
  | 'adding-an-asset'
  | 'archive-vs-delete'
  | 'asset-types-overview'
  | 'uploading-a-document'
  | 'ai-auto-fill'
  | 'document-expiry'
  | 'compliance-lifecycle'
  | 'recording-an-approval'
  | 'scheduling-with-a-supplier'
  | 'adding-a-supplier'
  | 'archived-suppliers'
  | 'secretary-monthly-rhythm';

export const CATEGORY_LABELS: Record<HelpCategory, string> = {
  'getting-started': 'Getting started',
  map: 'The map',
  assets: 'Assets',
  'asset-types': 'Asset types',
  documents: 'Documents',
  compliance: 'Compliance',
  suppliers: 'Suppliers',
  workflow: 'The secretary’s workflow',
};

export const CATEGORY_ORDER: HelpCategory[] = [
  'getting-started',
  'map',
  'assets',
  'asset-types',
  'documents',
  'compliance',
  'suppliers',
  'workflow',
];
