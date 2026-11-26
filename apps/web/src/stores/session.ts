import { defineStore } from 'pinia';
import { ref } from 'vue';
import { api, setToken, tryRefresh, ApiError, type User } from '../api';

export const useSession = defineStore('session', () => {
  const user = ref<User | null>(null);
  const ready = ref(false);
  const busy = ref(false);
  const error = ref('');

  /** 打开页面先静默续期：刷新令牌还在，就不必让玩家重登 */
  async function bootstrap(): Promise<void> {
    try {
      if (await tryRefresh()) {
        user.value = (await api.me()).user;
      }
    } catch {
      user.value = null;
    } finally {
      ready.value = true;
    }
  }

  async function run<T>(fn: () => Promise<T>): Promise<T | null> {
    busy.value = true;
    error.value = '';
    try {
      return await fn();
    } catch (e) {
      error.value = e instanceof ApiError ? e.message : (e instanceof Error ? e.message : '请求失败');
      return null;
    } finally {
      busy.value = false;
    }
  }

  async function login(email: string, password: string): Promise<boolean> {
    const out = await run(() => api.login({ email, password }));
    if (!out) return false;
    setToken(out.accessToken);
    user.value = out.user;
    return true;
  }

  async function register(email: string, password: string, nickname: string): Promise<boolean> {
    const out = await run(() => api.register({ email, password, nickname }));
    if (!out) return false;
    setToken(out.accessToken);
    user.value = out.user;
    return true;
  }

  async function logout(): Promise<void> {
    await run(() => api.logout());
    setToken('');
    user.value = null;
  }

  return { user, ready, busy, error, bootstrap, login, register, logout };
});
