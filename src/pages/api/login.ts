import type { APIRoute } from 'astro';
import { AUTH_COOKIE, STUDIO_PASSWORD, authToken } from '../../lib/auth';

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const form = await request.formData();
  const next = String(form.get('next') || '/admin');
  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/admin';
  if (String(form.get('password') ?? '') !== STUDIO_PASSWORD) {
    return redirect(`/login?error=1&next=${encodeURIComponent(safeNext)}`, 303);
  }
  cookies.set(AUTH_COOKIE, authToken(), { path: '/', httpOnly: true, sameSite: 'lax', maxAge: 60 * 60 * 24 * 30 });
  return redirect(safeNext, 303);
};
