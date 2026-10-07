import { defineMiddleware } from 'astro:middleware';
import { AUTH_COOKIE, authToken } from './lib/auth';

// Studio og forsker-API'er kræver login. Deltagerne må kun gemme deres egen session (PUT /api/sessions/:id).
function isProtected(path: string, method: string) {
  if (path === '/admin' || path.startsWith('/admin/')) return true;
  if (path.startsWith('/api/content')) return true;
  if (path.startsWith('/api/sessions')) return method !== 'PUT';
  return false;
}

export const onRequest = defineMiddleware((ctx, next) => {
  const { pathname } = ctx.url;
  if (!isProtected(pathname, ctx.request.method)) return next();
  if (ctx.cookies.get(AUTH_COOKIE)?.value === authToken()) return next();
  if (pathname.startsWith('/api/')) {
    return new Response(JSON.stringify({ error: 'Log ind i Studio' }), { status: 401, headers: { 'content-type': 'application/json' } });
  }
  return ctx.redirect(`/login?next=${encodeURIComponent(pathname)}`);
});
