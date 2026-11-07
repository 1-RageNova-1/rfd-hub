# RFD Hub

Fake Roblox-style hub for offline / RFD servers.

- Desktop app (Electron) with a local web UI
- Type a username → home page → pick avatar → join a listed game (launches RFD player)
- Admin dashboard (separate) to manage which games show up
-Backend runs on your VPS so friends always see the same game list.

## Structure

```
rfd-hub/
  server/          # Node API on the VPS
  client/          # Electron + UI (players)
  admin/           # Simple admin web UI
```

## Quick plan

1. Deploy `server/` on the VPS (Node 18+)
2. Set `ADMIN_TOKEN` and open the port
3. Players install/run the Electron client, point it at your VPS URL
4. You use `/admin` with the token to add/edit games

See `server/README.md` and `client/README.md` for run steps.

## Features (v0)

- [x] Username login (no real Roblox auth)
- [x] Home with game cards from API
- [x] Avatar: try public inventory / currently-wearing; fallback if private
- [x] Join → spawn `RFD.exe player -h ... -u Username`
- [x] Admin CRUD for games
- [ ] Pretty Roblox-like polish (ongoing)
