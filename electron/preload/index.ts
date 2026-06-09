import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  openWindow: (windowKey: string, route: string) =>
    ipcRenderer.invoke('open-window', windowKey, route),
  closeWindow: (windowKey: string) =>
    ipcRenderer.invoke('close-window', windowKey)
})
