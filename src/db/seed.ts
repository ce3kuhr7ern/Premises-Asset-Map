import 'dotenv/config';
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from './schema';

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

async function seed() {
  console.log('Seeding default organisation, site, and floor plan...');

  const [organisation] = await db
    .insert(schema.organisations)
    .values({ name: 'Default Trust' })
    .onConflictDoNothing()
    .returning();
  const orgId = organisation?.id ?? (await db.select().from(schema.organisations).limit(1))[0]?.id;
  if (!orgId) throw new Error('No organisation seeded.');

  const [site] = await db
    .insert(schema.sites)
    .values({ name: 'Village Hall', organisationId: orgId })
    .onConflictDoNothing()
    .returning();
  const siteId = site?.id ?? (await db.select().from(schema.sites).limit(1))[0]?.id;
  if (!siteId) throw new Error('No site seeded.');

  const [floorPlan] = await db
    .insert(schema.floorPlans)
    .values({
      name: 'Ground Floor',
      imageUrl: '/Extension-Plan-1.svg',
      siteId,
    })
    .onConflictDoNothing()
    .returning();

  if (!floorPlan) {
    console.log('Floor plan already seeded — skipping.');
    return;
  }

  console.log(`Created floor plan: ${floorPlan.id}`);
  console.log('Seeding test assets...');

  // Positions are x/y as % of image dimensions (4214 × 2000)
  // Estimated positions based on the floor plan layout
  await db.insert(schema.mapAssets).values([
    {
      floorPlanId: floorPlan.id,
      label: 'Fire Extinguisher — Hall Entrance',
      x: 38,
      y: 48,
      iconKey: 'iso7010-f001',
    },
    {
      floorPlanId: floorPlan.id,
      label: 'Fire Extinguisher — Bar',
      x: 72,
      y: 35,
      iconKey: 'iso7010-f001',
    },
    {
      floorPlanId: floorPlan.id,
      label: 'Emergency Exit Sign — Main Exit',
      x: 50,
      y: 85,
      iconKey: 'iso7010-e001',
    },
  ]);

  console.log('Done. 3 test assets created.');
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
