const { app, BrowserWindow, ipcMain, shell } = require("electron");
const path = require("path");
const { spawn } = require("child_process");
const fs = require("fs");

const cfgPath = path.join(app.getPath("userData"), "config.json");

function loadCfg() {
  try {
    return JSON.parse(fs.readFileSync(cfgPath, "utf8"));
  } catch {
    return { apiBase: "http://185.45.149.198:50201", rfdPath: "" };
  }
}

function saveCfg(c) {
  fs.writeFileSync(cfgPath, JSON.stringify(c, null, 2));
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1100,
    height: 720,
    backgroundColor: "#191919",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  win.loadFile(path.join(__dirname, "ui", "index.html"));
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

ipcMain.handle("get-config", () => loadCfg());
ipcMain.handle("set-config", (_e, partial) => {
  const c = { ...loadCfg(), ...partial };
  saveCfg(c);
  return c;
});

ipcMain.handle("launch-rfd", (_e, { host, webPort, rccPort, username }) => {
  const cfg = loadCfg();
  const exe = cfg.rfdPath;
  if (!exe || !fs.existsSync(exe)) {
    return { ok: false, error: "RFD.exe path not set or missing. Open settings." };
  }
  const args = [
    "player",
    "-h",
    String(host),
    "-p",
    String(webPort),
    "-rp",
    String(rccPort),
    "-u",
    String(username),
  ];
  try {
    const child = spawn(exe, args, {
      detached: true,
      stdio: "ignore",
      cwd: path.dirname(exe),
    });
    child.unref();
    return { ok: true, cmd: `${exe} ${args.join(" ")}` };
  } catch (e) {
    return { ok: false, error: String(e.message || e) };
  }
});

ipcMain.handle("open-external", (_e, url) => {
  shell.openExternal(url);
});
