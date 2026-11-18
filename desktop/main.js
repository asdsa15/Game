// 问道长生 · Electron 桌面壳
//
// 设计约束（与 mobile/ 的 PWA 路线刻意分开）：
//   1. 只做「壳」：页面仍是 mobile/dist/index.html 那一份单文件，游戏逻辑一行都不在壳里。
//   2. 不联网：加载 file://，不请求远程资源；PWA 清单在 file:// 下本就不会挂（见 mobile/build.py）。
//   3. 存档仍写 localStorage —— Electron 把它落在 userData 目录，关掉程序再开还在。
//   4. 不留后门：nodeIntegration 关、contextIsolation 开、禁止页内跳走或 window.open。

const { app, BrowserWindow, Menu, shell, dialog, ipcMain } = require('electron');
const path = require('node:path');
const fs = require('node:fs');

const APP_ENTRY = path.join(__dirname, 'app', 'index.html');
const ICON = path.join(__dirname, 'assets', 'icon.ico');

let win = null;

/* 游戏菜单：桌面玩家按直觉找「存档 / 年谱 / 视图」，而不是先在页面里找系统按钮 */
function buildMenu() {
  const call = (js) => {
    if (!win || win.isDestroyed()) return;
    win.webContents.executeJavaScript(js).catch(() => { });
  };
  const tpl = [
    {
      label: '游戏', submenu: [
        { label: '存档 · 读档', accelerator: 'CmdOrCtrl+S', click: () => call('WXCS3.ACT.openSave()') },
        { label: '年谱', accelerator: 'CmdOrCtrl+H', click: () => call('WXCS3.ACT.openChronicle()') },
        { type: 'separator' },
        { label: '退出', role: 'quit' }
      ]
    },
    {
      label: '视图', submenu: [
        { label: '全屏 (F11)', click: () => { if (win) win.setFullScreen(!win.isFullScreen()); } },
        { label: '放大', click: () => { if (win) win.webContents.setZoomLevel(Math.min(3, win.webContents.getZoomLevel() + 0.5)); } },
        { label: '缩小', click: () => { if (win) win.webContents.setZoomLevel(Math.max(-2, win.webContents.getZoomLevel() - 0.5)); } },
        { label: '实际大小', click: () => { if (win) win.webContents.setZoomLevel(0); } }
      ]
    },
    {
      label: '帮助', submenu: [{
        label: '关于问道长生',
        click: () => dialog.showMessageBox(win, {
          type: 'info', title: '问道长生',
          message: '问道长生 ' + app.getVersion(),
          detail: '仙道为主 · 神道并行\n作者：雾见川'
        })
      }]
    }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(tpl));
}

/* 窗口尺寸记忆：上次怎么摆的，下次还怎么摆 */
function statePath() { return path.join(app.getPath('userData'), 'window-state.json'); }
function loadWinState() {
  try { return JSON.parse(fs.readFileSync(statePath(), 'utf8')); } catch (e) { return null; }
}
function saveWinState() {
  if (!win || win.isDestroyed()) return;
  try {
    fs.writeFileSync(statePath(), JSON.stringify(Object.assign({}, win.getNormalBounds(), {
      maximized: win.isMaximized()
    })));
  } catch (e) { }
}

/* 原生读写：页面只传文件名与文本，路径选择完全交给系统对话框 */
function registerIpc() {
  ipcMain.handle('wendao:save', async (e, payload) => {
    const p = payload || {};
    const r = await dialog.showSaveDialog(win, {
      title: '导出',
      defaultPath: p.name || '问道长生.txt',
      filters: [
        { name: '存档 / 文本', extensions: ['json', 'txt'] },
        { name: '全部文件', extensions: ['*'] }
      ]
    });
    if (r.canceled || !r.filePath) return { ok: false, canceled: true };
    try {
      fs.writeFileSync(r.filePath, String(p.text == null ? '' : p.text), 'utf8');
      return { ok: true, path: r.filePath };
    } catch (err) {
      return { ok: false, error: String((err && err.message) || err) };
    }
  });

  ipcMain.handle('wendao:open', async () => {
    const r = await dialog.showOpenDialog(win, {
      title: '导入存档',
      properties: ['openFile'],
      filters: [
        { name: '存档 / 文本', extensions: ['json', 'txt'] },
        { name: '全部文件', extensions: ['*'] }
      ]
    });
    if (r.canceled || !r.filePaths || !r.filePaths.length) return { ok: false, canceled: true };
    const fp = r.filePaths[0];
    try {
      return { ok: true, path: fp, name: path.basename(fp), text: fs.readFileSync(fp, 'utf8') };
    } catch (err) {
      return { ok: false, error: String((err && err.message) || err) };
    }
  });
}

