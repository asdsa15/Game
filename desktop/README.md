# 问道长生 · Electron 桌面版

单文件网页游戏的桌面壳。页面还是 `mobile/dist/index.html` 那一份，壳只负责开窗口、存 localStorage、把菜单栏去掉。

## 目录

```
desktop/
├─ main.js              主进程：窗口、单实例、快捷键、自检钩子
├─ preload.js           只暴露一个 WENDAO_DESKTOP 标记，不给 Node 能力
├─ scripts/sync-app.js  把 mobile/dist 的页面搬进 app/，并补一条 CSP
├─ assets/icon.ico      Windows 图标（由 mobile/icons/icon-512.png 生成）
├─ app/                 临时目录：同步出来的页面（已 gitignore）
└─ release_m4/          打包产物（已 gitignore）
```

## 三种用法

```bash
cd desktop

# 1) 开发态直接跑（会先同步页面）
npm start

# 2) 打包 Windows x64
npm run pack
#   产物：release_m4/问道长生-win32-x64/问道长生.exe
#   压缩：release_m4/问道长生-win32-x64.zip（约 110 MB）

# 3) 页面更新后重新出包
python ../mobile/build.py     # 先重建网页产物
npm run pack                  # pack 里已含 sync
```

首次安装依赖（国内网络）：

```bash
ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/ npm install
```

## 打包产物

| 项 | 值 |
|---|---|
| 目录 | `release_m4/问道长生-win32-x64/`（270 MB，Electron 运行时占大头） |
| 可执行 | `问道长生.exe`（8.1.0 · 雾见川） |
| 压缩包 | `release_m4/问道长生-win32-x64.zip`（110 MB，解压即用，无需安装） |
| 平台 | Windows x64 |

**分发给别人就发那个 zip**：解压到任意目录，双击 `问道长生.exe` 即可，不需要装 Node、不需要联网。

## 桌面行为

- 窗口 1280×860，可缩到 900×600；F11 全屏；`Ctrl + / - / 0` 缩放与复位。
- 没有菜单栏（这是游戏，不是编辑器）。
- 单实例：重复双击只会把已有窗口顶到前面，不会开出两份存档。
- 外链交给系统浏览器打开，页内跳转一律拦掉；`window.open` 直接拒绝。
- `nodeIntegration` 关、`contextIsolation` 开、渲染进程 sandbox 开。

## 存档在哪

存档仍是游戏自己的 `localStorage`，Electron 把它落在：

```
C:\Users\<你>\AppData\Roaming\问道长生\Local Storage\
```

删掉这个目录等于清档。**打包升级不会动它**，所以换新版本只要覆盖 exe 所在目录，进度还在。

## 自检钩子

设置环境变量 `WENDAO_SMOKE_OUT` 指向一个 json 路径，程序加载完页面会写一份探针结果再退出：

```bash
WENDAO_SMOKE_OUT="C:/temp/smoke.json" "release_m4/问道长生-win32-x64/问道长生.exe"
```

返回字段：`ok` / `errors`（渲染进程 console 的 warn+error）/ `title` / `hasGame` / `phase` / `hasDesktopBridge` / `lsProbe`（第一次 `first-run`，第二次读到上一轮写入的时间戳，即证明存档跨重启有效）/ `visibleText`。

## 常见问题

**双击没反应 / 启动即退出（退出码 3）**
Chromium 的进程沙箱在被限制的环境里起不来。加 `--no-sandbox` 可绕过：

```bash
"问道长生.exe" --no-sandbox
```

本机终端直接跑正常，只有某些受限沙箱/远程会话环境需要这个参数。加参数会降低隔离强度，只在必要时用。

**控制台有一条 CSP 安全警告**
`sync-app.js` 已经给页面补了 CSP（`script-src 'self' 'unsafe-inline'`，不含 `unsafe-eval`）。若仍看到警告，说明 `app/index.html` 是旧的，重跑 `npm run sync`。

**打包时卡在下载 Electron**
设置 `ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/`；@electron/packager 会另下 zip，同一个镜像对它也生效。

**改了页面但 exe 里还是旧内容**
`npm run pack` 会先跑 `sync`，但 `sync` 读的是 `mobile/dist/index.html`。若连网页产物都没重建，先 `python mobile/build.py`。