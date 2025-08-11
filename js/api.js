// api.js - front-end client -> Cloudflare Worker proxy
async function callWorker(prompt, history = [], mode = 'chat') {
  if (!window.CONFIG || !CONFIG.WORKER_URL) {
    // fallback mock
    await new Promise(r => setTimeout(r, 600));
    if (mode === 'image') return '🖼️ [Mock] Image generation not available in demo.';
    if (mode === 'code') return '```js\n// Mock code snippet\ndef hello():\n  return "Hello from Wayne"\n```';
    return `Hello! (Mock) You said: "${prompt}"`;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const res = await fetch(CONFIG.WORKER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(CONFIG.API_KEY ? { 'x-api-key': CONFIG.API_KEY } : {})
      },
      body: JSON.stringify({ prompt, history, mode }),
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!res.ok) {
      const text = await res.text().catch(()=>null);
      throw new Error(`Worker error ${res.status} ${text || ''}`);
    }

    const j = await res.json().catch(()=>null);
    // expected: { reply: "..." }
    if (j && typeof j.reply === 'string') return j.reply;
    // sometimes API returns text directly
    if (j && j.message) return j.message;
    return JSON.stringify(j);
  } catch (err) {
    clearTimeout(timeout);
    console.error('callWorker error:', err);
    return `⚠️ Error: ${err.message || err}`;
  }
}
