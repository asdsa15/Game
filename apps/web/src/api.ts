/**
 * 接口客户端。
 * - access token 只放内存（不写 localStorage：XSS 也拿不走长期凭证）
 * - 刷新令牌在 httpOnly cookie 里，靠同源代理自动带上
 * - 401 时静默续期一次再重试，前端各页面不必各写一套
 */
export interface ApiErrorBody {
  error: { code: string; message: string; details?: unknown };
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, body: ApiErrorBody['error']) {
    super(body.message);
    this.name = 'ApiError';
    this.status = status;
    this.code = body.code;
    this.details = body.details;
  }
}

let accessToken = '';
export const setToken = (t: string): void => { accessToken = t; };
export const hasToken = (): boolean => !!accessToken;

async function send(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has('content-type')) headers.set('content-type', 'application/json');
  if (accessToken) headers.set('authorization', `Bearer ${accessToken}`);
  return fetch(path, { ...init, headers, credentials: 'same-origin' });
}

async function toError(res: Response): Promise<ApiError> {
  let body: ApiErrorBody['error'] = { code: 'HTTP_' + res.status, message: res.statusText || '请求失败' };
  try {
    const parsed = (await res.json()) as ApiErrorBody;
    if (parsed?.error?.code) body = parsed.error;
  } catch { /* 非 JSON 响应，用状态码兜底 */ }
  return new ApiError(res.status, body);
}

const AUTH_PATHS = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout'];

async function request<T>(path: string, init: RequestInit = {}, retried = false): Promise<T> {
  const res = await send(path, init);
  if (res.status === 401 && !retried && !AUTH_PATHS.includes(path)) {
    if (await tryRefresh()) return request<T>(path, init, true);
  }
  if (!res.ok) throw await toError(res);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export async function tryRefresh(): Promise<boolean> {
  const res = await send('/auth/refresh', { method: 'POST' });
  if (!res.ok) {
    accessToken = '';
    return false;
  }
  const body = (await res.json()) as { accessToken: string };
  accessToken = body.accessToken;
  return true;
}

/* ---------------------------------------------------------------- 类型 */
export interface User {
  id: string;
  email: string;
  nickname: string;
  role: 'player' | 'editor' | 'admin';
  createdAt: string;
}

export interface SaveSummary {
  slot: number;
  version: number;
  contentVersion: string;
  seed: string;
  meta: Record<string, unknown>;
  updatedAt: string;
}

export interface SaveDetail extends SaveSummary {
  state: Record<string, unknown>;
}

export interface RunRecord {
  id: string;
  seed: string;
  ending: string;
  realm: number;
  age: number;
  score: number;
  verified: boolean;
  endedAt: string;
}

export interface BoardEntry {
  rank: number;
  nickname: string;
  ending: string;
  realm: number;
  age: number;
  score: number;
  endedAt: string;
}

export type Board = 'score' | 'realm' | 'age';

/* ---------------------------------------------------------------- 接口 */
export const api = {
  health: () => request<{ ok: boolean; version: string; env: string }>('/healthz'),

  register: (body: { email: string; password: string; nickname: string }) =>
    request<{ user: User; accessToken: string }>('/auth/register', {
      method: 'POST', body: JSON.stringify(body),
    }),

  login: (body: { email: string; password: string }) =>
    request<{ user: User; accessToken: string }>('/auth/login', {
      method: 'POST', body: JSON.stringify(body),
    }),

  logout: () => request<null>('/auth/logout', { method: 'POST' }),

  me: () => request<{ user: User }>('/me'),

  listSaves: () => request<{ saves: SaveSummary[] }>('/saves'),

  getSave: (slot: number) => request<SaveDetail>(`/saves/${slot}`),

  deleteSave: (slot: number) => request<null>(`/saves/${slot}`, { method: 'DELETE' }),

  importSave: (slot: number, raw: unknown) =>
    request<{ slot: number; version: number; migratedFrom: string; meta: Record<string, unknown> }>(
      `/saves/${slot}/import`,
      { method: 'POST', body: JSON.stringify(raw) },
    ),

  submitRun: (body: { seed: string; ending: string; realm: number; age: number }) =>
    request<RunRecord>('/runs', { method: 'POST', body: JSON.stringify(body) }),

  myRuns: () => request<{ total: number; runs: RunRecord[] }>('/runs/mine'),

  leaderboard: (board: Board, size = 20) =>
    request<{ board: Board; entries: BoardEntry[] }>(`/leaderboard?board=${board}&size=${size}`),
};
