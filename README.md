# RFD Hub

Fake Roblox-style hub for offline / RFD servers.

- Desktop app (Electron) with a local web UI
- Type a username → home page → pick avatar → join a listed game (launches RFD player)
- Admin dashboard (separate) to manage which games show up
- Backend on your VPS (default port **50201**)

## Structure

```
rfd-hub/
  server/          # Node API on the VPS
  client/          # Electron + UI (players)
  admin/           # Simple admin web UI
```

## Quick plan

1. Deploy `server/` on the VPS:
   ```bash
   cd server && npm i
   export PORT=50201
   export ADMIN_TOKEN=your-secret
   node src/index.js
   ```
2. Open `http://YOUR_VPS:50201/admin` with the token
3. Players run the Electron client and set API to `http://YOUR_VPS:50201`
4. Settings → path to `RFD.exe` → Join launches the player

## Features (v0)

- Username login (no real Roblox auth)
- Home with game cards from API
- Avatar: currently-wearing (works if inventory private)
- Join → `RFD.exe player -h ... -u Username`
- Admin CRUD for games
