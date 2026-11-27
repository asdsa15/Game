/**
 * 时钟边界。
 *
 * 规则层不许直读时钟（`Date.now` 在 core 被 ESLint 拦），但总得有一个默认值，
 * 否则每个调用方都要传 `now`。所以把"唯一一次读真时钟"关在这一个文件里：
 * 想审计"谁在读系统时间"，只需要看这里。
 */
export const systemNow = (): number =>
  // eslint-disable-next-line no-restricted-properties -- core 里唯一允许读系统时钟的地方
  Date.now();
