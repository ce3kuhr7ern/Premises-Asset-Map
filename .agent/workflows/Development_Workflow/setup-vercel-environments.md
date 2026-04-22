---
description: Ensure Vercel is set up with secured staging and production domains
---
# Vercel Environment Setup

This workflow guides you through configuring your Vercel deployment to have a standard production domain and a secure, password-protected staging environment.

---

## 1. Link Vercel Project

Ensure your local project is linked to the Vercel project.

```bash
npx vercel link --yes
```

---

## 2. Verify / Set Up Production Domain

Add your production domain to the Vercel project. Replace `your-domain.com` with the actual production domain.

```bash
npx vercel domains add your-domain.com
```

---

## 3. Verify / Set Up Staging Domain

Assign a consistent staging domain to your preview/staging branch via Vercel CLI.

```bash
npx vercel domains add stage-yourproject.vercel.app
```

---

## 4. Set Up Basic Authentication for Staging

If you are not on Vercel Pro (which has native password protection in the dashboard), the most reliable way to secure the staging environment is via Next.js Middleware for Basic Web Authentication.

This script creates a `middleware.ts` file in your `src` directory to password-protect any traffic hitting the staging URL.

```bash
cat << 'EOF' > src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  // Require authentication if on staging domain or Vercel preview environment
  const isStaging =
    process.env.VERCEL_ENV === 'preview' ||
    req.nextUrl.hostname.includes('stage-');

  if (isStaging) {
    const basicAuth = req.headers.get('authorization');

    if (basicAuth) {
      const authValue = basicAuth.split(' ')[1];
      const [user, pwd] = atob(authValue).split(':');

      // Credentials should be set in Vercel Environment Variables:
      // STAGING_USERNAME and STAGING_PASSWORD
      const validUser = process.env.STAGING_USERNAME || 'staging-user';
      const validPwd = process.env.STAGING_PASSWORD || 'change-me';

      if (user === validUser && pwd === validPwd) {
        return NextResponse.next();
      }
    }

    return new NextResponse('Authentication required to access staging environment.', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="Secure Staging Area"',
      },
    });
  }

  return NextResponse.next();
}

export const config = {
  // Apply middleware to all routes except Next.js internals and static files
  matcher: '/((?!_next/static|_next/image|favicon.ico).*)',
};
EOF
```

> **Important:** Replace the fallback credentials (`staging-user`, `change-me`) with meaningful values and always set `STAGING_USERNAME` and `STAGING_PASSWORD` as proper Vercel environment variables before sharing the staging URL with anyone.

---

## 5. Set Staging Credentials in Vercel

Add environment variables for the staging username and password to your Vercel project. You can also do this in the Vercel Dashboard → Settings → Environment Variables.

```bash
npx vercel env add STAGING_USERNAME preview
npx vercel env add STAGING_PASSWORD preview
```

---

## 6. Deploy to Staging to Test

Push your code or deploy directly to preview to test the Basic Authentication and your staging domain.

```bash
npx vercel deploy
```
