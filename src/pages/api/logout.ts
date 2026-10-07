import type { APIRoute } from 'astro';
import { AUTH_COOKIE } from '../../lib/auth';

export const GET: APIRoute = ({ cookies, redirect }) => {
  cookies.delete(AUTH_COOKIE, { path: '/' });
  return redirect('/login', 303);
};
