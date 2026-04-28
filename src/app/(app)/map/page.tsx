import Link from 'next/link';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { floorPlans } from '@/db/schema';
import { Map } from 'lucide-react';

export default async function MapIndexPage() {
  const plans = await db
    .select()
    .from(floorPlans)
    .where(eq(floorPlans.isActive, true));

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Floor Plans</h1>

      {plans.length === 0 ? (
        <p className="text-sm text-gray-500">No floor plans found.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map((plan) => (
            <Link
              key={plan.id}
              href={`/map/${plan.id}`}
              className="bg-white border border-gray-200 rounded-lg p-5 hover:border-green-600 hover:shadow-sm transition-all flex items-center gap-4 group"
            >
              <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center shrink-0 group-hover:bg-green-100 transition-colors">
                <Map size={20} className="text-green-700" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{plan.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">View floor plan</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
