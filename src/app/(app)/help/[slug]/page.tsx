import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { getTopic } from '@/lib/help/topics';
import { CATEGORY_LABELS } from '@/lib/help/types';
import HelpContent from '@/components/help/HelpContent';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const topic = getTopic(slug);
  return { title: topic ? `Help: ${topic.title}` : 'Help' };
}

export default async function HelpTopicPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const topic = getTopic(slug);
  if (!topic) notFound();

  return (
    <div className="max-w-2xl mx-auto">
      <Link
        href="/help"
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 mb-3"
      >
        <ArrowLeft size={14} />
        Back to all topics
      </Link>

      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
        {CATEGORY_LABELS[topic.category]}
      </p>
      <h1 className="text-2xl font-semibold text-slate-900 mb-1">{topic.title}</h1>
      <p className="text-sm text-slate-500 mb-6">{topic.shortDescription}</p>

      <article className="bg-white border border-slate-200 rounded-lg p-6">
        <HelpContent blocks={topic.body} />
      </article>

      {topic.related && topic.related.length > 0 && (
        <section className="mt-6">
          <h2 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Related topics</h2>
          <ul className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-100">
            {topic.related.map((relSlug) => {
              const r = getTopic(relSlug);
              if (!r) return null;
              return (
                <li key={relSlug}>
                  <Link href={`/help/${relSlug}`} className="block px-4 py-3 hover:bg-slate-50">
                    <p className="text-sm font-medium text-slate-900">{r.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{r.shortDescription}</p>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
