const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getData: () => ipcRenderer.invoke('get-data'),
  saveMember: (member) => ipcRenderer.invoke('save-member', member),
  deleteMember: (id) => ipcRenderer.invoke('delete-member', id),
  updateSettings: (settings) => ipcRenderer.invoke('update-settings', settings)
});
