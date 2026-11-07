# RFD Hub — server

Runs on your VPS.

```bash
cd server
npm install
export PORT=3080
export ADMIN_TOKEN=change-me-long-random
node src/index.js
```

Data is stored in `data/games.json` (created automatically).

## Routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/health` | no | ping |
| GET | `/api/games` | no | list visible games |
| GET | `/api/avatar/:username` | no | proxy avatar / wearing info |
| GET | `/api/admin/games` | Bearer token | all games |
| POST | `/api/admin/games` | Bearer | create |
| PUT | `/api/admin/games/:id` | Bearer | update |
| DELETE | `/api/admin/games/:id` | Bearer | delete |

Admin UI is static under `/admin` (open `https://your-vps:3080/admin`).
