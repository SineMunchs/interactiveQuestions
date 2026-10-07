import type { APIRoute } from 'astro';
import { getSessions, saveSessions, type Session } from '../../../lib/content';

// GET    /api/sessions        → alle sessioner
// GET    /api/sessions/:id    → én session
// PUT    /api/sessions/:id    → gem session (deltagersiden gemmer løbende)
// DELETE /api/sessions/:id    → slet session

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });

// Flere deltagere kan gemme samtidig – kør skrivninger én ad gangen, så ingen overskriver hinanden
let queue: Promise<unknown> = Promise.resolve();
const serial = <T>(fn: () => Promise<T>): Promise<T> => {
  const next = queue.then(fn, fn);
  queue = next.catch(() => {});
  return next;
};

export const GET: APIRoute = async ({ params }) => {
  const sessions = await getSessions();
  if (!params.path) return json(sessions);
  const s = sessions.find((x) => x._id === params.path);
  return s ? json(s) : json({ error: 'Ikke fundet' }, 404);
};

export const PUT: APIRoute = async ({ params, request }) => {
  const id = params.path;
  if (!id) return json({ error: 'Mangler id' }, 400);
  const body = (await request.json()) as Session;
  return serial(async () => {
    const sessions = await getSessions();
    const doc = { ...body, _id: id };
    const idx = sessions.findIndex((s) => s._id === id);
    if (idx === -1) sessions.push(doc);
    else sessions[idx] = doc;
    await saveSessions(sessions);
    return json({ ok: true });
  });
};

export const DELETE: APIRoute = async ({ params }) =>
  serial(async () => {
    const sessions = await getSessions();
    await saveSessions(sessions.filter((s) => s._id !== params.path));
    return json({ ok: true });
  });
