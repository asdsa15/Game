import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      // 源码直跑：不必先 build contracts，测试与开发都指向源文件。
      // 发布/服务端运行才吃 dist（见 package.json 的 exports）。
      '@wendao/contracts': fileURLToPath(new URL('../contracts/src/index.ts', import.meta.url)),
    },
  },
  test: {
    include: ['test/**/*.test.ts'],
  },
});
