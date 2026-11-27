import js from '@eslint/js';
import tseslint from 'typescript-eslint';

/**
 * 边界即规则。
 *
 * `packages/core` 是唯一可以被服务端与浏览器同时执行的代码：
 * 一旦它碰了 DOM / localStorage / fetch / Math.random / Date.now，
 * 服务端重放就会拿到不同结果，"同 seed 可复现"这条底线当场失效。
 * 所以这些不是靠自觉，是靠 lint 拦下来的——违反即 CI 红。
 */
export default tseslint.config(
  {
    ignores: [
      'node_modules/**',
      '**/dist/**',
      'wxcs3-*.js', // 旧单文件版，P6 下线前不参与 lint
      'mobile/**',
      'desktop/**',
      'art/**',
      'docs/**',
      'tools/**',
      'scripts/**',
      '**/*.d.ts',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts', '**/*.mjs'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: { console: 'readonly', process: 'readonly', URL: 'readonly' },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'no-console': 'off',
    },
  },
  {
    // 边界只管"会被打进产物的源码"：测试与 vitest 配置可以用 node: 读文件，
    // 真正不许碰宿主的是 core/src 里的规则代码。
    files: ['packages/core/src/**/*.ts'],
    rules: {
      'no-restricted-globals': [
        'error',
        { name: 'window', message: 'core 不许碰 DOM：规则层在浏览器与服务端各跑一遍' },
        { name: 'document', message: 'core 不许碰 DOM' },
        { name: 'localStorage', message: 'core 不许碰存储：存档由宿主注入' },
        { name: 'sessionStorage', message: 'core 不许碰存储' },
        { name: 'fetch', message: 'core 不许联网' },
        { name: 'XMLHttpRequest', message: 'core 不许联网' },
        { name: 'navigator', message: 'core 不许读宿主环境' },
      ],
      'no-restricted-properties': [
        'error',
        {
          object: 'Math',
          property: 'random',
          message: 'core 唯一随机源是 ctx.rng（同 seed 必须可复现）',
        },
        {
          object: 'Date',
          property: 'now',
          message: 'core 不许直读时钟：用 ctx.now()，测试要能冻结时间',
        },
      ],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['node:*'], message: 'core 必须能跑在浏览器里，不许引 Node 内置模块' },
            {
              group: ['fs', 'path', 'http', 'https', 'crypto', 'os'],
              message: 'core 不许引宿主模块',
            },
            { group: ['vue', 'react', 'pinia', 'fastify'], message: 'core 不许依赖任何框架' },
          ],
        },
      ],
    },
  },
  {
    files: ['packages/content/**/*.ts'],
    rules: {
      'no-restricted-globals': [
        'error',
        { name: 'document', message: '内容包只做数据与校验，不许碰 DOM' },
        { name: 'fetch', message: '内容包由宿主加载，不联网' },
      ],
    },
  },
  {
    // 生成的类型快照与数据文件不参与风格检查：它们由脚本产出，改的是脚本
    files: ['packages/content/tables/**', 'packages/content/src/schema.tables.json'],
    rules: {},
  },
);
