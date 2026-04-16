// c:\Users\eduar\Desktop\myems\myems-telxius\middleware.ts

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyJwt } from '@/lib/auth';

const PUBLIC_ROUTES = ['/login', '/api/auth/login'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  const normalizedPathname = pathname.endsWith('/') && pathname !== '/' 
    ? pathname.slice(0, -1) 
    : pathname;

  const token = request.cookies.get('auth_token')?.value;

  console.log(`[AUTH-DEBUG] Pathname: ${pathname} | Token: ${!!token}`);

  const isPublicRoute = PUBLIC_ROUTES.some((route) => 
    normalizedPathname === route || normalizedPathname.startsWith(route + '/')
  );

  if (isPublicRoute) {
    if (token && normalizedPathname === '/login') {
      const url = request.nextUrl.clone();
      url.pathname = '/';
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  if (!token) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const url = request.nextUrl.clone();
    url.pathname = '/login/';
    return NextResponse.redirect(url);
  }

  const payload = await verifyJwt(token);
  if (!payload) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }
    const url = request.nextUrl.clone();
    url.pathname = '/login/';
    const res = NextResponse.redirect(url);
    res.cookies.delete('auth_token');
    return res;
  }

  // --- SECCIÓN DE AUTORIZACIÓN POR ROL ---
  const userRole = (payload.role as string) || 'TECHNICIAN';
  
  // Definir rutas que requieren ser ADMIN
  const isAdminRoute = 
    (normalizedPathname.startsWith('/topology') && !normalizedPathname.startsWith('/topology/dashboard')) ||
    normalizedPathname.startsWith('/inventory') ||
    normalizedPathname.startsWith('/config/users');

  if (isAdminRoute && userRole !== 'ADMIN') {
    console.warn(`[AUTH-DEBUG] User ${payload.username} [${userRole}] attempted access to ${pathname} - REDIRECTING`);
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  // BLOQUEO GLOBAL DE ESCRITURA PARA TÉCNICOS
  const isWriteMethod = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method);
  const isLogoutRequest = pathname.startsWith('/api/auth/logout/');

  if (isWriteMethod && userRole !== 'ADMIN' && !isLogoutRequest) {
    // Permitir POST a logout y otras rutas públicas si las hubiera (ya manejadas arriba por isPublicRoute)
    if (!isPublicRoute) {
      console.warn(`[AUTH-DEBUG] User ${payload.username} [${userRole}] blocked writing to ${pathname}`);
      return NextResponse.json({ error: 'Acción no permitida para su rol' }, { status: 403 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/',
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'
  ],
};
