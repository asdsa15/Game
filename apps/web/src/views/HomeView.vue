<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { api, ApiError, type Board, type BoardEntry, type RunRecord, type SaveSummary } from '../api';
import { useSession } from '../stores/session';
import { BOARD_LABEL, ENDINGS, endingName } from '../endings';

const session = useSession();
const router = useRouter();

const saves = ref<SaveSummary[]>([]);
const runs = ref<RunRecord[]>([]);
const runTotal = ref(0);
const board = ref<Board>('score');
const boards = reactive<Record<Board, BoardEntry[]>>({ score: [], realm: [], age: [] });

const importSlot = ref(0);
const fileInput = ref<HTMLInputElement | null>(null);
const busy = ref(false);
const msg = ref('');
const err = ref('');

const form = reactive({
  ending: 'guowei',
  realm: 3,
  age: 80,
  seed: randomSeed(),
});

const entries = computed(() => boards[board.value]);

function randomSeed(): string {
  const buf = new Uint8Array(6);
  crypto.getRandomValues(buf);
  return Array.from(buf, b => b.toString(16).padStart(2, '0')).join('');
}

function fail(e: unknown): void {
  err.value = e instanceof ApiError ? `${e.message}（${e.code}）` : e instanceof Error ? e.message : '请求失败';
}

function clear(): void {
  err.value = '';
  msg.value = '';
}

async function loadSaves(): Promise<void> {
  saves.value = (await api.listSaves()).saves;
}

async function loadRuns(): Promise<void> {
  const r = await api.myRuns();
  runs.value = r.runs;
  runTotal.value = r.total;
}

async function loadBoard(): Promise<void> {
  boards[board.value] = (await api.leaderboard(board.value)).entries;
}

async function loadAll(): Promise<void> {
  busy.value = true;
  clear();
  try {
    await Promise.all([loadSaves(), loadRuns(), loadBoard()]);
  } catch (e) {
    fail(e);
  } finally {
    busy.value = false;
  }
}

watch(board, () => { void loadBoard().catch(fail); });

onMounted(() => { void loadAll(); });

async function onPickFile(ev: Event): Promise<void> {
  const input = ev.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  clear();
  busy.value = true;
  try {
    const text = await file.text();
    let raw: unknown;
    try { raw = JSON.parse(text); } catch { throw new Error('文件不是合法 JSON'); }
    const out = await api.importSave(importSlot.value, raw);
    msg.value = `已导入到槽 ${out.slot}（来源 ${out.migratedFrom}，版本 ${out.version}）`;
    await loadSaves();
  } catch (e) {
    fail(e);
  } finally {
    busy.value = false;
    input.value = '';
  }
}

