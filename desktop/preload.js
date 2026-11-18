// 预加载：只暴露「这是个桌面版」这一条信息给页面，别的一概不给。
// 页面本身是单文件游戏，不依赖 Node 能力；壳也不替它做任何 IO。
const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('WENDAO_DESKTOP', {
  shell: 'electron',
  version: process.versions.electron,
  platform: process.platform
});