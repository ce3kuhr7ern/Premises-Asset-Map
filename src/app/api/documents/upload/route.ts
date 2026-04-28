import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { resolveCurrentUser } from '@/lib/auth/provision';
import { can } from '@/lib/auth/can';
import { Permission } from '@/lib/auth/permissions';
import {
  ALLOWED_MIME_TYPES,
  MAX_DOCUMENT_BYTES,
  slugifyFilename,
} from '@/lib/documents/constants';

/**
 * Server-side document upload.
 *
 * The browser POSTs the file as multipart/form-data; this route streams it
 * directly into Vercel Blob and returns the public URL. The client then calls
 * `createDocument` (server action) to insert the metadata row.
 *
 * We chose server-side over the @vercel/blob/client direct-to-Blob flow because
 * the client flow requires a publicly reachable callback URL for the upload-
 * completion handshake — fine in production on Vercel, broken in local dev
 * (Vercel can't reach localhost). The server flow Just Works in both.
 *
 * Cap: 25 MB per file. Next.js's default body-size limit is increased to 26 MB
 * via the route segment config below.
 */
export const config = {
  api: {
    bodyParser: false,
  },
};

// Next.js 15 route-segment config — allow bodies up to 26 MB on this route
export const maxDuration = 60;

export async function POST(request: Request) {
  const user = await resolveCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorised' }, { status: 401 });
  }
  if (!(await can(user.clerkId, Permission.UploadDocument))) {
    return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get('file');

  if (!(file instanceof File)) {
    return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return NextResponse.json(
      { success: false, error: 'File type not allowed.' },
      { status: 400 },
    );
  }

  if (file.size > MAX_DOCUMENT_BYTES) {
    return NextResponse.json(
      { success: false, error: 'File too large. Maximum size is 25 MB.' },
      { status: 400 },
    );
  }

  if (file.size <= 0) {
    return NextResponse.json(
      { success: false, error: 'File appears to be empty.' },
      { status: 400 },
    );
  }

  try {
    const safeName = slugifyFilename(file.name);
    const blob = await put(
      `documents/${user.organisationId}/${safeName}`,
      file,
      {
        access: 'public',
        addRandomSuffix: true,
        contentType: file.type,
      },
    );
    return NextResponse.json({
      success: true,
      data: {
        url: blob.url,
        pathname: blob.pathname,
        contentType: blob.contentType,
      },
    });
  } catch (err) {
    console.error('[document upload]', err);
    return NextResponse.json(
      { success: false, error: 'Upload failed.' },
      { status: 500 },
    );
  }
}
