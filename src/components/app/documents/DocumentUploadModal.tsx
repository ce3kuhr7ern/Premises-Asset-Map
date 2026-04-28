'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { X, Upload, FileText, Sparkles, Loader2 } from 'lucide-react';
import { createDocument, suggestDocumentMetadata, discardUploadedBlob } from '@/app/actions/documents';
import {
  ALLOWED_MIME_TYPES,
  MAX_DOCUMENT_BYTES,
  humanFileSize,
} from '@/lib/documents/constants';

/**
 * Server-side upload via XMLHttpRequest so we can report real progress
 * (fetch() doesn't expose upload progress yet). Resolves with the blob URL.
 */
function uploadToServer(file: File, onProgress: (pct: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append('file', file);

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener('load', () => {
      try {
        const json = JSON.parse(xhr.responseText) as
          | { success: true; data: { url: string } }
          | { success: false; error: string };
        if (xhr.status >= 200 && xhr.status < 300 && json.success) {
          resolve(json.data.url);
        } else {
          reject(new Error(json.success === false ? json.error : `Upload failed (${xhr.status})`));
        }
      } catch {
        reject(new Error(`Upload failed (${xhr.status})`));
      }
    });

    xhr.addEventListener('error', () => reject(new Error('Network error during upload')));
    xhr.addEventListener('abort', () => reject(new Error('Upload aborted')));

    xhr.open('POST', '/api/documents/upload');
    xhr.send(formData);
  });
}

interface DocType {
  id: string;
  name: string;
}

interface AssetOption {
  id: string;
  name: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  docTypes: DocType[];
  assets?: AssetOption[];
  preselectedAssetId?: string;
  preselectedAssetName?: string;
  preselectedComplianceItemId?: string;
  preselectedComplianceItemName?: string;
  /**
   * When set, the modal locks the Type field (and hides it). 'quote' also
   * hides the Expiry section. See PWA_Features/document-vault.md §16.
   */
  role?: 'quote' | 'certificate';
}

type UploadPhase = 'idle' | 'uploading' | 'analysing' | 'ready' | 'saving';

const AI_CONFIDENCE_FLOOR = 0.6;

// Track which fields the user has touched so AI suggestions never overwrite human input
type TouchedFields = { name: boolean; type: boolean; expiry: boolean };

