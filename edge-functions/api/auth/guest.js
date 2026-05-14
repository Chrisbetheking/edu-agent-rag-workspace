export default function onRequest() {
  return new Response(
    JSON.stringify({
      token: 'edgeone-demo-token',
      user: {
        id: 'edgeone_guest',
        username: 'guest',
        displayName: '访客体验',
        role: 'guest',
        quotaLimit: 20,
        quotaRemaining: 19
      },
      deployment: {
        mode: 'demo_fallback',
        backend: 'EdgeOne Demo Fallback',
        proxy: 'EdgeOne Pages Functions',
        fallback: true,
        reason: 'explicit_guest_route'
      }
    }),
    {
      status: 200,
      headers: {
        'content-type': 'application/json; charset=UTF-8',
        'cache-control': 'no-store',
        'access-control-allow-origin': '*',
        'access-control-allow-methods': 'GET,POST,OPTIONS',
        'access-control-allow-headers': 'authorization,content-type,x-requested-with'
      }
    }
  );
}

export const onRequestPost = onRequest;
export const onRequestOptions = onRequest;
