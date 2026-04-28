'use client';

import Link from 'next/link';
import { Lightbulb, EyeOff } from 'lucide-react';
import { useHelpMode } from '@/lib/help/use-help-mode';
import { getTopic } from '@/lib/help/topics';
import type { HelpTopicSlug } from '@/lib/help/types';

interface Props {
  /**
   * The topic this banner introduces. The "Read the full guide" link points
   * to /help/[topic]. The banner copy comes from `text` prop, not the topic
   * — the banner is page-context, the topic is reference content.
   */
  topic: HelpTopicSlug;
  /** Plain-English page-context hint shown in the banner. */
  text: string;
}

/**
 * Dismissable hint at the top of a major page. Default: shown.
 * Hidden when the user has set help-mode to 'hidden'.
 *
 * The "Hide help guides" button in the banner is the primary affordance for
 * turning help off. Users can re-enable from /help.
 */
export default function HelpBanner({ topic, text }: Props) {
  const { mode, setMode } = useHelpMode();
  if (mode === 'hidden') return null;

  const data = getTopic(topic);

  return (
    <section
      role="region"
      aria-label="Page guidance"
      className="bg-amber-50 border border-amber-200 text-amber-900 rounded-md px-4 py-3 mb-4 flex items-start gap-3"
    >
      <Lightbulb size={16} className="text-amber-600 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm">{text}</p>
        <div className="flex gap-4 mt-1.5 text-xs">
          {data && (
            <Link
              href={`/help/${topic}`}
              className="font-medium text-amber-900 hover:underline"
            >
              Read the full guide →
            </Link>
          )}
          <button
            type="button"
            onClick={() => setMode('hidden')}
            className="inline-flex items-center gap-1 text-amber-800 hover:underline"
            aria-label="Hide all help guides across the platform"
          >
            <EyeOff size={11} />
            Hide help guides
          </button>
        </div>
      </div>
    </section>
  );
}