async function download(slot: number): Promise<void> {
  clear();
  try {
    const d = await api.getSave(slot);
    const envelope = {
      format: 'wendao-save',
      version: 2,
      contentVersion: d.contentVersion,
      savedAt: Date.now(),
      seed: d.seed,
      state: d.state,
      meta: d.meta,
    };
    const blob = new Blob([JSON.stringify(envelope, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wendao-save-${slot}.json`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (e) {
    fail(e);
  }
}

async function remove(slot: number): Promise<void> {
  if (!window.confirm(`删掉槽 ${slot} 的存档？此操作不可撤销。`)) return;
  clear();
  try {
    await api.deleteSave(slot);
    await loadSaves();
    msg.value = `槽 ${slot} 已删除`;
  } catch (e) {
    fail(e);
  }
}

async function submitRun(): Promise<void> {
  clear();
  busy.value = true;
  try {
    const out = await api.submitRun({
      seed: form.seed,
      ending: form.ending,
      realm: Number(form.realm),
      age: Number(form.age),
    });
    msg.value = `已上报：${endingName(out.ending)} · ${out.realm} 境 · ${out.age} 岁 · 得分 ${out.score}`;
    form.seed = randomSeed();
    await Promise.all([loadRuns(), loadBoard()]);
  } catch (e) {
    fail(e);
  } finally {
    busy.value = false;
  }
}

async function logout(): Promise<void> {
  await session.logout();
  await router.replace({ name: 'auth' });
}

const fmtTime = (iso: string): string =>
  new Date(iso).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });

const metaText = (m: Record<string, unknown>): string => {
  const parts: string[] = [];
  if (typeof m.dao === 'string') parts.push(m.dao);
  if (typeof m.realm === 'number') parts.push(`${m.realm} 境`);
  if (typeof m.age === 'number') parts.push(`${m.age} 岁`);
  return parts.join(' · ') || '—';
};
</script>

<template>
  <div class="home">
    <div class="who">
      <div>
        <b>{{ session.user?.nickname }}</b>
        <span class="note">　{{ session.user?.email }}</span>
      </div>
      <button class="btn ghost sm" @click="logout">登出</button>
    </div>

    <p v-if="err" class="err">{{ err }}</p>
    <p v-else-if="msg" class="ok">{{ msg }}</p>

    <!-- 云存档 -->
    <section class="panel">
      <div class="panel-head">
        <h2>云存档</h2>
        <span class="hint">共 {{ saves.length }} 槽　·　导入支持旧版 wxcs3-save</span>
      </div>
      <div class="panel-body">
        <table v-if="saves.length">
          <thead>
            <tr><th>槽</th><th>道号 / 境界 / 年岁</th><th>版本</th><th>种子</th><th>更新</th><th /></tr>
          </thead>
          <tbody>
            <tr v-for="s in saves" :key="s.slot">
              <td class="num">{{ s.slot }}</td>
              <td>{{ metaText(s.meta) }}</td>
              <td class="num">v{{ s.version }}</td>
              <td class="num note">{{ s.seed }}</td>
              <td class="num note">{{ fmtTime(s.updatedAt) }}</td>
              <td class="ops">
                <button class="btn ghost sm" @click="download(s.slot)">导出</button>
                <button class="btn danger sm" @click="remove(s.slot)">删除</button>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-else class="empty">还没有存档。游戏端存档后可同步上来，或导入旧档。</div>

        <div class="import">
          <div class="field">
            <label for="slot">导入到槽位</label>
            <select id="slot" v-model.number="importSlot">
              <option v-for="n in 4" :key="n - 1" :value="n - 1">{{ n - 1 }}</option>
            </select>
          </div>
          <div class="field grow">
            <label for="file">选择存档文件（.json）</label>
            <input id="file" ref="fileInput" type="file" accept=".json,application/json" @change="onPickFile" />
          </div>
        </div>
        <p class="note">
          导入会<strong>覆盖</strong>目标槽位。想保留原档，先导出。
        </p>
      </div>
    </section>

    <!-- 结局上报 -->
    <section class="panel">
      <div class="panel-head">
        <h2>结局上报</h2>
        <span class="hint">分数由服务端计算，客户端改不了</span>
      </div>
      <div class="panel-body">
        <form class="row" @submit.prevent="submitRun">
          <div class="field">
            <label for="ending">结局</label>
            <select id="ending" v-model="form.ending">
              <option v-for="e in ENDINGS" :key="e.id" :value="e.id">{{ e.name }}</option>
            </select>
          </div>
          <div class="field narrow">
            <label for="realm">境界</label>
            <input id="realm" v-model.number="form.realm" type="number" min="0" max="12" />
          </div>
          <div class="field narrow">
            <label for="age">寿元</label>
            <input id="age" v-model.number="form.age" type="number" min="0" max="2000" />
          </div>
          <div class="field">
            <label for="seed">种子</label>
            <input id="seed" v-model.trim="form.seed" />
          </div>
          <button class="btn" type="submit" :disabled="busy">上报</button>
        </form>

        <div v-if="runs.length" class="mine">
          <div class="note">共 {{ runTotal }} 次人生，最近 {{ runs.length }} 条：</div>
          <table>
            <thead><tr><th>结局</th><th>境界</th><th>寿元</th><th>得分</th><th>时间</th></tr></thead>
            <tbody>
              <tr v-for="r in runs" :key="r.id">
                <td>{{ endingName(r.ending) }}</td>
                <td class="num">{{ r.realm }}</td>
                <td class="num">{{ r.age }}</td>
                <td class="num">{{ r.score }}</td>
                <td class="num note">{{ fmtTime(r.endedAt) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <!-- 榜单 -->
    <section class="panel">
      <div class="panel-head">
        <h2>榜单</h2>
        <span class="hint">每人只取最好的一条</span>
      </div>
      <div class="panel-body">
        <div class="tabs">
          <span
            v-for="b in (['score', 'realm', 'age'] as Board[])"
            :key="b"
            class="tab"
            :class="{ on: board === b }"
            @click="board = b"
          >{{ BOARD_LABEL[b] }}</span>
        </div>
        <table v-if="entries.length">
          <thead><tr><th>#</th><th>道号</th><th>结局</th><th>境界</th><th>寿元</th><th>得分</th></tr></thead>
          <tbody>
            <tr v-for="e in entries" :key="e.rank">
              <td class="num">{{ e.rank }}</td>
              <td>{{ e.nickname }}</td>
              <td>{{ endingName(e.ending) }}</td>
              <td class="num">{{ e.realm }}</td>
              <td class="num">{{ e.age }}</td>
              <td class="num">{{ e.score }}</td>
            </tr>
          </tbody>
        </table>
        <div v-else class="empty">榜上还没有人。先上报一次结局。</div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.home { display: flex; flex-direction: column; gap: 16px; }
.who { display: flex; align-items: baseline; justify-content: space-between; }
.who b { font-size: 16px; letter-spacing: 2px; color: var(--strong); }
.ops { display: flex; gap: 6px; justify-content: flex-end; }
.import { display: flex; gap: 12px; margin-top: 14px; align-items: flex-end; flex-wrap: wrap; }
.import .grow { flex: 1 1 260px; margin-bottom: 0; }
.import .field { margin-bottom: 0; }
.mine { margin-top: 18px; }
.field.narrow { flex: 0 0 92px; }
@media (max-width: 720px) {
  .who { flex-direction: column; gap: 6px; }
  .ops { justify-content: flex-start; }
}
</style>
