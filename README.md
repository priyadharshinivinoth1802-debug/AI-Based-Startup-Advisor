# AI-Based Business Advisor System

A startup advisory web app that scores a business idea and gives a full action plan.

## How it works
Form → `/api/analyze` (Node.js + Express) → `engine.js` → JSON → result dashboard

`engine.js` contains the whole intelligence and is shared by the backend and the browser:
1. **NLP text analysis** - tokenising, stop-word removal, keyword signals (problem / customer / USP), repetition and vagueness checks.
2. **Weighted scoring model** - Idea 15%, Problem 15%, Customer specificity 15%, USP 15%, Stage 10%, Traction 10%, Funding 10%, Budget 10% = Readiness score (0-100).
3. **Rule-based expert system** - weakest factors -> priorities, risks, marketing, 30-day plan.

No external AI API or API key is needed.

## Run locally
```bash
cd backend
npm install
npm start
```
Open **http://localhost:3000** (the backend also serves the website).

## GitHub Pages (live link)
Upload all files to the repo root. Settings -> Pages -> Deploy from branch `main` / root.
GitHub Pages cannot run Node.js, so there the same `engine.js` runs in the browser automatically; the output is identical.

## Deploy backend (optional)
Render/Railway: root directory `backend`, build `npm install`, start `npm start`.
Then, in `index.html` before `script.js`, add:
`<script>window.STARTUP_ADVISOR_API_URL="https://YOUR-BACKEND/api/analyze";</script>`
