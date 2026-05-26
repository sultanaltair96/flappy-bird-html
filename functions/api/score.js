export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const db = env.DB;

  try {
    if (request.method === 'POST') {
      const body = await request.json().catch(() => ({}));
      const name = typeof body.name === 'string' ? body.name.trim() : '';
      const score = typeof body.score === 'number' ? Math.floor(body.score) : NaN;

      // Validation
      if (!name || name.length < 3 || name.length > 12) {
        return new Response(
          JSON.stringify({ success: false, error: 'Name must be 3-12 characters.' }),
          { status: 400, headers: corsHeaders }
        );
      }
      if (!/^[a-zA-Z0-9 ]+$/.test(name)) {
        return new Response(
          JSON.stringify({ success: false, error: 'Name must be alphanumeric and spaces only.' }),
          { status: 400, headers: corsHeaders }
        );
      }
      if (Number.isNaN(score) || score < 0) {
        return new Response(
          JSON.stringify({ success: false, error: 'Score must be a non-negative integer.' }),
          { status: 400, headers: corsHeaders }
        );
      }

      const result = await db.prepare(
        'INSERT INTO scores (name, score) VALUES (?, ?) RETURNING id'
      ).bind(name, score).first();

      return new Response(
        JSON.stringify({ success: true, id: result ? result.id : null }),
        { status: 200, headers: corsHeaders }
      );
    }

    if (request.method === 'GET') {
      const { results } = await db.prepare(
        'SELECT id, name, score, created_at FROM scores ORDER BY score DESC, created_at ASC LIMIT 10'
      ).all();

      const scores = (results || []).map((row, idx) => ({
        rank: idx + 1,
        name: row.name,
        score: row.score,
        created_at: row.created_at,
      }));

      return new Response(
        JSON.stringify({ scores }),
        { status: 200, headers: corsHeaders }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed.' }),
      { status: 405, headers: corsHeaders }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: err.message || 'Internal error' }),
      { status: 500, headers: corsHeaders }
    );
  }
}
