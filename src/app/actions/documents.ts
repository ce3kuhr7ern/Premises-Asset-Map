'use server';

import { revalidatePath } from 'next/cache';
import { eq, and } from 'drizzle-orm';
import { del } from '@vercel/blob';
import Anthropic from '@anthropic-ai/sdk';
import { db } from '@/db';
import { documents, documentTypes, assets, complianceItems } from '@/db/schema';
import { resolveCurrentUser } from '@/lib/auth/provision';
import { can } from '@/lib/auth/can';
import { Permission } from '@/lib/auth/permissions';
import { ALLOWED_MIME_TYPES, MAX_DOCUMENT_BYTES } from '@/lib/documents/constants';

const ANTHROPIC_MAX_DOC_BYTES = 32 * 1024 * 1024; // 32 MB Anthropic limit
const ANTHROPIC_TIMEOUT_MS = 12_000;

type ActionResult<T = undefined> =
  | (T extends undefined ? { success: true } : { success: true; data: T })
  | { success: false; error: string };

export interface DocumentMetadata {
  name: string;
  docTypeId: string;
  assetId?: string | null;
  complianceItemId?: string | null;
  expiresAt?: string | null;
  notes?: string | null;
}

export interface CreateDocumentInput extends DocumentMetadata {
  filename: string;
  mimeType: string;
  fileSize: number;
  fileUrl: string;
  // AI provenance (v1.1 — see PWA_Features/document-vault.md §13.10)
  aiSuggested?: boolean;
  aiConfidence?: number | null;
  aiReasoning?: string | null;
}

function validateMetadata(data: DocumentMetadata): string | null {
  const name = data.name?.trim();
  if (!name) return 'Name is required.';
  if (name.length > 200) return 'Name must be under 200 characters.';
  if (!data.docTypeId) return 'Document type is required.';
  if (data.notes && data.notes.length > 5000) return 'Notes too long.';
  if (data.expiresAt && Number.isNaN(new Date(data.expiresAt).getTime())) return 'Invalid expiry date.';
  return null;
}

function validateFile(mimeType: string, fileSize: number): string | null {
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    return 'File type not allowed. Please upload a PDF, image, or Office document.';
  }
  if (fileSize > MAX_DOCUMENT_BYTES) {
    return 'File is too large. Maximum size is 25 MB.';
  }
  if (fileSize <= 0) {
    return 'File appears to be empty.';
  }
  return null;
}

export async function createDocument(data: CreateDocumentInput): Promise<ActionResult<{ id: string }>> {
  const user = await resolveCurrentUser();
  if (!user) return { success: false, error: 'Unauthorised.' };
  if (!(await can(user.clerkId, Permission.UploadDocument))) {
    return { success: false, error: 'Insufficient permissions.' };
  }

  const metaError = validateMetadata(data);
  if (metaError) return { success: false, error: metaError };

  const fileError = validateFile(data.mimeType, data.fileSize);
  if (fileError) return { success: false, error: fileError };

  // Verify the doc type exists
  const [type] = await db
    .select({ id: documentTypes.id })
    .from(documentTypes)
    .where(eq(documentTypes.id, data.docTypeId))
    .limit(1);
  if (!type) return { success: false, error: 'Invalid document type.' };

  // If linked to an asset, ensure it belongs to this org
  if (data.assetId) {
    const [asset] = await db
      .select({ id: assets.id })
      .from(assets)
      .where(and(eq(assets.id, data.assetId), eq(assets.organisationId, user.organisationId)))
      .limit(1);
    if (!asset) return { success: false, error: 'Linked asset not found.' };
  }

  // If linked to a compliance item, ensure it belongs to this org (v1.3)
  if (data.complianceItemId) {
    const [item] = await db
      .select({ id: complianceItems.id })
      .from(complianceItems)
      .where(and(eq(complianceItems.id, data.complianceItemId), eq(complianceItems.organisationId, user.organisationId)))
      .limit(1);
    if (!item) return { success: false, error: 'Linked compliance item not found.' };
  }

  try {
    const [row] = await db
      .insert(documents)
      .values({
        organisationId: user.organisationId,
        assetId: data.assetId || null,
        complianceItemId: data.complianceItemId || null,
        docTypeId: data.docTypeId,
        name: data.name.trim(),
        filename: data.filename,
        mimeType: data.mimeType,
        fileSize: data.fileSize,
        fileUrl: data.fileUrl,
        expiresAt: data.expiresAt || null,
        notes: data.notes?.trim() || null,
        aiSuggested: data.aiSuggested ?? false,
        aiConfidence: data.aiConfidence ?? null,
        aiReasoning: data.aiReasoning ?? null,
        uploadedBy: user.userId,
      })
      .returning({ id: documents.id });

    revalidatePath('/documents');
    if (data.assetId) revalidatePath(`/assets/${data.assetId}`);
    if (data.complianceItemId) revalidatePath(`/compliance/${data.complianceItemId}`);
    return { success: true, data: { id: row.id } };
  } catch (err) {
    console.error('[createDocument]', err);
    // Try to clean up the uploaded blob since the row never landed
    try { await del(data.fileUrl); } catch { /* swallow — orphan blob, not critical */ }
    return { success: false, error: 'Could not save document.' };
  }
}

