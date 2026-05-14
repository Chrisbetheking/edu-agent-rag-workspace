export default async function onRequest(context) {
  const env = context?.env || {};
  const base = env.RENDER_API_BASE_URL || env.EDUAGENT_API_BASE_URL || '';
  if (!base) {
    return new Response(JSON.stringify({ ok: false, reason: 'missing_RENDER_API_BASE_URL' }), {
      status: 200,
      headers: { 'content-type': 'application/json; charset=UTF-8', 'cache-control': 'no-store' },
    });
  }

  try {
    const started = Date.now();
    const target = base.replace(/\/$/, '') + '/health';
    const res = await fetch(target, { method: 'GET' });
    const text = await res.text();
    return new Response(JSON.stringify({
      ok: res.ok,
      status: res.status,
      latencyMs: Date.now() - started,
      target,
      body: text.slice(0, 2000),
    }), {
      status: 200,
      headers: { 'content-type': 'application/json; charset=UTF-8', 'cache-control': 'no-store' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ ok: false, reason: error?.message || String(error) }), {
      status: 200,
      headers: { 'content-type': 'application/json; charset=UTF-8', 'cache-control': 'no-store' },
    });
  }
}

export const onRequestGet = onRequest;
export const onRequestOptions = onRequest;
