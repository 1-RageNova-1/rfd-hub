const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("hub", {
  getConfig: () => ipcRenderer.invoke("get-config"),
  setConfig: (partial) => ipcRenderer.invoke("set-config", partial),
  launchRfd: (opts) => ipcRenderer.invoke("launch-rfd", opts),
  openExternal: (url) => ipcRenderer.invoke("open-external", url),
});
