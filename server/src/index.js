import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { v4 as uuid } from "uuid";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const dataDir = path.join(root, "data");
const gamesFile = path.join(dataDir, "games.json");

const PORT = Number(process.env.PORT || 50201);
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "dev-token-change-me";
const PRESENCE_TTL_MS = 5 * 60 * 1000;

// gameId -> Map(usernameLower -> { username, at })
const presence = new Map();

if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(gamesFile)) {
  fs.writeFileSync(
    gamesFile,
    JSON.stringify(
      [
        {
          id: uuid(),
          name: "Example Place",
          description: "Edit or delete this in admin",
          host: "127.0.0.1",
          webPort: 2005,
          rccPort: 2005,
          thumbnail: "",
          visible: true,
        },
      ],
      null,
      2
    )
  );
}

function readGames() {
  return JSON.parse(fs.readFileSync(gamesFile, "utf8"));
}
function writeGames(list) {
  fs.writeFileSync(gamesFile, JSON.stringify(list, null, 2));
}

function cleanPresence(gameId) {
  const map = presence.get(gameId);
  if (!map) return;
  const now = Date.now();
  for (const [k, v] of map.entries()) {
    if (now - v.at > PRESENCE_TTL_MS) map.delete(k);
  }
  if (map.size === 0) presence.delete(gameId);
}

function playersFor(gameId) {
  cleanPresence(gameId);
  const map = presence.get(gameId);
  if (!map) return [];
  return [...map.values()]
    .sort((a, b) => a.username.localeCompare(b.username))
    .map((v) => v.username);
}

function touchPresence(gameId, username) {
  const name = String(username || "").trim();
  if (!gameId || !name) return playersFor(gameId);
  if (!presence.has(gameId)) presence.set(gameId, new Map());
  const map = presence.get(gameId);
  map.set(name.toLowerCase(), { username: name, at: Date.now() });
  return playersFor(gameId);
}

function leavePresence(gameId, username) {
  const map = presence.get(gameId);
  if (!map) return [];
  map.delete(String(username || "").trim().toLowerCase());
  return playersFor(gameId);
}

function withPlayers(g) {
  const players = playersFor(g.id);
  return {
    ...g,
    players,
    playerCount: players.length,
  };
}

function adminAuth(req, res, next) {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : "";
  if (token !== ADMIN_TOKEN) {
    return res.status(401).json({ error: "unauthorized" });
  }
  next();
}

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use("/admin", express.static(path.join(root, "../admin")));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/games", (_req, res) => {
  const list = readGames()
    .filter((g) => g.visible !== false)
    .map(withPlayers);
  res.json(list);
});

app.get("/api/games/:id/players", (req, res) => {
  const players = playersFor(req.params.id);
  res.json({ gameId: req.params.id, playerCount: players.length, players });
});

app.post("/api/games/:id/presence", (req, res) => {
  const username = String(req.body?.username || "").trim();
  if (!username) return res.status(400).json({ error: "username required" });
  const games = readGames();
  if (!games.some((g) => g.id === req.params.id)) {
    return res.status(404).json({ error: "game not found" });
  }
  const players = touchPresence(req.params.id, username);
  res.json({ ok: true, playerCount: players.length, players });
});

app.delete("/api/games/:id/presence", (req, res) => {
  const username = String(req.body?.username || req.query?.username || "").trim();
  const players = leavePresence(req.params.id, username);
  res.json({ ok: true, playerCount: players.length, players });
});

app.get("/api/avatar/:username", async (req, res) => {
  const username = String(req.params.username || "").trim();
  if (!username) return res.status(400).json({ error: "username required" });

  try {
    const idRes = await fetch("https://users.roblox.com/v1/usernames/users", {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": "RFD-Hub/0.1" },
      body: JSON.stringify({ usernames: [username], excludeBannedUsers: true }),
    });
    const idJson = await idRes.json();
    const userId = idJson?.data?.[0]?.id;
    if (!userId) {
      return res.json({
        username,
        userId: null,
        source: "unknown",
        headshot: null,
        items: [],
      });
    }

    let items = [];
    let source = "currently-wearing";
    try {
      const w = await fetch(
        `https://avatar.roblox.com/v1/users/${userId}/currently-wearing`,
        { headers: { "User-Agent": "RFD-Hub/0.1" } }
      );
      const wj = await w.json();
      items = wj.assetIds || [];
    } catch {
      source = "headshot-only";
    }

    let headshot = null;
    try {
      const h = await fetch(
        `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=150x150&format=Png&isCircular=false`,
        { headers: { "User-Agent": "RFD-Hub/0.1" } }
      );
      const hj = await h.json();
      headshot = hj?.data?.[0]?.imageUrl || null;
    } catch {
      /* ignore */
    }

    res.json({ username, userId, source, headshot, items });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

app.get("/api/admin/games", adminAuth, (_req, res) => {
  res.json(readGames().map(withPlayers));
});

app.post("/api/admin/games", adminAuth, (req, res) => {
  const list = readGames();
  const g = {
    id: uuid(),
    name: String(req.body.name || "Untitled").slice(0, 80),
    description: String(req.body.description || "").slice(0, 400),
    host: String(req.body.host || "127.0.0.1"),
    webPort: Number(req.body.webPort || 2005),
    rccPort: Number(req.body.rccPort || 2005),
    thumbnail: String(req.body.thumbnail || ""),
    visible: req.body.visible !== false,
  };
  list.push(g);
  writeGames(list);
  res.json(withPlayers(g));
});

app.put("/api/admin/games/:id", adminAuth, (req, res) => {
  const list = readGames();
  const i = list.findIndex((x) => x.id === req.params.id);
  if (i < 0) return res.status(404).json({ error: "not found" });
  const cur = list[i];
  list[i] = {
    ...cur,
    name: req.body.name != null ? String(req.body.name).slice(0, 80) : cur.name,
    description:
      req.body.description != null
        ? String(req.body.description).slice(0, 400)
        : cur.description,
    host: req.body.host != null ? String(req.body.host) : cur.host,
    webPort: req.body.webPort != null ? Number(req.body.webPort) : cur.webPort,
    rccPort: req.body.rccPort != null ? Number(req.body.rccPort) : cur.rccPort,
    thumbnail: req.body.thumbnail != null ? String(req.body.thumbnail) : cur.thumbnail,
    visible: req.body.visible != null ? !!req.body.visible : cur.visible,
  };
  writeGames(list);
  res.json(withPlayers(list[i]));
});

app.delete("/api/admin/games/:id", adminAuth, (req, res) => {
  writeGames(readGames().filter((g) => g.id !== req.params.id));
  presence.delete(req.params.id);
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`rfd-hub server on :${PORT}`);
});
