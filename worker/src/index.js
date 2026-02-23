export default {
  async fetch(request, env) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, PUT, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    const key = url.pathname.slice(1);

    // POST / → create new sync key
    if (request.method === 'POST' && !key) {
      const id = crypto.randomUUID();
      const body = await request.text();
      await env.SYNC_KV.put(id, body);
      return new Response(JSON.stringify({ id }), {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // GET /{key} → read
    if (request.method === 'GET' && key) {
      const value = await env.SYNC_KV.get(key);
      if (!value) {
        return new Response('{"error":"not found"}', {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(value, {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // PUT /{key} → write
    if (request.method === 'PUT' && key) {
      const body = await request.text();
      await env.SYNC_KV.put(key, body);
      return new Response('{"ok":true}', {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response('{"error":"not found"}', {
      status: 404,
      headers: corsHeaders,
    });
  },
};
