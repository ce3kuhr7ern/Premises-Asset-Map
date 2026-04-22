import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

const isPublicAuthRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/auth/provision',
]);

function isAppHost(req: NextRequest): boolean {
  const host = req.headers.get('host') ?? '';
  return host.startsWith('app.') || host.startsWith('app.localhost');
}

export default clerkMiddleware(async (auth, req) => {
  if (isAppHost(req)) {
    // Redirect root to dashboard on the app subdomain
    if (req.nextUrl.pathname === '/') {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
    // Protect all non-auth routes
    if (!isPublicAuthRoute(req)) {
      await auth.protect();
    }
  }
  // www subdomain — no auth required, pass through
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