function createWindow() {
  if (!fs.existsSync(APP_ENTRY)) {
    dialog.showErrorBox(
      '缺少页面文件',
      '找不到 app/index.html。\n\n请先在 desktop 目录执行：\n  npm run sync\n'
    );
    app.quit();
    return;
  }

  const st = loadWinState() || {};
  win = new BrowserWindow({
    width: st.width || 1280,
    height: st.height || 860,
    x: st.x,
    y: st.y,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#F5F1E8',
    title: '问道长生',
    icon: fs.existsSync(ICON) ? ICON : undefined,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false
    }
  });

  // 白屏时间压到最短：页面自带字体与配色，等首帧再显示
  win.once('ready-to-show', () => {
    if (st.maximized) win.maximize();
    win.show();
    win.focus();
  });
  let stTimer = null;
  const markState = () => { clearTimeout(stTimer); stTimer = setTimeout(saveWinState, 400); };
  win.on('resize', markState);
  win.on('move', markState);
  win.on('maximize', markState);
  win.on('unmaximize', markState);

  // 只准待在本地这一页：外链一律交给系统浏览器，页内跳转一律拦掉
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith('file://')) e.preventDefault();
  });

  // 快捷键：F11 全屏、Ctrl +/- 缩放、Ctrl+0 复位。菜单被藏起来了，这几个得自己接
  win.webContents.on('before-input-event', (e, input) => {
    if (input.type !== 'keyDown') return;
    const ctrl = input.control || input.meta;
    if (input.key === 'F11') {
      win.setFullScreen(!win.isFullScreen());
      e.preventDefault();
    } else if (ctrl && (input.key === '=' || input.key === '+')) {
      win.webContents.setZoomLevel(Math.min(3, win.webContents.getZoomLevel() + 0.5));
      e.preventDefault();
    } else if (ctrl && input.key === '-') {
      win.webContents.setZoomLevel(Math.max(-2, win.webContents.getZoomLevel() - 0.5));
      e.preventDefault();
    } else if (ctrl && input.key === '0') {
      win.webContents.setZoomLevel(0);
      e.preventDefault();
    }
  });

  win.on('close', saveWinState);
  win.on('closed', () => { win = null; });

  /* 自检钩子：设了 WENDAO_SMOKE_OUT 就加载完写一份 JSON 再退出。
     打包后是 GUI 程序，stdout 抓不到，所以落文件——这样「壳真能起来」有凭据。 */
  const smokeOut = process.env.WENDAO_SMOKE_OUT;
  if (smokeOut) {
    const errs = [];
    win.webContents.on('console-message', (e, level, message) => {
      if (level >= 2) errs.push(String(message).slice(0, 200));
    });
    win.webContents.on('did-finish-load', () => {
      setTimeout(async () => {
        let payload;
        try {
          const probe = await win.webContents.executeJavaScript(`(() => {
            const G = window.WXCS3;
            return {
              title: document.title,
              hasGame: !!G,
              phase: G ? G.S.phase : null,
              dockGroups: document.querySelectorAll('.dockgrp').length,
              hasDesktopBridge: !!window.WENDAO_DESKTOP,
              artKeys: (window.ART_DATA ? Object.keys(window.ART_DATA).length : 0),
              artApi: !!window.WXCS3_ART,
              /* 存档探针：第一次读为空并写入，第二次读应当拿到上一轮的标记。
                 这是「关掉再开，进度还在」的最小证据。 */
              lsProbe: (() => {
                const KEY = '__wendao_smoke_ls';
                const had = localStorage.getItem(KEY);
                if (!had) localStorage.setItem(KEY, 'set@' + Date.now());
                return had || 'first-run';
              })(),
              visibleText: (document.getElementById('stage') || {}).innerText
                ? document.getElementById('stage').innerText.length : 0
            };
          })()`);
          payload = Object.assign({ ok: true, errors: errs }, probe);
        } catch (e) {
          payload = { ok: false, error: String(e), errors: errs };
        }
        try { require('node:fs').writeFileSync(smokeOut, JSON.stringify(payload, null, 2)); } catch (e) {}
        app.exit(payload.ok ? 0 : 1);
      }, 800);
    });
  }

  win.loadFile(APP_ENTRY);
}

// 单实例：第二次双击只是把已有窗口顶到前面，不会开出两份存档
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!win) return;
    if (win.isMinimized()) win.restore();
    win.show();
    win.focus();
  });

  app.whenReady().then(() => {
    app.setAppUserModelId('com.wujianchuan.wendao');
    buildMenu();          // 游戏 / 视图 / 帮助；没有编辑器式菜单
    registerIpc();
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}