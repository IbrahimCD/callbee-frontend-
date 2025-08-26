# Call Agent Frontend (React + Ant Design + Vite) — with WebRTC voice

## New: Browser "call" (WebRTC, no phone number)
- Page: **Voice Call (WebRTC)** in the sidebar
- Click **Start Call** → we fetch an ephemeral key from `/api/realtime/session`, then your browser opens a **WebRTC** connection directly to the **OpenAI Realtime API**.
- Your mic audio is sent; the model replies with audio; everything happens inside the browser.
- Configure your own **TURN** server if needed via `.env`:
  ```
  VITE_TURN_URL=turn:your-turn.example.com:3478
  VITE_TURN_USERNAME=turnuser
  VITE_TURN_CREDENTIAL=turnpass
  ```

### Requirements
- Backend running (`/api/realtime/session` endpoint)
- You stored an OpenAI key via Setup Wizard
- An agent exists (we pass agentId to the session for Bangla instructions)

### Run
```bash
cp .env.example .env
npm install
npm run dev
# open http://localhost:3000
```
