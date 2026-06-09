"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("electronAPI", {
  openWindow: (windowKey, route) => electron.ipcRenderer.invoke("open-window", windowKey, route),
  closeWindow: (windowKey) => electron.ipcRenderer.invoke("close-window", windowKey)
});
//# sourceMappingURL=index.js.map
