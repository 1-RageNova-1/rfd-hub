const $ = (id) => document.getElementById(id);

function bridge() {
  if (window.hub) return window.hub;
  if (window.pywebview && window.pywebview.api) return window.pywebview.api;
  return null;
}

let state = {
  username: localStorage.getItem("hub_user") || "",
  apiBase: "http://185.45.149.198:50201",
  avatar: null,
};

const SOON = {
  charts: { title: "Charts", text: "Charts is coming soon." },
  marketplace: { title: "Marketplace", text: "Marketplace is coming soon." },
  create: { title: "Create", text: "Create is coming soon." },
  more: { title: "More", text: "More options are coming soon." },
};

async function init() {
  const b = bridge();
  if (b) {
    try {
      const cfg = await (b.getConfig ? b.getConfig() : b.get_config());
      state.apiBase = cfg.apiBase || state.apiBase;
      $("login-api").value = state.apiBase;
      $("set-api").value = state.apiBase;
      $("set-rfd").value = cfg.rfdPath || "";
    } catch (_) {
      $("login-api").value = state.apiBase;
    }
  } else {
    $("login-api").value = state.apiBase;
  }
  if (state.username) showShell("home");
}

function showLogin() {
  $("view-login").classList.remove("hidden");
  $("view-shell").classList.add("hidden");
}

function showShell(panel) {
  $("view-login").classList.add("hidden");
  $("view-shell").classList.remove("hidden");
  $("top-name").textContent = state.username;
  setPanel(panel || "home");
}

function setPanel(name) {
  ["home", "avatar", "soon"].forEach((p) => {
    const el = $("panel-" + p);
    if (el) el.classList.toggle("hidden", p !== name);
  });
  document.querySelectorAll(".rail-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.nav === name);
  });
  if (name === "home") {
    loadGames();
    loadAvatar(state.username);
  }
  if (name === "avatar") {
    $("av-user").value = state.username;
    loadAvatar(state.username);
  }
}

function openSoon(key) {
  const info = SOON[key] || { title: "Soon", text: "Coming soon." };
  $("soon-title").textContent = info.title;
  $("soon-text").textContent = info.text;
  showShell("soon");
  document.querySelectorAll(".rail-btn").forEach((btn) => btn.classList.remove("active"));
}

$("btn-login").onclick = async () => {
  const u = $("login-user").value.trim();
  const api = $("login-api").value.trim().replace(/\/$/, "");
  $("login-err").textContent = "";
  if (!u) {
    $("login-err").textContent = "Please enter a username";
    return;
  }
  if (!api) {
    $("login-err").textContent = "Please enter an API URL";
    return;
  }
  try {
    const r = await fetch(api + "/api/health");
    if (!r.ok) throw new Error("bad status");
  } catch {
    $("login-err").textContent = "Can't reach API — check URL / firewall";
    return;
  }
  state.username = u;
  state.apiBase = api;
  localStorage.setItem("hub_user", u);
  const b = bridge();
  if (b) {
    try {
      if (b.setConfig) await b.setConfig({ apiBase: api });
      else await b.set_config({ apiBase: api });
    } catch (_) {}
  }
  showShell("home");
};

function logout() {
  state.username = "";
  localStorage.removeItem("hub_user");
  showLogin();
}
$("btn-logout").onclick = logout;

document.querySelectorAll("[data-nav]").forEach((btn) => {
  btn.onclick = () => setPanel(btn.dataset.nav);
});

document.querySelectorAll("[data-soon]").forEach((el) => {
  el.addEventListener("click", (e) => {
    e.preventDefault();
    openSoon(el.dataset.soon);
  });
});

function playerLabel(g) {
  const n = Number(g.playerCount);
  if (!Number.isFinite(n) || n < 0) return "0 playing";
  if (n === 1) return "1 playing";
  return n + " playing";
}

