/**
 * 内核错误。
 *
 * 存档事故的根源几乎都是"静默兜底"：字段缺了补默认值，版本不认就当成最新——
 * 于是玩家以为存上了，其实读回来是另一局。新内核里存档问题一律**显式失败**，
 * 带上机器可读的 code，让前端能说人话、让日志能定位。
 */
export type CoreErrorCode =
  'SAVE_UNRECOGNIZED' | 'SAVE_VERSION_UNSUPPORTED' | 'SAVE_STATE_INVALID' | 'COMMAND_PRECONDITION';

export class CoreError extends Error {
  readonly code: CoreErrorCode;
  readonly details?: unknown;

  constructor(code: CoreErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = 'CoreError';
    this.code = code;
    this.details = details;
  }
}
