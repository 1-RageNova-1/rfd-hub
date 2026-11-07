const $ = (id) => document.getElementById(id);

let state = {
  username: localStorage.getItem("hub_user") || "",
  apiBase: "http://185.45.149.193:50201",
  avatar: null,
};

async function init() {
  if (window.hub) {
    const cfg = await window.hub.getConfig();
    state.apiBase = cfg.apiBase || state.apiBase;
    $("login-api").value = state.apiBase;
    $("set-api").value = state.apiBase;
    $("set-rfd").value = cfg.rfdPath || "";
  } else {
    $("login-api").value = state.apiBase;
  }

  if (state.username) {
    showHome();
  }
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
    $("login-err").textContent = "enter a username";
    return;
  }
  if (!api) {
    $("login-err").textContent = "enter API URL";
    return;
  }
  try {
    const r = await fetch(api + "/api/health");
    if (!r.ok) throw new Error("bad status");
  } catch {
    $("login-err").textContent = "cant reach API — check URL / firewall";
    return;
  }
  state.username = u;
  state.apiBase = api;
  localStorage.setItem("hub_user", u);
  if (window.hub) await window.hub.setConfig({ apiBase: api });
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
      el.className = "card";
      const thumb = g.thumbnail
        ? `style="background-image:url('${g.thumbnail.replace(/'/g, "%27")}')"`
        : "";
      el.innerHTML = `
        <div class="thumb" ${thumb}></div>
        <div class="body">
          <h3></h3>
          <p></p>
          <button type="button" class="primary join">Join</button>
        </div>`;
      el.querySelector("h3").textContent = g.name;
      el.querySelector("p").textContent = g.description || `${g.host}:${g.webPort}`;
      el.querySelector(".join").onclick = () => joinGame(g);
      box.appendChild(el);
    }
  } catch (e) {
    $("games-empty").classList.remove("hidden");
    $("games-empty").textContent = "failed to load games: " + e.message;
  }
}

async function joinGame(g) {
  if (!window.hub) {
    alert(`Run on desktop app to launch RFD.\n\nWould run:\nplayer -h ${g.host} -p ${g.webPort} -rp ${g.rccPort} -u ${state.username}`);
    return;
  }
  const result = await window.hub.launchRfd({
    host: g.host,
    webPort: g.webPort,
    rccPort: g.rccPort,
    username: state.username,
  });
  if (!result.ok) alert(result.error || "launch failed");
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
      : "user not found on Roblox — join still works with typed name";
    $("av-items").textContent = (data.items || []).length
      ? "wearing asset ids: " + data.items.join(", ")
      : "no wearing list (private or empty)";
  } catch (e) {
    $("av-meta").textContent = "avatar fetch failed: " + e.message;
  }
}

$("btn-refresh-av").onclick = () => {
  const u = $("av-user").value.trim() || state.username;
  loadAvatar(u);
};

$("btn-settings").onclick = async () => {
  if (window.hub) {
    const cfg = await window.hub.getConfig();
    $("set-api").value = cfg.apiBase || state.apiBase;
    $("set-rfd").value = cfg.rfdPath || "";
  }
  $("modal").classList.remove("hidden");
};
$("set-close").onclick = () => $("modal").classList.add("hidden");
$("set-save").onclick = async () => {
  const apiBase = $("set-api").value.trim().replace(/\/$/, "");
  const rfdPath = $("set-rfd").value.trim();
  state.apiBase = apiBase;
  if (window.hub) await window.hub.setConfig({ apiBase, rfdPath });
  $("modal").classList.add("hidden");
};

init();
