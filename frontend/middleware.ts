import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const BLOCKED_COUNTRIES = [
  'US', 'FR', 'SG', 'PL', 'TH', 'AU', 'BE', 'TW', 
  'IR', 'KP', 'CU', 'SY', 'RU', 'MM', 'LY', 'YE', 'ZW', 'GB'
];

export function middleware(req: NextRequest) {
  if (
    req.nextUrl.pathname.startsWith('/_next') ||
    req.nextUrl.pathname.startsWith('/api') ||
    req.nextUrl.pathname.startsWith('/favicon.ico') ||
    req.nextUrl.pathname.startsWith('/logo.png') ||
    req.nextUrl.pathname === '/blocked' 
  ) {
    return NextResponse.next();
  }

  const country = req.headers.get('x-vercel-ip-country');

  // 4. Check if blocked
  if (country && BLOCKED_COUNTRIES.includes(country.toUpperCase())) {
    return NextResponse.redirect(new URL('/blocked', req.url));
  }

  return NextResponse.next();
}