export async function updateDocument(id: string, data: DocumentMetadata): Promise<ActionResult> {
  const user = await resolveCurrentUser();
  if (!user) return { success: false, error: 'Unauthorised.' };
  if (!(await can(user.clerkId, Permission.UploadDocument))) {
    return { success: false, error: 'Insufficient permissions.' };
  }

  const metaError = validateMetadata(data);
  if (metaError) return { success: false, error: metaError };

  if (data.assetId) {
    const [asset] = await db
      .select({ id: assets.id })
      .from(assets)
      .where(and(eq(assets.id, data.assetId), eq(assets.organisationId, user.organisationId)))
      .limit(1);
    if (!asset) return { success: false, error: 'Linked asset not found.' };
  }

  if (data.complianceItemId) {
    const [item] = await db
      .select({ id: complianceItems.id })
      .from(complianceItems)
      .where(and(eq(complianceItems.id, data.complianceItemId), eq(complianceItems.organisationId, user.organisationId)))
      .limit(1);
    if (!item) return { success: false, error: 'Linked compliance item not found.' };
  }

  try {
    const [updated] = await db
      .update(documents)
      .set({
        name: data.name.trim(),
        docTypeId: data.docTypeId,
        assetId: data.assetId || null,
        complianceItemId: data.complianceItemId || null,
        expiresAt: data.expiresAt || null,
        notes: data.notes?.trim() || null,
        updatedAt: new Date(),
      })
      .where(and(eq(documents.id, id), eq(documents.organisationId, user.organisationId)))
      .returning({ id: documents.id, assetId: documents.assetId, complianceItemId: documents.complianceItemId });
    if (!updated) return { success: false, error: 'Document not found.' };

    revalidatePath('/documents');
    revalidatePath(`/documents/${id}`);
    if (updated.assetId) revalidatePath(`/assets/${updated.assetId}`);
    if (updated.complianceItemId) revalidatePath(`/compliance/${updated.complianceItemId}`);
    return { success: true };
  } catch (err) {
    console.error('[updateDocument]', err);
    return { success: false, error: 'Could not update document.' };
  }
}

export async function deleteDocument(id: string): Promise<ActionResult> {
  const user = await resolveCurrentUser();
  if (!user) return { success: false, error: 'Unauthorised.' };
  if (!(await can(user.clerkId, Permission.DeleteDocument))) {
    return { success: false, error: 'Insufficient permissions.' };
  }

  const [doc] = await db
    .select({ fileUrl: documents.fileUrl, assetId: documents.assetId, complianceItemId: documents.complianceItemId })
    .from(documents)
    .where(and(eq(documents.id, id), eq(documents.organisationId, user.organisationId)))
    .limit(1);
  if (!doc) return { success: false, error: 'Document not found.' };

  try {
    await db.delete(documents).where(eq(documents.id, id));
    // Best-effort blob delete — don't fail the action if it errors
    try { await del(doc.fileUrl); } catch (err) { console.error('[deleteDocument] blob delete failed', err); }

    revalidatePath('/documents');
    if (doc.assetId) revalidatePath(`/assets/${doc.assetId}`);
    if (doc.complianceItemId) revalidatePath(`/compliance/${doc.complianceItemId}`);
    return { success: true };
  } catch (err) {
    console.error('[deleteDocument]', err);
    return { success: false, error: 'Could not delete document.' };
  }
}

