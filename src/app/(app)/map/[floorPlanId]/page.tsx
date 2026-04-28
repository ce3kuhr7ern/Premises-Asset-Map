import { notFound } from 'next/navigation';
import { eq, isNull } from 'drizzle-orm';
import { db } from '@/db';
import { floorPlans, mapAssets } from '@/db/schema';
import MapView from '@/components/app/map/MapView';

interface Props {
  params: Promise<{ floorPlanId: string }>;
}

export default async function FloorPlanPage({ params }: Props) {
  const { floorPlanId } = await params;

  const floorPlan = await db.query.floorPlans.findFirst({
    where: eq(floorPlans.id, floorPlanId),
  });

  if (!floorPlan) notFound();

  const assets = await db
    .select()
    .from(mapAssets)
    .where(eq(mapAssets.floorPlanId, floorPlanId) && isNull(mapAssets.removedAt));

  const { imageWidth, imageHeight } = floorPlan.imageUrl.endsWith('.svg')
    ? { imageWidth: 1191, imageHeight: 792 }
    : { imageWidth: 2107, imageHeight: 1000 };

  return (
    <MapView
      floorPlan={{ ...floorPlan, imageWidth, imageHeight }}
      assets={assets.map((a) => ({
        id: a.id,
        label: a.label,
        iconKey: a.iconKey,
        x: a.x,
        y: a.y,
      }))}
    />
  );
}
