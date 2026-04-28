'use client';

import { useState, lazy, Suspense } from 'react';
import { HelpCircle } from 'lucide-react';
import { useHelpMode } from '@/lib/help/use-help-mode';
import { getTopic } from '@/lib/help/topics';
import type { HelpTopicSlug } from '@/lib/help/types';

const HelpModal = lazy(() => import('./HelpModal'));

interface Props {
  topic: HelpTopicSlug;
  /** Visual size of the icon. Default 14px. */
  size?: number;
  /** Override the aria-label / title; defaults to the topic title. */
  label?: string;
}

/**
 * Small "?" icon. Click → opens the help modal for the given topic.
 * Hidden when the user has set help-mode to 'hidden' (see useHelpMode).
 */
export default function HelpIcon({ topic, size = 14, label }: Props) {
  const { mode } = useHelpMode();
  const [open, setOpen] = useState(false);

  if (mode === 'hidden') return null;

  const data = getTopic(topic);
  if (!data && process.env.NODE_ENV === 'development') {
    console.warn(`[HelpIcon] Unknown topic: ${topic}`);
  }
  if (!data) return null;

  const ariaLabel = label ?? `Help: ${data.title}`;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={ariaLabel}
        title={ariaLabel}
        className="inline-flex items-center justify-center w-6 h-6 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors align-middle"
      >
        <HelpCircle size={size} />
      </button>

      {open && (
        <Suspense fallback={null}>
          <HelpModal topic={topic} onClose={() => setOpen(false)} />
        </Suspense>
      )}
    </>
  );
}
