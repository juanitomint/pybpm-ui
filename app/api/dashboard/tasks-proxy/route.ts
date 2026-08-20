/**
 * Route handler that proxies GET requests for dashboard tasks to the backend API.
 * 
 * This is needed because Next.js App Router file system routes take priority over
 * rewrites in `next.config.mjs` — without this handler, client-side fetches from
 * `app/dashboard/tasks/page.tsx` to `/dashboard/tasks?...` would receive HTML (the
 * SSR page) instead of JSON from the backend.
 */

import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.PYBPM_API_URL || 'http://localhost:5000';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  
  // Forward query parameters to backend
  const backendUrl = `${BACKEND_URL}/dashboard/tasks?${url.searchParams.toString()}`;
  
  try {
    const authHeader = request.headers.get('authorization');
    
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        ...(authHeader && { Authorization: authHeader }),
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Backend request failed: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[tasks-proxy] Error proxying to backend:', error);
    return NextResponse.json(
      { error: 'Failed to connect to backend API' },
      { status: 502 }
    );
  }
}
