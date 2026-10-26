// Eatable AI proxy: the website's app calls this instead of Google directly,
// so the Gemini API key stays secret on the server (set GEMINI_API_KEY in Vercel).
const ALLOWED_MODELS = new Set(['gemini-flash-latest', 'gemini-flash-lite-latest', 'gemini-2.5-flash', 'gemini-2.5-flash-lite']);

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: { message: 'POST only' } });
  const key = process.env.GEMINI_API_KEY;
  if (!key) return res.status(500).json({ error: { message: 'AI is not set up on this site yet (missing GEMINI_API_KEY).' } });

  const { model, body } = req.body || {};
  if (!ALLOWED_MODELS.has(model) || !body || !Array.isArray(body.contents)) {
    return res.status(400).json({ error: { message: 'Bad request' } });
  }
  // only allow requests coming from this site
  const origin = req.headers.origin || req.headers.referer || '';
  const host = req.headers.host || '';
  if (origin && host && !origin.includes(host)) return res.status(403).json({ error: { message: 'Forbidden' } });

  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify(body),
    });
    const text = await r.text();
    res.status(r.status).setHeader('Content-Type', 'application/json').send(text);
  } catch (e) {
    res.status(502).json({ error: { message: 'Could not reach the AI service. Try again.' } });
  }
};
