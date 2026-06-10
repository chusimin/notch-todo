const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('notchAPI', {
  setMode: (mode) => ipcRenderer.invoke('window:set-mode', mode),
  openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url),
  openPath: (p) => ipcRenderer.invoke('shell:openPath', p),
  listApps: () => ipcRenderer.invoke('apps:list'),
  launchApp: (p) => ipcRenderer.invoke('apps:launch', p),
});
