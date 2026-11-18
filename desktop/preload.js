// 预加载：只暴露「这是个桌面版」与两件必要的 IO —— 存/读文件走系统对话框。
// 路径由主进程选，页面拿不到任意文件系统能力。
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('WENDAO_DESKTOP', {
  shell: 'electron',
  version: process.versions.electron,
  platform: process.platform,
  saveFile: (name, text) => ipcRenderer.invoke('wendao:save', { name: name, text: text }),
  openFile: () => ipcRenderer.invoke('wendao:open')
});
