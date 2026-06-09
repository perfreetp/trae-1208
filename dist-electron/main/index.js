"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const electron = require("electron");
const node_module = require("node:module");
const node_url = require("node:url");
const path = require("node:path");
var _documentCurrentScript = typeof document !== "undefined" ? document.currentScript : null;
node_module.createRequire(typeof document === "undefined" ? require("url").pathToFileURL(__filename).href : _documentCurrentScript && _documentCurrentScript.tagName.toUpperCase() === "SCRIPT" && _documentCurrentScript.src || new URL("index.js", document.baseURI).href);
const __dirname$1 = path.dirname(node_url.fileURLToPath(typeof document === "undefined" ? require("url").pathToFileURL(__filename).href : _documentCurrentScript && _documentCurrentScript.tagName.toUpperCase() === "SCRIPT" && _documentCurrentScript.src || new URL("index.js", document.baseURI).href));
process.env.APP_ROOT = path.join(__dirname$1, "../..");
const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;
const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, "public") : RENDERER_DIST;
let mainWindow = null;
const childWindows = /* @__PURE__ */ new Map();
function createWindow() {
  mainWindow = new electron.BrowserWindow({
    title: "工厂多能源排程工作台",
    width: 1600,
    height: 1e3,
    minWidth: 1280,
    minHeight: 800,
    icon: path.join(process.env.VITE_PUBLIC, "favicon.png"),
    webPreferences: {
      preload: path.join(__dirname$1, "../preload/index.mjs"),
      nodeIntegration: false,
      contextIsolation: true
    }
  });
  mainWindow.setMenuBarVisibility(false);
  if (VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(RENDERER_DIST, "index.html"));
  }
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https:")) electron.shell.openExternal(url);
    return { action: "deny" };
  });
}
const windowConfigs = {
  overview: { title: "总览窗", width: 1200, height: 800 },
  production: { title: "产线窗", width: 1100, height: 850 },
  forecast: { title: "预测窗", width: 1200, height: 850 },
  schedule: { title: "排程窗", width: 1400, height: 900 },
  alarm: { title: "告警窗", width: 1100, height: 750 },
  cost: { title: "成本窗", width: 1200, height: 850 },
  review: { title: "复盘窗", width: 1200, height: 850 }
};
electron.ipcMain.handle("open-window", (_event, windowKey, route) => {
  var _a;
  if (childWindows.has(windowKey)) {
    (_a = childWindows.get(windowKey)) == null ? void 0 : _a.focus();
    return;
  }
  const config = windowConfigs[windowKey] || { title: windowKey, width: 1e3, height: 700 };
  const child = new electron.BrowserWindow({
    title: config.title,
    width: config.width,
    height: config.height,
    parent: mainWindow || void 0,
    icon: path.join(process.env.VITE_PUBLIC, "favicon.png"),
    webPreferences: {
      preload: path.join(__dirname$1, "../preload/index.mjs"),
      nodeIntegration: false,
      contextIsolation: true
    }
  });
  child.setMenuBarVisibility(false);
  if (VITE_DEV_SERVER_URL) {
    child.loadURL(`${VITE_DEV_SERVER_URL}#${route}`);
  } else {
    child.loadFile(path.join(RENDERER_DIST, "index.html"), { hash: route });
  }
  childWindows.set(windowKey, child);
  child.on("closed", () => {
    childWindows.delete(windowKey);
  });
});
electron.ipcMain.handle("close-window", (_event, windowKey) => {
  const win = childWindows.get(windowKey);
  if (win) {
    win.close();
    childWindows.delete(windowKey);
  }
});
electron.app.whenReady().then(createWindow);
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    electron.app.quit();
  }
});
electron.app.on("activate", () => {
  const allWindows = electron.BrowserWindow.getAllWindows();
  if (allWindows.length) {
    allWindows[0].focus();
  } else {
    createWindow();
  }
});
exports.MAIN_DIST = MAIN_DIST;
exports.RENDERER_DIST = RENDERER_DIST;
exports.VITE_DEV_SERVER_URL = VITE_DEV_SERVER_URL;
//# sourceMappingURL=index.js.map
