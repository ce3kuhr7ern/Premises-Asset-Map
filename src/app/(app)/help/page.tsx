import Link from 'next/link';
import { listTopics } from '@/lib/help/topics';
import { CATEGORY_LABELS, CATEGORY_ORDER, type HelpCategory, type HelpTopic } from '@/lib/help/types';
import HelpModeToggle from './HelpModeToggle';

export const metadata = { title: 'Help' };

export default function HelpIndexPage() {
  const all = listTopics();
  const byCategory = new Map<HelpCategory, HelpTopic[]>();
  for (const t of all) {
    const list = byCategory.get(t.category) ?? [];
    list.push(t);
    byCategory.set(t.category, list);
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold text-slate-900 mb-2">Help</h1>
      <p className="text-sm text-slate-500 mb-6">
        Plain-English guides to every part of the platform. Pick a topic below, or read them
        end to end with a cup of tea.
      </p>

      <HelpModeToggle />

      <div className="space-y-6">
        {CATEGORY_ORDER.map((cat) => {
          const topics = byCategory.get(cat);
          if (!topics || topics.length === 0) return null;
          return (
            <section key={cat}>
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                {CATEGORY_LABELS[cat]}
              </h2>
              <ul className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-100">
                {topics.map((t) => (
                  <li key={t.slug}>
                    <Link
                      href={`/help/${t.slug}`}
                      className="block px-4 py-3 hover:bg-slate-50"
                    >
                      <p className="text-sm font-medium text-slate-900">{t.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{t.shortDescription}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
