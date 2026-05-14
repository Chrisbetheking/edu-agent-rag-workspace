export default function onRequest() {
  return new Response(
    JSON.stringify({ ok: true, service: 'eduagent-edgeone-direct-health', source: 'edge-functions/api/health.js', time: new Date().toISOString() }),
    { status: 200, headers: { 'content-type': 'application/json; charset=UTF-8', 'cache-control': 'no-store', 'access-control-allow-origin': '*' } },
  );
}

export const onRequestGet = onRequest;
