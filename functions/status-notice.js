// The live status notice, stored in Cloudflare KV so it can be changed from /admin.html without a redeploy.
//   GET    /status-notice   public: what the homepage and connect page show
//   POST   /status-notice   admin only: { down, message, backAt, template }
//   DELETE /status-notice   admin only: clear the notice
// Needs, in Cloudflare Pages > Settings > Bindings / Variables:
//   STATUS       a KV namespace binding
//   ADMIN_TOKEN  a long random secret (the password for /admin.html)

const KEY = 'status';
const EMPTY = { down: false, message: '', backAt: null, template: '', updatedAt: null };

const HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS'
};
const reply = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: HEADERS });

// Compare two secrets without leaking where they differ.
async function same(a, b) {
  const enc = new TextEncoder();
  const [x, y] = await Promise.all([
    crypto.subtle.digest('SHA-256', enc.encode(a)),
    crypto.subtle.digest('SHA-256', enc.encode(b))
  ]);
  const xa = new Uint8Array(x), ya = new Uint8Array(y);
  let diff = 0;
  for (let i = 0; i < xa.length; i++) diff |= xa[i] ^ ya[i];
  return diff === 0;
}

async function authorised(request, env) {
  if (!env.ADMIN_TOKEN) return reply({ error: 'ADMIN_TOKEN is not set on this Pages project.' }, 500);
  const given = (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  if (!given || !(await same(given, env.ADMIN_TOKEN))) return reply({ error: 'Wrong password.' }, 401);
  return null;
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: HEADERS });
}

export async function onRequestGet({ env }) {
  if (!env.STATUS) return reply({ error: 'KV binding STATUS is missing.' }, 500);
  const saved = await env.STATUS.get(KEY, 'json');
  return reply(saved || EMPTY);
}

export async function onRequestPost({ request, env }) {
  const bad = await authorised(request, env);
  if (bad) return bad;
  if (!env.STATUS) return reply({ error: 'KV binding STATUS is missing.' }, 500);

  let b;
  try { b = await request.json(); } catch (e) { return reply({ error: 'Send JSON.' }, 400); }

  const message = String(b.message || '').trim().slice(0, 300);
  if (!message) return reply({ error: 'Write a message first.' }, 400);

  let backAt = null;
  if (b.backAt) {
    const t = Date.parse(b.backAt);
    if (isNaN(t)) return reply({ error: 'That back-up time is not a valid date.' }, 400);
    backAt = new Date(t).toISOString();
  }

  const notice = {
    down: !!b.down,
    message,
    backAt,
    template: String(b.template || '').slice(0, 30),
    updatedAt: new Date().toISOString()
  };
  await env.STATUS.put(KEY, JSON.stringify(notice));
  return reply(notice);
}

export async function onRequestDelete({ request, env }) {
  const bad = await authorised(request, env);
  if (bad) return bad;
  if (!env.STATUS) return reply({ error: 'KV binding STATUS is missing.' }, 500);
  await env.STATUS.delete(KEY);
  return reply(EMPTY);
}
