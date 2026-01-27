import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const IS_MAINTENANCE_MODE = true; 
const BLOCKED_COUNTRIES = ['ZW'];

export function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.match(/\.(png|jpg|jpeg|svg|css|js)$/)
  ) {
    return NextResponse.next();
  }

  const bypassParam = searchParams.get('bypass');
  const bypassCookie = req.cookies.get('maintenance_bypass');
  const secretKey = process.env.MAINTENANCE_BYPASS_KEY;

  if (secretKey && bypassParam === secretKey) {
    const response = NextResponse.redirect(new URL('/', req.url));
    response.cookies.set('maintenance_bypass', 'true', { path: '/', maxAge: 60 * 60 * 24 });
    return response;
  }

  if (IS_MAINTENANCE_MODE && !bypassCookie) {
    if (pathname !== '/coming-soon') {
      return NextResponse.redirect(new URL('/coming-soon', req.url));
    }
    return NextResponse.next();
  }

  const country = req.headers.get('x-vercel-ip-country');
  
  if (country && BLOCKED_COUNTRIES.includes(country.toUpperCase())) {
    return NextResponse.redirect(new URL('/blocked', req.url));
  }

  return NextResponse.next();
}

//'US', 'FR', 'SG', 'PL', 'TH', 'AU', 'BE', 'TW', 'IR', 'KP', 'CU', 'SY', 'RU', 'MM', 'LY', 'YE',