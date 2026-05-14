export default async function onRequest(context) {
  const env = context?.env || {};
  const base = String(env.RENDER_API_BASE_URL || '').replace(/\/$/, '');
  if (!base) return json({ ok: false, reason: 'missing_RENDER_API_BASE_URL' });

  const timeoutMs = Number(env.EDGEONE_PROXY_TIMEOUT_MS || 15000);
  const target = `${base}/health`;
  const started = Date.now();
  try {
    const response = await Promise.race([
      fetch(target, { method: 'GET', headers: { accept: 'application/json' } }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('net_exception_timeout')), timeoutMs)),
    ]);
    const body = await response.text();
    return json({ ok: response.ok, status: response.status, latencyMs: Date.now() - started, target, body });
  } catch (error) {
    return json({ ok: false, reason: error?.message || String(error), target, latencyMs: Date.now() - started });
  }
}

function json(data) {
  return new Response(JSON.stringify(data), { status: 200, headers: { 'content-type': 'application/json; charset=UTF-8', 'cache-control': 'no-store', 'access-control-allow-origin': '*' } });
}
