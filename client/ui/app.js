const $ = (id) => document.getElementById(id);

/** Electron (window.hub) or pywebview (window.pywebview.api) */
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
  if (state.username) showHome();
}

function show(view) {
  ["login", "home", "avatar"].forEach((v) => {
    $(`view-${v}`).classList.toggle("hidden", v !== view);
  });
}

async function showHome() {
  show("home");
  $("top-name").textContent = state.username;
  $("top-name-2").textContent = state.username;
  await loadGames();
  await loadAvatar(state.username);
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
  showHome();
};

function logout() {
  state.username = "";
  localStorage.removeItem("hub_user");
  show("login");
}
$("btn-logout").onclick = logout;
$("btn-logout-2").onclick = logout;

document.querySelectorAll("[data-nav]").forEach((btn) => {
  btn.onclick = () => {
    if (btn.dataset.nav === "home") showHome();
    else {
      show("avatar");
      $("av-user").value = state.username;
      loadAvatar($("av-user").value.trim() || state.username);
    }
  };
});

async function loadGames() {
  const box = $("games");
  box.innerHTML = "";
  try {
    const res = await fetch(state.apiBase + "/api/games");
    const list = await res.json();
    $("games-empty").classList.toggle("hidden", list.length > 0);
    for (const g of list) {
      const el = document.createElement("div");
      el.className = "game-card";
      const thumbStyle = g.thumbnail
        ? `style="background-image:url('${g.thumbnail.replace(/'/g, "%27")}')"`
        : "";
      el.innerHTML = `
        <div class="game-thumb" ${thumbStyle}></div>
        <div class="game-body">
          <div class="game-title"></div>
          <div class="game-desc"></div>
          <button type="button" class="game-join">Join</button>
        </div>`;
      el.querySelector(".game-title").textContent = g.name;
      el.querySelector(".game-desc").textContent = g.description || `${g.host}:${g.webPort}`;
      el.querySelector(".game-join").onclick = () => joinGame(g);
      box.appendChild(el);
    }
  } catch (e) {
    $("games-empty").classList.remove("hidden");
    $("games-empty").textContent = "Failed to load games: " + e.message;
  }
}

async function joinGame(g) {
  const b = bridge();
  if (!b) {
    alert(
      `Desktop app required to launch RFD.\n\nWould run:\nplayer -h ${g.host} -p ${g.webPort} -rp ${g.rccPort} -u ${state.username}`
    );
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
    result = b.launchRfd ? await b.launchRfd(payload) : await b.launch_rfd(payload);
  } catch (e) {
    alert(String(e.message || e));
    return;
  }
  if (!result || !result.ok) alert((result && result.error) || "Launch failed");
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

function openSettings() {
  const b = bridge();
  if (b) {
    const p = b.getConfig ? b.getConfig() : b.get_config();
    Promise.resolve(p).then((cfg) => {
      $("set-api").value = cfg.apiBase || state.apiBase;
      $("set-rfd").value = cfg.rfdPath || "";
    });
  }
  $("modal").classList.remove("hidden");
}
function closeSettings() {
  $("modal").classList.add("hidden");
}
$("btn-settings").onclick = openSettings;
$("set-close").onclick = closeSettings;
$("set-close-2").onclick = closeSettings;
$("set-save").onclick = async () => {
  const apiBase = $("set-api").value.trim().replace(/\/$/, "");
  const rfdPath = $("set-rfd").value.trim();
  state.apiBase = apiBase;
  const b = bridge();
  if (b) {
    try {
      if (b.setConfig) await b.setConfig({ apiBase, rfdPath });
      else await b.set_config({ apiBase, rfdPath });
    } catch (_) {}
  }
  closeSettings();
};
$("modal").addEventListener("click", (e) => {
  if (e.target === $("modal")) closeSettings();
});

// pywebview injects api after DOM ready — re-init once available
if (window.pywebview) {
  init();
} else {
  window.addEventListener("pywebviewready", init);
  // browser / electron path
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
}
