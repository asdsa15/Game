import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

/**
 * 开发时把接口代理到本地服务端，浏览器只面对 5173 一个源。
 *
 * 为什么必须代理而不是直接请求 8787：
 * 刷新令牌放在 httpOnly cookie 里，SameSite=Lax。localhost:5173 → 127.0.0.1:8787
 * 在浏览器看来是跨站，跨站 XHR 不会带 Lax cookie，登录会"成功但刷新不了"。
 * 走代理后同源，cookie 正常，连 CORS 都不需要。
 */
const API_TARGET = process.env.API_TARGET ?? 'http://127.0.0.1:8787';
const prefixes = ['/auth', '/saves', '/runs', '/leaderboard', '/me', '/healthz'];

export default defineConfig({
  plugins: [vue()],
  server: {
    // 显式绑 IPv4：只写 localhost 时 Vite 可能只监听 ::1，脚本与手机预览都会连不上
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    proxy: Object.fromEntries(
      prefixes.map(p => [p, { target: API_TARGET, changeOrigin: false }]),
    ),
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