export async function listDocumentsForCurrentOrg() {
  const user = await resolveCurrentUser();
  if (!user) return [];

  return db
    .select({
      id: documents.id,
      name: documents.name,
      mimeType: documents.mimeType,
      fileSize: documents.fileSize,
      expiresAt: documents.expiresAt,
      assetId: documents.assetId,
      assetName: assets.name,
      docTypeId: documents.docTypeId,
      docTypeName: documentTypes.name,
      createdAt: documents.createdAt,
    })
    .from(documents)
    .leftJoin(documentTypes, eq(documentTypes.id, documents.docTypeId))
    .leftJoin(assets, eq(assets.id, documents.assetId))
    .where(eq(documents.organisationId, user.organisationId))
    .orderBy(documents.expiresAt, documents.name);
}

export async function listDocumentsForAsset(assetId: string) {
  const user = await resolveCurrentUser();
  if (!user) return [];

  return db
    .select({
      id: documents.id,
      name: documents.name,
      mimeType: documents.mimeType,
      fileSize: documents.fileSize,
      fileUrl: documents.fileUrl,
      expiresAt: documents.expiresAt,
      docTypeName: documentTypes.name,
      createdAt: documents.createdAt,
    })
    .from(documents)
    .leftJoin(documentTypes, eq(documentTypes.id, documents.docTypeId))
    .where(and(eq(documents.assetId, assetId), eq(documents.organisationId, user.organisationId)))
    .orderBy(documents.expiresAt, documents.name);
}

/**
 * Deletes an uploaded Blob whose record never landed in the database.
 * Used by the upload modal to clean up when the user changes file or cancels
 * after the auto-upload has completed.
 */
