const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('notchAPI', {
  setMode: (mode) => ipcRenderer.invoke('window:set-mode', mode),
});
