import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { Webhook } from 'svix';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { users } from '@/db/schema';

// Clerk sends user.created / user.updated events via svix
// Set CLERK_WEBHOOK_SECRET in your Neon dashboard env and Clerk webhook settings
export async function POST(req: Request) {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  const headersList = await headers();
  const svixId = headersList.get('svix-id');
  const svixTimestamp = headersList.get('svix-timestamp');
  const svixSignature = headersList.get('svix-signature');

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: 'Missing svix headers' }, { status: 400 });
  }

  const body = await req.text();

  let event: { type: string; data: Record<string, unknown> };
  try {
    const wh = new Webhook(webhookSecret);
    event = wh.verify(body, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as typeof event;
  } catch {
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 });
  }

  if (event.type === 'user.created' || event.type === 'user.updated') {
    const clerkId = event.data.id as string;
    const email = (event.data.email_addresses as Array<{ email_address: string; primary: boolean }>)
      .find(e => e.primary)?.email_address ?? '';
    const displayName = [event.data.first_name, event.data.last_name]
      .filter(Boolean)
      .join(' ') || null;

    await db
      .insert(users)
      .values({ clerkId, email, displayName: displayName ?? undefined })
      .onConflictDoUpdate({
        target: users.clerkId,
        set: { email, displayName: displayName ?? undefined, updatedAt: new Date() },
      });
  }

  return NextResponse.json({ received: true });
}
