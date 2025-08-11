# wayne chat bot

# Project Structure 
```
chatbot-ui/
├── index.html
├── css/
│   ├── style.css
│   └── chat.css
├── js/
│   ├── app.js
│   ├── api.js
│   ├── storage.js
│   ├── theme.js
│   └── animation.js
├── config/
│   └── env.example.js
├── assets/
│   ├── bot.png
│   ├── icon.svg
│   └── sounds/
│       ├── send.mp3
│       └── receive.mp3
├── README.md
└── .gitignore

```
# Wayne Chat Bot (frontend + Cloudflare Worker proxy)

## Quick start (frontend)
1. Copy repository files into a folder `chatbot-ui/`.
2. Copy `config/env.example.js` → `config/env.js` and replace `WORKER_URL` with your Cloudflare Worker URL.
3. Open `index.html` in browser (or serve via simple HTTP server).

## Cloudflare Worker (proxy)
- Deploy `worker/worker.js` as a Cloudflare Worker (module worker).
- Set secret `OPENAI_API_KEY` for your worker:
  - `wrangler secret put OPENAI_API_KEY`
- Publish worker: `wrangler publish`

## Notes & Security
- Do **not** put API keys in client-side `config/env.js` for production.
- Use Cloudflare Worker (or other server) to keep secrets server-side.
- This frontend will send `{ prompt, history, mode }` to your Worker; Worker should handle vendor API calls.
