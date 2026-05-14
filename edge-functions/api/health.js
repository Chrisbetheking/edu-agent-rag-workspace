export default function onRequest() {
  return new Response(
    JSON.stringify({
      ok: true,
      service: 'eduagent-edgeone-direct-health',
      source: 'edge-functions/api/health.js',
      time: new Date().toISOString(),
    }),
    {
      status: 200,
      headers: {
        'content-type': 'application/json; charset=UTF-8',
        'cache-control': 'no-store',
        'access-control-allow-origin': '*',
        'access-control-allow-methods': 'GET,POST,OPTIONS',
        'access-control-allow-headers': 'authorization,content-type,x-requested-with',
      },
    },
  );
}

export const onRequestGet = onRequest;
export const onRequestOptions = onRequest;
