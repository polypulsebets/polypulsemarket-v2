import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// 1. Defined Blocked Countries
const BLOCKED_COUNTRIES = [
  'US', 'GB', 'FR', 'SG', 'PL', 'TH', 'AU', 'BE', 'TW', 
  'IR', 'KP', 'CU', 'SY', 'RU', 'MM', 'LY', 'YE', 'ZW'
];

export function middleware(req: NextRequest) {
  // 2. Skip checks for internal Next.js files, API routes, and static assets
  if (
    req.nextUrl.pathname.startsWith('/_next') ||
    req.nextUrl.pathname.startsWith('/api') ||
    req.nextUrl.pathname.startsWith('/favicon.ico') ||
    req.nextUrl.pathname.startsWith('/logo.png') ||
    req.nextUrl.pathname === '/blocked' 
  ) {
    return NextResponse.next();
  }

  // 3. Get Country (Vercel Header)
  let country = req.geo?.country || req.headers.get('x-vercel-ip-country');

  // 4. Check if blocked
  if (country && BLOCKED_COUNTRIES.includes(country.toUpperCase())) {
    return NextResponse.redirect(new URL('/blocked', req.url));
  }

  return NextResponse.next();
}