export async function discardUploadedBlob(blobUrl: string): Promise<ActionResult> {
  const user = await resolveCurrentUser();
  if (!user) return { success: false, error: 'Unauthorised.' };
  // Don't gate on permission — this is cleanup, must always be allowed if signed in
  try {
    await del(blobUrl);
    return { success: true };
  } catch (err) {
    console.error('[discardUploadedBlob]', err);
    // Silent — orphan blobs are not critical
    return { success: true };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// AI auto-categorisation (v1.1) — see PWA_Features/document-vault.md §13
// ─────────────────────────────────────────────────────────────────────────────

export interface SuggestionResult {
  suggestedName: string;
  suggestedDocTypeId: string | null;
  suggestedExpiry: string | null;
  confidence: number;
  reasoning: string;
}

const SUGGEST_SYSTEM_PROMPT = `You are a document classifier for a UK village hall compliance platform.
Your job is to read uploaded documents (certificates, policies, insurance,
governance, property records) and classify them so trustees can find them
later. Be concise and factual — no speculation.

When extracting expiry dates, look for terms like "valid until", "expires",
"renewal date", "review by", "due date". If multiple dates are present,
choose the one that represents when this specific document becomes invalid
or needs renewing.

Return your classification using the categorise_document tool.`;

export async function suggestDocumentMetadata(input: {
  blobUrl: string;
  mimeType: string;
}): Promise<{ success: true; data: SuggestionResult } | { success: false; error: string }> {
  const user = await resolveCurrentUser();
  if (!user) return { success: false, error: 'Unauthorised.' };
  if (!(await can(user.clerkId, Permission.UploadDocument))) {
    return { success: false, error: 'Insufficient permissions.' };
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return { success: false, error: 'AI suggestions are not configured.' };
  }

  const isPdf = input.mimeType === 'application/pdf';
  const isImage = input.mimeType.startsWith('image/');
  if (!isPdf && !isImage) {
    return { success: false, error: 'AI suggestions only available for PDFs and images.' };
  }

  // Fetch the file from Vercel Blob (URL is public-but-unguessable)
  let buffer: Buffer;
  try {
    const res = await fetch(input.blobUrl);
    if (!res.ok) return { success: false, error: 'Could not retrieve uploaded file.' };
    const contentLength = Number(res.headers.get('content-length') ?? 0);
    if (contentLength > ANTHROPIC_MAX_DOC_BYTES) {
      return { success: false, error: 'File too large for AI suggestion.' };
    }
    const arrayBuffer = await res.arrayBuffer();
    if (arrayBuffer.byteLength > ANTHROPIC_MAX_DOC_BYTES) {
      return { success: false, error: 'File too large for AI suggestion.' };
    }
    buffer = Buffer.from(arrayBuffer);
  } catch (err) {
    console.error('[suggestDocumentMetadata] fetch', err);
    return { success: false, error: 'Could not retrieve uploaded file.' };
  }

  // Look up the org's active document types — names go into the tool's enum
  const types = await db
    .select({ id: documentTypes.id, name: documentTypes.name })
    .from(documentTypes)
    .orderBy(documentTypes.name);
  const typeNames = types.map((t) => t.name);
  if (typeNames.length === 0) {
    return { success: false, error: 'No document types configured.' };
  }

  const tool: Anthropic.Tool = {
    name: 'categorise_document',
    description: 'Classify a compliance document and extract key metadata.',
    input_schema: {
      type: 'object',
      properties: {
        suggested_name: {
          type: 'string',
          description:
            'A concise, human-readable name (max 80 chars). Include the most useful identifier — title number, certificate reference, policy name. Example: "HM Land Registry Title TT123456 — Village Hall"',
        },
        suggested_doc_type: {
          type: 'string',
          enum: typeNames,
          description: 'The single best matching document type from the provided list',
        },
        suggested_expiry_date: {
          type: ['string', 'null'],
          description:
            'ISO 8601 date (YYYY-MM-DD) when this document expires or needs renewal. Null if no expiry date is present.',
        },
        confidence: {
          type: 'number',
          minimum: 0,
          maximum: 1,
          description: 'How confident you are in the classification (0 = guess, 1 = certain)',
        },
        reasoning: {
          type: 'string',
          description: 'Brief explanation of how you classified the document. One sentence.',
        },
      },
      required: ['suggested_name', 'suggested_doc_type', 'confidence', 'reasoning'],
    },
  };

  const userMessage = `The document_types available in this trust are:
${typeNames.map((n) => `- ${n}`).join('\n')}

Classify the attached document. If unsure, return a low confidence score
rather than guess.`;

  const documentBlock: Anthropic.ContentBlockParam = isPdf
    ? {
        type: 'document',
        source: {
          type: 'base64',
          media_type: 'application/pdf',
          data: buffer.toString('base64'),
        },
      }
    : {
        type: 'image',
        source: {
          type: 'base64',
          media_type: input.mimeType as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif',
          data: buffer.toString('base64'),
        },
      };

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ANTHROPIC_TIMEOUT_MS);

  try {
    const response = await anthropic.messages.create(
      {
        model: process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5',
        max_tokens: 1024,
        system: [
          {
            type: 'text',
            text: SUGGEST_SYSTEM_PROMPT,
            cache_control: { type: 'ephemeral' },
          },
        ],
        tools: [tool],
        tool_choice: { type: 'tool', name: 'categorise_document' },
        messages: [{ role: 'user', content: [documentBlock, { type: 'text', text: userMessage }] }],
      },
      { signal: controller.signal },
    );

    const toolUse = response.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use',
    );
    if (!toolUse) {
      return { success: false, error: 'AI did not return a classification.' };
    }

    const raw = toolUse.input as {
      suggested_name?: string;
      suggested_doc_type?: string;
      suggested_expiry_date?: string | null;
      confidence?: number;
      reasoning?: string;
    };

    const suggestedName = String(raw.suggested_name ?? '').slice(0, 200).trim();
    const matchedType = types.find((t) => t.name === raw.suggested_doc_type) ?? null;
    const expiryDate =
      raw.suggested_expiry_date && !Number.isNaN(new Date(raw.suggested_expiry_date).getTime())
        ? raw.suggested_expiry_date.slice(0, 10)
        : null;
    const confidence = Math.max(0, Math.min(1, Number(raw.confidence ?? 0)));

    return {
      success: true,
      data: {
        suggestedName,
        suggestedDocTypeId: matchedType?.id ?? null,
        suggestedExpiry: expiryDate,
        confidence,
        reasoning: String(raw.reasoning ?? ''),
      },
    };
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return { success: false, error: 'AI suggestion timed out.' };
    }
    console.error('[suggestDocumentMetadata]', err);
    return { success: false, error: 'AI suggestion unavailable.' };
  } finally {
    clearTimeout(timeout);
  }
}
