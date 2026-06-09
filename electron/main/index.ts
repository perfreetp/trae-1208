import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.APP_ROOT = path.join(__dirname, '../..')
export const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, 'public')
  : RENDERER_DIST

let mainWindow: BrowserWindow | null = null
const childWindows = new Map<string, BrowserWindow>()

function createWindow() {
  mainWindow = new BrowserWindow({
    title: '工厂多能源排程工作台',
    width: 1600,
    height: 1000,
    minWidth: 1280,
    minHeight: 800,
    icon: path.join(process.env.VITE_PUBLIC!, 'favicon.png'),
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.mjs'),
      nodeIntegration: false,
      contextIsolation: true
    }
  })

  mainWindow.setMenuBarVisibility(false)

  if (VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(VITE_DEV_SERVER_URL)
  } else {
    mainWindow.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:')) shell.openExternal(url)
    return { action: 'deny' }
  })
}

const windowConfigs: Record<string, { title: string; width: number; height: number }> = {
  overview: { title: '总览窗', width: 1200, height: 800 },
  production: { title: '产线窗', width: 1100, height: 850 },
  forecast: { title: '预测窗', width: 1200, height: 850 },
  schedule: { title: '排程窗', width: 1400, height: 900 },
  alarm: { title: '告警窗', width: 1100, height: 750 },
  cost: { title: '成本窗', width: 1200, height: 850 },
  review: { title: '复盘窗', width: 1200, height: 850 }
}

ipcMain.handle('open-window', (_event, windowKey: string, route: string) => {
  if (childWindows.has(windowKey)) {
    childWindows.get(windowKey)?.focus()
    return
  }

  const config = windowConfigs[windowKey] || { title: windowKey, width: 1000, height: 700 }
  const child = new BrowserWindow({
    title: config.title,
    width: config.width,
    height: config.height,
    parent: mainWindow || undefined,
    icon: path.join(process.env.VITE_PUBLIC!, 'favicon.png'),
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.mjs'),
      nodeIntegration: false,
      contextIsolation: true
    }
  })

  child.setMenuBarVisibility(false)

  if (VITE_DEV_SERVER_URL) {
    child.loadURL(`${VITE_DEV_SERVER_URL}#${route}`)
  } else {
    child.loadFile(path.join(RENDERER_DIST, 'index.html'), { hash: route })
  }

  childWindows.set(windowKey, child)

  child.on('closed', () => {
    childWindows.delete(windowKey)
  })
})

ipcMain.handle('close-window', (_event, windowKey: string) => {
  const win = childWindows.get(windowKey)
  if (win) {
    win.close()
    childWindows.delete(windowKey)
  }
})

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  const allWindows = BrowserWindow.getAllWindows()
  if (allWindows.length) {
    allWindows[0].focus()
  } else {
    createWindow()
  }
})
