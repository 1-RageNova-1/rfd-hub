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

const PORT = Number(process.env.PORT || 3080);
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "dev-token-change-me";

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
  const list = readGames().filter((g) => g.visible !== false);
  res.json(list);
});

// try public avatar APIs; if private / fail → currently-wearing style fallback
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

    const headshotUrl = `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=150x150&format=Png&isCircular=false`;
    const hsRes = await fetch(headshotUrl, {
      headers: { "User-Agent": "RFD-Hub/0.1" },
    });
    const hsJson = await hsRes.json();
    const headshot = hsJson?.data?.[0]?.imageUrl || null;

    // currently wearing (works even when inventory is private)
    let items = [];
    try {
      const wearRes = await fetch(
        `https://avatar.roblox.com/v1/users/${userId}/currently-wearing`,
        { headers: { "User-Agent": "RFD-Hub/0.1" } }
      );
      const wearJson = await wearRes.json();
      items = wearJson?.assetIds || [];
    } catch {
      items = [];
    }

    res.json({
      username,
      userId,
      source: "currently-wearing",
      headshot,
      items,
    });
  } catch (e) {
    res.status(502).json({ error: String(e.message || e) });
  }
});

app.get("/api/admin/games", adminAuth, (_req, res) => {
  res.json(readGames());
});

app.post("/api/admin/games", adminAuth, (req, res) => {
  const list = readGames();
  const g = {
    id: uuid(),
    name: req.body.name || "Untitled",
    description: req.body.description || "",
    host: req.body.host || "127.0.0.1",
    webPort: Number(req.body.webPort || 2005),
    rccPort: Number(req.body.rccPort || 2005),
    thumbnail: req.body.thumbnail || "",
    visible: req.body.visible !== false,
  };
  list.push(g);
  writeGames(list);
  res.status(201).json(g);
});

app.put("/api/admin/games/:id", adminAuth, (req, res) => {
  const list = readGames();
  const i = list.findIndex((x) => x.id === req.params.id);
  if (i < 0) return res.status(404).json({ error: "not found" });
  list[i] = { ...list[i], ...req.body, id: list[i].id };
  writeGames(list);
  res.json(list[i]);
});

app.delete("/api/admin/games/:id", adminAuth, (req, res) => {
  let list = readGames();
  const before = list.length;
  list = list.filter((x) => x.id !== req.params.id);
  if (list.length === before) return res.status(404).json({ error: "not found" });
  writeGames(list);
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`rfd-hub server on :${PORT}`);
  console.log(`admin token: ${ADMIN_TOKEN === "dev-token-change-me" ? "(default — change ADMIN_TOKEN)" : "(custom)"}`);
});
