<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { RouterView } from 'vue-router';
import { api } from './api';

const status = ref<'checking' | 'ok' | 'down'>('checking');
const version = ref('');
let timer = 0;

async function ping(): Promise<void> {
  try {
    const h = await api.health();
    status.value = h.ok ? 'ok' : 'down';
    version.value = h.version;
  } catch {
    status.value = 'down';
  }
}

onMounted(() => {
  void ping();
  timer = window.setInterval(() => void ping(), 15_000);
});
onUnmounted(() => window.clearInterval(timer));
</script>

<template>
  <div class="shell">
    <header class="topbar">
      <span class="brand">问道长生</span>
      <span class="sub">云存档 · 本地服务</span>
      <span class="spacer" />
      <span class="dot" :class="status" />
      <span class="api">
        {{ status === 'ok' ? `服务正常 v${version}` : status === 'down' ? '服务未连接' : '连接中…' }}
      </span>
    </header>

    <main class="stage">
      <RouterView />
    </main>

    <footer class="foot">
      本地项目：数据落在 <code>apps/api/data/pg</code>，不联网、不依赖任何外部服务。
    </footer>
  </div>
</template>
