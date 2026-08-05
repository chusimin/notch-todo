const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('notchAPI', {
  setMode: (mode) => ipcRenderer.invoke('window:set-mode', mode),
  beginCollapse: () => ipcRenderer.invoke('window:begin-collapse'),
  setTab: (tab) => ipcRenderer.invoke('window:set-tab', tab),
  ensureCamera: () => ipcRenderer.invoke('media:camera'),
  openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url),
  openPath: (p) => ipcRenderer.invoke('shell:openPath', p),
  listApps: () => ipcRenderer.invoke('apps:list'),
  launchApp: (p) => ipcRenderer.invoke('apps:launch', p),
  onEscape: (cb) => ipcRenderer.on('key:escape', () => cb()),
  onCollapseRequest: (cb) => ipcRenderer.on('window:request-collapse', () => cb()),
  getMetrics: () => ipcRenderer.invoke('window:metrics'),
  onMetricsChanged: (cb) =>
    ipcRenderer.on('window:metrics-changed', (event, metrics) => cb(metrics)),
  writeClipboard: (entry) => ipcRenderer.invoke('clipboard:write', entry),
  readClipImage: (imagePath) => ipcRenderer.invoke('clipboard:readImage', imagePath),
  deleteClipImages: (paths) => ipcRenderer.invoke('clipboard:deleteImages', paths),
  onNewClipEntry: (cb) => ipcRenderer.on('clipboard:new-entry', (evt, entry) => cb(entry)),
  onOpenClip: (cb) => ipcRenderer.on('app:open-clip', () => cb()),
  onTaskNotification: (cb) =>
    ipcRenderer.on('task-notification:show', (event, notification) => cb(notification)),
  onTaskNotificationQueue: (cb) =>
    ipcRenderer.on('task-notification:queue', (event, count) => cb(count)),
  onTaskNotificationHide: (cb) =>
    ipcRenderer.on('task-notification:hide', (event, eventId) => cb(eventId)),
  taskNotificationDismissed: (eventId) =>
    ipcRenderer.send('task-notification:dismissed', eventId),
  taskNotificationHover: (paused) =>
    ipcRenderer.send('task-notification:hover', paused === true),
});
