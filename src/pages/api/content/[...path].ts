import type { APIRoute } from 'astro';
import { COLLECTIONS, getContent, saveContent, type CollectionKey } from '../../../lib/content';

// GET    /api/content                       → alt indhold
// PUT    /api/content/settings              → gem indstillinger
// PUT    /api/content/:collection/:id       → opret/opdatér dokument
// DELETE /api/content/:collection/:id       → slet dokument
// POST   /api/content/:collection/order     → ny rækkefølge (body: string[] af _id)

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });

function parse(path = '') {
  const [collection, id] = path.split('/').filter(Boolean);
  return { collection, id };
}

export const GET: APIRoute = async () => json(await getContent());

export const PUT: APIRoute = async ({ params, request }) => {
  const { collection, id } = parse(params.path);
  const content = await getContent();
  const body = await request.json();

  if (collection === 'settings') {
    content.settings = { ...content.settings, ...body };
    await saveContent(content);
    return json(content.settings);
  }
  if (!COLLECTIONS.includes(collection as CollectionKey) || !id) return json({ error: 'Ukendt dokumenttype' }, 404);

  const list = content[collection as CollectionKey] as { _id: string }[];
  const doc = { ...body, _id: id };
  const idx = list.findIndex((d) => d._id === id);
  if (idx === -1) list.push(doc);
  else list[idx] = doc;
  await saveContent(content);
  return json(doc);
};

export const POST: APIRoute = async ({ params, request }) => {
  const { collection, id } = parse(params.path);
  if (!COLLECTIONS.includes(collection as CollectionKey) || id !== 'order') return json({ error: 'Ikke fundet' }, 404);
  const content = await getContent();
  const order: string[] = await request.json();
  const list = content[collection as CollectionKey] as { _id: string }[];
  list.sort((a, b) => order.indexOf(a._id) - order.indexOf(b._id));
  await saveContent(content);
  return json({ ok: true });
};

export const DELETE: APIRoute = async ({ params }) => {
  const { collection, id } = parse(params.path);
  if (!COLLECTIONS.includes(collection as CollectionKey) || !id) return json({ error: 'Ikke fundet' }, 404);
  const content = await getContent();
  const list = content[collection as CollectionKey] as { _id: string }[];
  const idx = list.findIndex((d) => d._id === id);
  if (idx !== -1) list.splice(idx, 1);
  await saveContent(content);
  return json({ ok: true });
};