async function loadGames() {
  const box = $("games");
  box.innerHTML = "";
  try {
    const res = await fetch(state.apiBase + "/api/games");
    const list = await res.json();
    $("games-empty").classList.toggle("hidden", list.length > 0);
    for (const g of list) {
      const el = document.createElement("div");
      el.className = "feat-card";
      const thumb = g.thumbnail
        ? `style="background-image:url('${String(g.thumbnail).replace(/'/g, "%27")}')"`
        : "";
      el.innerHTML = `
        <div class="feat-thumb" ${thumb}></div>
        <div class="feat-name"></div>
        <div class="feat-meta">
          <span class="player-count"></span>
        </div>
        <button type="button" class="feat-join">Join</button>`;
      el.querySelector(".feat-name").textContent = g.name || "Game";
      el.querySelector(".player-count").textContent = playerLabel(g);
      if (Array.isArray(g.players) && g.players.length) {
        el.querySelector(".player-count").title = g.players.join(", ");
      }
      el.querySelector(".feat-join").onclick = () => joinGame(g);
      box.appendChild(el);
    }
  } catch (e) {
    $("games-empty").classList.remove("hidden");
    $("games-empty").textContent = "Failed to load games: " + e.message;
  }
}

async function reportPresence(g) {
  if (!g || !g.id || !state.username) return;
  try {
    await fetch(state.apiBase + "/api/games/" + encodeURIComponent(g.id) + "/presence", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: state.username }),
    });
  } catch (_) {}
}

function parseBridgeResult(raw) {
  if (raw == null) return null;
  if (typeof raw === "string") {
    try { return JSON.parse(raw); } catch { return { ok: false, error: raw }; }
  }
  return raw;
}

async function joinGame(g) {
  await reportPresence(g);
  const b = bridge();
  if (!b) {
    alert(
      `Desktop app required to launch RFD.\n\nWould run:\nplayer -h ${g.host} -p ${g.webPort} -rp ${g.rccPort} -u ${state.username}`
    );
    loadGames();
    return;
  }
  const payload = {
    host: g.host,
    webPort: g.webPort,
    rccPort: g.rccPort,
    username: state.username,
  };
  let result;
  try {
    // Android WebView requires a JSON string; Electron/pywebview accept an object.
    const arg = (window.hub && !window.pywebview) ? JSON.stringify(payload) : payload;
    const raw = b.launchRfd ? await b.launchRfd(arg) : await b.launch_rfd(payload);
    result = parseBridgeResult(raw);
  } catch (e) {
    alert(String(e.message || e));
    return;
  }
  if (!result || !result.ok) {
    alert((result && result.error) || "Launch failed");
  }
  loadGames();
}

async function loadAvatar(username) {
  try {
    const res = await fetch(state.apiBase + "/api/avatar/" + encodeURIComponent(username));
    const data = await res.json();
    state.avatar = data;
    const img = data.headshot || "";
    $("top-head").src = img;
    $("av-head").src = img;
    $("av-meta").textContent = data.userId
      ? `userId ${data.userId} · ${data.source}`
      : "User not found on Roblox — join still works with typed name";
    $("av-items").textContent = (data.items || []).length
      ? "Wearing asset ids: " + data.items.join(", ")
      : "No wearing list (private or empty)";
  } catch (e) {
    $("av-meta").textContent = "Avatar fetch failed: " + e.message;
  }
}

$("btn-refresh-av").onclick = () => {
  const u = $("av-user").value.trim() || state.username;
  loadAvatar(u);
};

const openSettings = async () => {
  $("modal").classList.remove("hidden");
  const b = bridge();
  if (b) {
    try {
      const cfg = await (b.getConfig ? b.getConfig() : b.get_config());
      $("set-api").value = cfg.apiBase || state.apiBase;
      $("set-rfd").value = cfg.rfdPath || "";
    } catch (_) {}
  }
};
const closeSettings = () => $("modal").classList.add("hidden");
if ($("btn-settings")) $("btn-settings").onclick = openSettings;
if ($("set-close")) $("set-close").onclick = closeSettings;
if ($("set-close-2")) $("set-close-2").onclick = closeSettings;

if ($("set-save")) $("set-save").onclick = async () => {
  const apiBase = $("set-api").value.trim().replace(/\/$/, "");
  const rfdPath = $("set-rfd").value.trim();
  state.apiBase = apiBase;
  const b = bridge();
  if (b) {
    try {
      if (b.setConfig) await b.setConfig({ apiBase, rfdPath });
      else await b.set_config({ apiBase, rfdPath });
    } catch (e) {
      alert(String(e.message || e));
      return;
    }
  }
  $("modal").classList.add("hidden");
};

init();