export default function DocumentUploadModal({
  open,
  onClose,
  onSuccess,
  docTypes,
  assets = [],
  preselectedAssetId,
  preselectedAssetName,
  preselectedComplianceItemId,
  preselectedComplianceItemName,
  role,
}: Props) {
  // Resolve which doc type id to lock to when role is set. Falls back to the
  // first doc type if the canonical name isn't seeded — server-side validation
  // will still accept whatever id we pass.
  const lockedTypeName = role === 'quote' ? 'Quote' : role === 'certificate' ? 'Certificate' : null;
  const lockedType = lockedTypeName ? docTypes.find((t) => t.name === lockedTypeName) : null;
  const lockedTypeId = lockedType?.id ?? null;
  const hideType = role !== undefined && lockedTypeId !== null;
  const hideExpiry = role === 'quote';
  const [file, setFile] = useState<File | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [docTypeId, setDocTypeId] = useState(lockedTypeId ?? docTypes[0]?.id ?? '');
  const [assetId, setAssetId] = useState(preselectedAssetId ?? '');
  const [hasExpiry, setHasExpiry] = useState(false);
  const [expiresAt, setExpiresAt] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [phase, setPhase] = useState<UploadPhase>('idle');
  const [dragOver, setDragOver] = useState(false);
  const [aiHint, setAiHint] = useState<string | null>(null);
  const [aiFilled, setAiFilled] = useState<{ name: boolean; type: boolean; expiry: boolean }>({
    name: false, type: false, expiry: false,
  });
  const [aiProvenance, setAiProvenance] = useState<{
    used: boolean;
    confidence: number | null;
    reasoning: string | null;
  }>({ used: false, confidence: null, reasoning: null });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const touchedRef = useRef<TouchedFields>({ name: false, type: false, expiry: false });

  const reset = useCallback(() => {
    setFile(null);
    setBlobUrl(null);
    setName('');
    setDocTypeId(lockedTypeId ?? docTypes[0]?.id ?? '');
    setAssetId(preselectedAssetId ?? '');
    setHasExpiry(false);
    setExpiresAt('');
    setNotes('');
    setError('');
    setUploadProgress(0);
    setPhase('idle');
    setAiHint(null);
    setAiFilled({ name: false, type: false, expiry: false });
    setAiProvenance({ used: false, confidence: null, reasoning: null });
    touchedRef.current = { name: false, type: false, expiry: false };
  }, [docTypes, preselectedAssetId, lockedTypeId]);

  // If the modal closes without saving, clean up any orphan blob
  useEffect(() => {
    if (!open && blobUrl && phase !== 'saving') {
      discardUploadedBlob(blobUrl).catch(() => {/* swallow — best-effort */});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function handleClose() {
    if (phase === 'uploading' || phase === 'analysing' || phase === 'saving') return;
    if (blobUrl) {
      discardUploadedBlob(blobUrl).catch(() => {});
    }
    reset();
    onClose();
  }

  function markTouched(field: keyof TouchedFields) {
    touchedRef.current[field] = true;
    setAiFilled((s) => ({ ...s, [field]: false }));
  }

  async function pickFile(picked: File) {
    if (!ALLOWED_MIME_TYPES.includes(picked.type)) {
      setError('File type not allowed. Please upload a PDF, image, or Office document.');
      return;
    }
    if (picked.size > MAX_DOCUMENT_BYTES) {
      setError(`File is too large. Maximum size is ${humanFileSize(MAX_DOCUMENT_BYTES)}.`);
      return;
    }

    // Discard any previously uploaded blob (user changed file)
    if (blobUrl) {
      discardUploadedBlob(blobUrl).catch(() => {});
      setBlobUrl(null);
    }

    setFile(picked);
    setError('');
    setAiHint(null);
    // Initial filename pre-fill (touched-tracking won't fire since we set it before user types)
    if (!touchedRef.current.name) {
      const dot = picked.name.lastIndexOf('.');
      setName(dot > 0 ? picked.name.slice(0, dot) : picked.name);
    }

    // Phase 1: upload to Blob via our server route
    setPhase('uploading');
    setUploadProgress(0);
    let uploadedUrl: string;
    try {
      uploadedUrl = await uploadToServer(picked, (pct) => setUploadProgress(pct));
      setBlobUrl(uploadedUrl);
    } catch (err) {
      console.error('[upload]', err);
      setError(err instanceof Error ? err.message : 'Upload failed.');
      setPhase('idle');
      return;
    }

    // Phase 2: AI suggestion (PDFs and images only)
    const isAiSupported = picked.type === 'application/pdf' || picked.type.startsWith('image/');
    if (!isAiSupported) {
      setAiHint('AI suggestion only available for PDFs and images.');
      setPhase('ready');
      return;
    }

    setPhase('analysing');
    try {
      const result = await suggestDocumentMetadata({
        blobUrl: uploadedUrl,
        mimeType: picked.type,
      });

      if (!result.success) {
        // Silent fallback — AI optional
        setAiHint(null);
        setPhase('ready');
        return;
      }

      const suggestion = result.data;

      if (suggestion.confidence < AI_CONFIDENCE_FLOOR) {
        setAiHint("AI couldn't confidently classify this — please fill in manually.");
        setPhase('ready');
        return;
      }

      // Pre-fill ONLY fields the user hasn't touched
      const filled = { name: false, type: false, expiry: false };
      if (!touchedRef.current.name && suggestion.suggestedName) {
        setName(suggestion.suggestedName);
        filled.name = true;
      }
      if (!touchedRef.current.type && suggestion.suggestedDocTypeId) {
        setDocTypeId(suggestion.suggestedDocTypeId);
        filled.type = true;
      }
      if (!touchedRef.current.expiry && suggestion.suggestedExpiry) {
        setHasExpiry(true);
        setExpiresAt(suggestion.suggestedExpiry);
        filled.expiry = true;
      }

      setAiFilled(filled);
      setAiProvenance({
        used: filled.name || filled.type || filled.expiry,
        confidence: suggestion.confidence,
        reasoning: suggestion.reasoning,
      });
      setPhase('ready');
    } catch (err) {
      console.error('[ai-suggest]', err);
      setPhase('ready');
    }
  }

  async function handleSubmit() {
    if (!file || !blobUrl) { setError('Please choose a file.'); return; }
    if (!name.trim()) { setError('Please enter a name.'); return; }
    if (!docTypeId) { setError('Please select a document type.'); return; }
    if (hasExpiry && !expiresAt) { setError('Please pick an expiry date or untick the box.'); return; }

    setPhase('saving');
    setError('');

    try {
      const result = await createDocument({
        name: name.trim(),
        docTypeId,
        assetId: assetId || null,
        complianceItemId: preselectedComplianceItemId || null,
        expiresAt: hasExpiry ? (expiresAt || null) : null,
        notes: notes.trim() || null,
        filename: file.name,
        mimeType: file.type,
        fileSize: file.size,
        fileUrl: blobUrl,
        aiSuggested: aiProvenance.used,
        aiConfidence: aiProvenance.confidence,
        aiReasoning: aiProvenance.reasoning,
      });

      if (!result.success) {
        setError(result.error);
        setPhase('ready');
        return;
      }

      reset();
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error('[save]', err);
      setError('Could not save document.');
      setPhase('ready');
    }
  }

  if (!open) return null;

  const busy = phase === 'uploading' || phase === 'analysing' || phase === 'saving';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 sticky top-0 bg-white">
          <h2 className="text-base font-semibold text-slate-900">Upload Document</h2>
          <button
            type="button"
            onClick={handleClose}
            disabled={busy}
            aria-label="Close"
            className="text-slate-400 hover:text-slate-600 disabled:opacity-30"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* File picker / drop zone */}
          {!file ? (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const dropped = e.dataTransfer.files[0];
                if (dropped) pickFile(dropped);
              }}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              role="button"
              tabIndex={0}
              className={`border-2 border-dashed rounded-md px-4 py-10 text-center cursor-pointer transition-colors ${
                dragOver ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-slate-400'
              }`}
            >
              <Upload size={28} className="mx-auto text-slate-400 mb-2" />
              <p className="text-sm text-slate-700 font-medium">Drop a file here, or click to browse</p>
              <p className="text-xs text-slate-500 mt-1">PDF, images, or Office docs · up to 25 MB</p>
              <input
                ref={fileInputRef}
                type="file"
                hidden
                accept={ALLOWED_MIME_TYPES.join(',')}
                onChange={(e) => {
                  const picked = e.target.files?.[0];
                  if (picked) pickFile(picked);
                  e.target.value = '';
                }}
              />
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-200 rounded-md px-4 py-3 flex items-center gap-3">
              <FileText size={20} className="text-slate-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">{file.name}</p>
                <p className="text-xs text-slate-500">{humanFileSize(file.size)}</p>
              </div>
              {phase === 'ready' && (
                <button
                  type="button"
                  onClick={() => {
                    if (blobUrl) discardUploadedBlob(blobUrl).catch(() => {});
                    reset();
                  }}
                  className="text-xs text-slate-500 hover:text-slate-900"
                >
                  Change
                </button>
              )}
            </div>
          )}

          {/* Phase indicators */}
          {phase === 'uploading' && (
            <div aria-live="polite">
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>Uploading…</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="bg-slate-100 rounded-full h-2 overflow-hidden">
                <div className="bg-blue-600 h-full transition-all" style={{ width: `${uploadProgress}%` }} />
              </div>
            </div>
          )}

          {phase === 'analysing' && (
            <div className="flex items-center gap-2 text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded px-3 py-2" aria-live="polite">
              <Loader2 size={14} className="animate-spin" />
              <span>AI is reading the document…</span>
            </div>
          )}

          {aiHint && phase === 'ready' && (
            <p className="text-xs text-slate-500 italic">{aiHint}</p>
          )}

          {/* Metadata fields — only visible once a file is being processed */}
          {file && (
            <>
              <div>
                <label htmlFor="d-name" className="form-label">
                  Name <span className="text-red-500">*</span>
                  {aiFilled.name && <AiPill />}
                </label>
                <input
                  id="d-name"
                  type="text"
                  maxLength={200}
                  value={name}
                  onChange={(e) => { markTouched('name'); setName(e.target.value); }}
                  className="form-input"
                  disabled={phase === 'saving'}
                />
              </div>

              {(!hideType || !hideExpiry) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {!hideType && (
                <div>
                  <label htmlFor="d-type" className="form-label">
                    Type <span className="text-red-500">*</span>
                    {aiFilled.type && <AiPill />}
                  </label>
                  <select
                    id="d-type"
                    value={docTypeId}
                    onChange={(e) => { markTouched('type'); setDocTypeId(e.target.value); }}
                    className="form-select"
                    disabled={phase === 'saving'}
                  >
                    {docTypes.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
                )}

                {!hideExpiry && (
                <div>
                  <span className="form-label">
                    Expiry
                    {aiFilled.expiry && <AiPill />}
                  </span>
                  <div className="flex items-center gap-2 h-[38px]">
                    <input
                      id="d-has-expiry"
                      type="checkbox"
                      checked={hasExpiry}
                      onChange={(e) => {
                        markTouched('expiry');
                        const next = e.target.checked;
                        setHasExpiry(next);
                        if (!next) setExpiresAt('');
                      }}
                      className="form-checkbox"
                      disabled={phase === 'saving'}
                    />
                    <label htmlFor="d-has-expiry" className="text-sm text-slate-700">
                      This document has an expiry date
                    </label>
                  </div>
                </div>
                )}
              </div>
              )}

              {/* Conditional date input — revealed when checkbox is ticked. Hidden entirely when hideExpiry. */}
              {!hideExpiry && (
              <div
                className={`grid transition-all duration-300 ease-in-out ${
                  hasExpiry ? 'grid-expand-open' : 'grid-expand-closed'
                }`}
              >
                <div className="overflow-hidden">
                  <div className={`transition-all duration-300 ${hasExpiry ? 'pt-1 opacity-100' : 'pt-0 opacity-0'}`}>
                    <label htmlFor="d-expires" className="form-label">
                      Expires on <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="d-expires"
                      type="date"
                      value={expiresAt}
                      onChange={(e) => { markTouched('expiry'); setExpiresAt(e.target.value); }}
                      className="form-input max-w-xs"
                      disabled={phase === 'saving'}
                      tabIndex={hasExpiry ? 0 : -1}
                    />
                  </div>
                </div>
              </div>
              )}

              {preselectedComplianceItemId ? (
                <div className="text-xs bg-blue-50 border border-blue-200 text-blue-700 rounded px-3 py-2">
                  Linking to compliance item: <strong>{preselectedComplianceItemName}</strong>
                </div>
              ) : preselectedAssetId ? (
                <div className="text-xs bg-blue-50 border border-blue-200 text-blue-700 rounded px-3 py-2">
                  Linking to asset: <strong>{preselectedAssetName}</strong>
                </div>
              ) : (
                <div>
                  <label htmlFor="d-asset" className="form-label">Linked asset</label>
                  <select
                    id="d-asset"
                    value={assetId}
                    onChange={(e) => setAssetId(e.target.value)}
                    className="form-select"
                    disabled={phase === 'saving'}
                  >
                    <option value="">— Not linked (trust-level) —</option>
                    {assets.map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label htmlFor="d-notes" className="form-label">Notes</label>
                <textarea
                  id="d-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="form-textarea"
                  disabled={phase === 'saving'}
                />
              </div>
            </>
          )}

          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

          {phase === 'saving' && (
            <p className="text-xs text-slate-500" aria-live="polite">Saving record…</p>
          )}
        </div>

        <div className="flex gap-3 px-5 py-4 border-t border-slate-200 sticky bottom-0 bg-white">
          <button
            type="button"
            onClick={handleClose}
            disabled={busy}
            className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={busy || !file || !blobUrl || phase !== 'ready'}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {phase === 'uploading' ? 'Uploading…'
             : phase === 'analysing' ? 'Analysing…'
             : phase === 'saving' ? 'Saving…'
             : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

function AiPill() {
  return (
    <span
      className="ml-2 inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide rounded bg-blue-50 text-blue-700 border border-blue-200"
      title="Suggested by AI — edit if not quite right"
    >
      <Sparkles size={9} />
      AI
    </span>
  );
}
