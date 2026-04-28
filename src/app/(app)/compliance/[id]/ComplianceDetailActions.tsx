'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X, Check, ArrowRight, Trash2, Undo2 } from 'lucide-react';
import {
  transitionStatus,
  scheduleComplianceItem,
  recordApproval,
  recordCompletion,
  cancelComplianceItem,
  reopenComplianceItem,
  type ComplianceStatus,
} from '@/app/actions/compliance';

interface Approver {
  id: string;
  name: string;
}

interface Props {
  id: string;
  status: string;
  isRecurring: boolean;
  intervalDays: number | null;
  eligibleApprovers: Approver[];
}

const NEXT_LABEL: Record<ComplianceStatus, string | null> = {
  pending:           'Start quoting',
  quoting:           'Request approval',
  awaiting_approval: 'Record approval',
  approved:          'Schedule',
  scheduled:         'Mark complete',
  completed:         null,
  cancelled:         'Reopen',
};

export default function ComplianceDetailActions({
  id,
  status,
  isRecurring,
  intervalDays,
  eligibleApprovers,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [approvalOpen, setApprovalOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [completionOpen, setCompletionOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  async function handleNextAction() {
    const s = status as ComplianceStatus;
    setError('');
    if (s === 'pending') {
      setBusy(true);
      const r = await transitionStatus(id, 'quoting');
      setBusy(false);
      if (!r.success) setError(r.error); else router.refresh();
    } else if (s === 'quoting') {
      setBusy(true);
      const r = await transitionStatus(id, 'awaiting_approval');
      setBusy(false);
      if (!r.success) setError(r.error); else router.refresh();
    } else if (s === 'awaiting_approval') {
      setApprovalOpen(true);
    } else if (s === 'approved') {
      setScheduleOpen(true);
    } else if (s === 'scheduled') {
      setCompletionOpen(true);
    } else if (s === 'cancelled') {
      setBusy(true);
      const r = await reopenComplianceItem(id);
      setBusy(false);
      if (!r.success) setError(r.error); else router.refresh();
    }
  }

  const nextLabel = NEXT_LABEL[status as ComplianceStatus];

  return (
    <section className="bg-white border border-slate-200 rounded-lg p-4">
      <h2 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">Actions</h2>

      {nextLabel ? (
        <button
          type="button"
          onClick={handleNextAction}
          disabled={busy}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {nextLabel}
          <ArrowRight size={14} />
        </button>
      ) : (
        <p className="text-xs text-slate-400 italic">No further action.</p>
      )}

      {status !== 'cancelled' && status !== 'completed' && (
        <button
          type="button"
          onClick={() => setCancelOpen(true)}
          disabled={busy}
          className="mt-2 w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-medium text-slate-500 hover:text-red-600"
        >
          <Trash2 size={12} />
          Cancel item
        </button>
      )}

      {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}

      {approvalOpen && (
        <ApprovalModal
          id={id}
          eligibleApprovers={eligibleApprovers}
          onClose={() => setApprovalOpen(false)}
          onDone={() => { setApprovalOpen(false); router.refresh(); }}
        />
      )}

      {scheduleOpen && (
        <ScheduleModal
          id={id}
          onClose={() => setScheduleOpen(false)}
          onDone={() => { setScheduleOpen(false); router.refresh(); }}
        />
      )}

      {completionOpen && (
        <CompletionModal
          id={id}
          isRecurring={isRecurring}
          intervalDays={intervalDays}
          onClose={() => setCompletionOpen(false)}
          onDone={() => { setCompletionOpen(false); router.refresh(); }}
        />
      )}

      {cancelOpen && (
        <CancelModal
          id={id}
          onClose={() => setCancelOpen(false)}
          onDone={() => { setCancelOpen(false); router.refresh(); }}
        />
      )}
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Approval modal
// ─────────────────────────────────────────────────────────────────────────────

function ApprovalModal({
  id,
  eligibleApprovers,
  onClose,
  onDone,
}: {
  id: string;
  eligibleApprovers: Approver[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [decision, setDecision] = useState<'approved' | 'rejected'>('approved');
  const [channel, setChannel] = useState<'meeting' | 'email' | 'whatsapp' | 'in_app'>('meeting');
  const [approverIds, setApproverIds] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  function toggle(id: string) {
    setApproverIds((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function submit() {
    if (approverIds.size === 0) {
      setError('Please select at least one approving trustee.');
      return;
    }
    setBusy(true);
    setError('');
    const r = await recordApproval(id, {
      decision,
      channel,
      approverUserIds: Array.from(approverIds),
      notes: notes.trim() || null,
    });
    setBusy(false);
    if (!r.success) { setError(r.error); return; }
    onDone();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 sticky top-0 bg-white">
          <h2 className="text-base font-semibold text-slate-900">Record approval</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="text-slate-400 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <span className="form-label">Decision</span>
            <div className="flex gap-3 mt-1">
              {(['approved', 'rejected'] as const).map((d) => (
                <label key={d} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="decision"
                    value={d}
                    checked={decision === d}
                    onChange={() => setDecision(d)}
                  />
                  {d.charAt(0).toUpperCase() + d.slice(1)}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="ch-channel" className="form-label">Channel</label>
            <select
              id="ch-channel"
              value={channel}
              onChange={(e) => setChannel(e.target.value as typeof channel)}
              className="form-select"
            >
              <option value="meeting">In a meeting</option>
              <option value="email">Email</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="in_app">In-app</option>
            </select>
          </div>

          <div>
            <span className="form-label">Approving trustee(s) <span className="text-red-500">*</span></span>
            {eligibleApprovers.length === 0 ? (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2 mt-1">
                No eligible trustees found in this organisation. Add `trust_admin` or `trustee` memberships first.
              </p>
            ) : (
              <ul className="mt-1 space-y-1.5 max-h-40 overflow-y-auto border border-slate-200 rounded p-2">
                {eligibleApprovers.map((a) => (
                  <li key={a.id}>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={approverIds.has(a.id)}
                        onChange={() => toggle(a.id)}
                        className="form-checkbox"
                      />
                      {a.name}
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <label htmlFor="ch-notes" className="form-label">Notes</label>
            <textarea
              id="ch-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="form-textarea"
              placeholder="e.g. WhatsApp group chat 14 Apr — Jane, John, Mark all approved"
              maxLength={5000}
            />
          </div>

          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        </div>

        <div className="flex gap-3 px-5 py-4 border-t border-slate-200 sticky bottom-0 bg-white">
          <button type="button" onClick={onClose} disabled={busy} className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50">
            Cancel
          </button>
          <button type="button" onClick={submit} disabled={busy || eligibleApprovers.length === 0} className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50">
            <Check size={14} />
            {busy ? 'Saving…' : 'Record'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Completion modal
// ─────────────────────────────────────────────────────────────────────────────

function CompletionModal({
  id,
  isRecurring,
  intervalDays,
  onClose,
  onDone,
}: {
  id: string;
  isRecurring: boolean;
  intervalDays: number | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [completedAt, setCompletedAt] = useState(today);
  const [costPounds, setCostPounds] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [autoCreateNext, setAutoCreateNext] = useState(isRecurring);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    setBusy(true);
    setError('');
    const cost = costPounds.trim();
    const costCents = cost ? Math.round(parseFloat(cost) * 100) : null;
    const r = await recordCompletion(id, {
      completedAt,
      costCents,
      notes: notes.trim() || null,
      autoCreateNext,
    });
    setBusy(false);
    if (!r.success) { setError(r.error); return; }
    onDone();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h2 className="text-base font-semibold text-slate-900">Mark complete</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="text-slate-400 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label htmlFor="cm-date" className="form-label">Completed on <span className="text-red-500">*</span></label>
            <input
              id="cm-date"
              type="date"
              value={completedAt}
              onChange={(e) => setCompletedAt(e.target.value)}
              className="form-input max-w-xs"
            />
          </div>

          <div>
            <label htmlFor="cm-cost" className="form-label">Cost (£)</label>
            <input
              id="cm-cost"
              type="number"
              min={0}
              step={0.01}
              value={costPounds}
              onChange={(e) => setCostPounds(e.target.value)}
              className="form-input max-w-xs"
              placeholder="Optional"
            />
          </div>

          <div>
            <label htmlFor="cm-notes" className="form-label">Notes</label>
            <textarea
              id="cm-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="form-textarea"
              placeholder="What was done, any follow-up needed"
            />
          </div>

          {isRecurring && intervalDays && (
            <div className="flex items-center gap-2">
              <input
                id="cm-next"
                type="checkbox"
                checked={autoCreateNext}
                onChange={(e) => setAutoCreateNext(e.target.checked)}
                className="form-checkbox"
              />
              <label htmlFor="cm-next" className="text-sm text-slate-700">
                Auto-create next cycle ({intervalDays} days from completion)
              </label>
            </div>
          )}

          <p className="text-xs text-slate-500">
            To attach a satisfaction certificate, upload it via the Document Vault and link to this item.
          </p>

          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        </div>

        <div className="flex gap-3 px-5 py-4 border-t border-slate-200">
          <button type="button" onClick={onClose} disabled={busy} className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50">
            Cancel
          </button>
          <button type="button" onClick={submit} disabled={busy} className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-700 disabled:opacity-50">
            <Check size={14} />
            {busy ? 'Saving…' : 'Mark complete'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Cancel modal
// ─────────────────────────────────────────────────────────────────────────────

function CancelModal({
  id,
  onClose,
  onDone,
}: {
  id: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    if (!reason.trim()) { setError('Please give a reason.'); return; }
    setBusy(true);
    setError('');
    const r = await cancelComplianceItem(id, reason.trim());
    setBusy(false);
    if (!r.success) { setError(r.error); return; }
    onDone();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h2 className="text-base font-semibold text-slate-900">Cancel this compliance item?</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="text-slate-400 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <p className="text-sm text-slate-500">
            The item will be archived. You can reopen it later if needed.
          </p>
          <div>
            <label htmlFor="cancel-reason" className="form-label">Reason <span className="text-red-500">*</span></label>
            <textarea
              id="cancel-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="form-textarea"
              placeholder="e.g. Asset decommissioned, no longer needed"
              maxLength={1000}
            />
          </div>
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        </div>
        <div className="flex gap-3 px-5 py-4 border-t border-slate-200">
          <button type="button" onClick={onClose} disabled={busy} className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50">
            Keep
          </button>
          <button type="button" onClick={submit} disabled={busy} className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50">
            <Undo2 size={14} />
            {busy ? 'Cancelling…' : 'Cancel item'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Schedule modal — contractor typeahead + optional date + notes
// ─────────────────────────────────────────────────────────────────────────────

interface SupplierSummary {
  id: string;
  name: string;
  primaryCategory: string | null;
  email: string | null;
  phone: string | null;
}

function ScheduleModal({
  id,
  onClose,
  onDone,
}: {
  id: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SupplierSummary[]>([]);
  const [chosen, setChosen] = useState<SupplierSummary | null>(null);
  const [scheduledFor, setScheduledFor] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [searching, setSearching] = useState(false);

  // Debounced typeahead search
  useEffect(() => {
    if (chosen) return;  // user has picked one — don't keep searching
    let cancelled = false;
    const handle = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/suppliers?q=${encodeURIComponent(query)}&limit=10`);
        const json = await res.json();
        if (!cancelled && json.success) setResults(json.data);
      } catch { /* swallow — typeahead is best-effort */ }
      finally { if (!cancelled) setSearching(false); }
    }, 200);
    return () => { cancelled = true; clearTimeout(handle); };
  }, [query, chosen]);

  async function submit() {
    setBusy(true);
    setError('');
    const r = await scheduleComplianceItem(id, {
      contractorId: chosen?.id ?? null,
      scheduledFor: scheduledFor || null,
      notes: notes.trim() || null,
    });
    setBusy(false);
    if (!r.success) { setError(r.error); return; }
    onDone();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 sticky top-0 bg-white">
          <h2 className="text-base font-semibold text-slate-900">Schedule</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="text-slate-400 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label htmlFor="sch-supplier" className="form-label">Supplier</label>
            {chosen ? (
              <div className="flex items-center justify-between gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded">
                <div className="text-sm">
                  <p className="font-medium text-slate-900">{chosen.name}</p>
                  {chosen.primaryCategory && (
                    <p className="text-xs text-slate-500">{chosen.primaryCategory}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => { setChosen(null); setQuery(''); }}
                  className="text-xs text-slate-500 hover:text-slate-900"
                >
                  Change
                </button>
              </div>
            ) : (
              <>
                <input
                  id="sch-supplier"
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="form-input"
                  placeholder="Type a supplier name…"
                  autoComplete="off"
                />
                {(query || results.length > 0) && (
                  <ul className="mt-1 border border-slate-200 rounded max-h-44 overflow-y-auto">
                    {searching && <li className="px-3 py-2 text-xs text-slate-400">Searching…</li>}
                    {!searching && results.length === 0 && (
                      <li className="px-3 py-2 text-xs text-slate-400">No active suppliers found.</li>
                    )}
                    {results.map((r) => (
                      <li key={r.id}>
                        <button
                          type="button"
                          onClick={() => { setChosen(r); setQuery(r.name); }}
                          className="block w-full text-left px-3 py-2 text-sm hover:bg-slate-50"
                        >
                          <p className="font-medium text-slate-900">{r.name}</p>
                          {r.primaryCategory && (
                            <p className="text-xs text-slate-500">{r.primaryCategory}</p>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="text-xs text-slate-500 mt-1">Optional — you can schedule without picking a supplier.</p>
              </>
            )}
          </div>

          <div>
            <label htmlFor="sch-date" className="form-label">Scheduled date</label>
            <input
              id="sch-date"
              type="date"
              value={scheduledFor}
              onChange={(e) => setScheduledFor(e.target.value)}
              className="form-input max-w-xs"
            />
          </div>

          <div>
            <label htmlFor="sch-notes" className="form-label">Notes</label>
            <textarea
              id="sch-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="form-textarea"
              placeholder="Booking reference, special instructions, etc."
            />
          </div>

          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        </div>

        <div className="flex gap-3 px-5 py-4 border-t border-slate-200 sticky bottom-0 bg-white">
          <button type="button" onClick={onClose} disabled={busy} className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50">
            Cancel
          </button>
          <button type="button" onClick={submit} disabled={busy} className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50">
            <Check size={14} />
            {busy ? 'Saving…' : 'Schedule'}
          </button>
        </div>
      </div>
    </div>
  );
}
