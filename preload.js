const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('notchAPI', {
  setMode: (mode) => ipcRenderer.invoke('window:set-mode', mode),
  setTab: (tab) => ipcRenderer.invoke('window:set-tab', tab),
  ensureCamera: () => ipcRenderer.invoke('media:camera'),
  openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url),
  openPath: (p) => ipcRenderer.invoke('shell:openPath', p),
  listApps: () => ipcRenderer.invoke('apps:list'),
  launchApp: (p) => ipcRenderer.invoke('apps:launch', p),
  onEscape: (cb) => ipcRenderer.on('key:escape', () => cb()),
  onCollapse: (cb) => ipcRenderer.on('window:collapse', () => cb()),
  getMetrics: () => ipcRenderer.invoke('window:metrics'),
});
