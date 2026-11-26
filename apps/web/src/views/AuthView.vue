<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useSession } from '../stores/session';

const session = useSession();
const router = useRouter();

const mode = ref<'login' | 'register'>('login');
const form = reactive({ email: '', password: '', nickname: '' });

const title = computed(() => (mode.value === 'login' ? '归来' : '入道'));
const action = computed(() => (mode.value === 'login' ? '入内' : '立册'));

function switchMode(): void {
  mode.value = mode.value === 'login' ? 'register' : 'login';
  session.error = '';
}

async function submit(): Promise<void> {
  const ok = mode.value === 'login'
    ? await session.login(form.email, form.password)
    : await session.register(form.email, form.password, form.nickname);
  if (ok) await router.replace({ name: 'home' });
}
</script>

<template>
  <div class="auth">
    <section class="scroll">
      <h1>问道长生</h1>
      <p class="verse">山中无历日，坐忘不知年。<br />炉火冷成雪，蒲团凹旧痕。</p>
      <p class="note">
        这是本地跑的服务：账号存在 <code>apps/api/data/pg</code>，不联网。<br />
        没有账号就先「立册」——邮箱不必真实，本地自己能收到即可。
      </p>
      <ul class="facts">
        <li>云存档四槽，带版本冲突检测</li>
        <li>旧版 <code>wxcs3-save</code> 存档可直接导入</li>
        <li>结局上报与三张榜（综合 / 境界 / 寿元）</li>
      </ul>
    </section>

    <form class="panel card" @submit.prevent="submit">
      <div class="panel-head">
        <h2>{{ title }}</h2>
        <span class="hint">{{ mode === 'login' ? '已有牒文' : '初次入山' }}</span>
      </div>
      <div class="panel-body">
        <div v-if="mode === 'register'" class="field">
          <label for="nickname">道号</label>
          <input id="nickname" v-model.trim="form.nickname" autocomplete="nickname" placeholder="两到八字" />
        </div>
        <div class="field">
          <label for="email">邮箱</label>
          <input id="email" v-model.trim="form.email" type="email" autocomplete="username" placeholder="you@local" />
        </div>
        <div class="field">
          <label for="password">口令</label>
          <input id="password" v-model="form.password" type="password" autocomplete="current-password" placeholder="至少八位" />
        </div>

        <p v-if="session.error" class="err">{{ session.error }}</p>

        <div class="actions">
          <button class="btn" type="submit" :disabled="session.busy">{{ session.busy ? '……' : action }}</button>
          <button class="btn ghost" type="button" @click="switchMode">
            {{ mode === 'login' ? '还没有牒文' : '已有牒文' }}
          </button>
        </div>
      </div>
    </form>
  </div>
</template>

<style scoped>
.auth {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  gap: 40px;
  align-items: center;
  padding: 40px 8px;
}
.scroll h1 {
  margin: 0 0 10px;
  font-size: 34px;
  letter-spacing: 10px;
  color: var(--strong);
  font-weight: 700;
}
.verse {
  margin: 0 0 18px;
  font-size: 15px;
  line-height: 2.1;
  color: var(--jade-deep);
  letter-spacing: 2px;
}
.note { color: var(--muted); font-size: 13px; }
.facts { margin: 16px 0 0; padding-left: 18px; color: var(--muted); font-size: 13px; }
.facts li { margin: 4px 0; }
.card { align-self: center; }
.actions { display: flex; gap: 10px; margin-top: 16px; }
.actions .btn { flex: 1; }
@media (max-width: 860px) {
  .auth { grid-template-columns: 1fr; gap: 22px; padding: 16px 0 0; }
  .scroll h1 { font-size: 26px; letter-spacing: 6px; }
  .facts { display: none; }
}
</style>
