import { createRouter, createWebHistory } from 'vue-router';
import { useSession } from './stores/session';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/home' },
    { path: '/login', name: 'auth', component: () => import('./views/AuthView.vue'), meta: { guest: true } },
    { path: '/home', name: 'home', component: () => import('./views/HomeView.vue') },
    { path: '/:pathMatch(.*)*', redirect: '/home' },
  ],
});

router.beforeEach(async (to) => {
  const s = useSession();
  if (!s.ready) await s.bootstrap();
  if (!to.meta.guest && !s.user) return { name: 'auth' };
  if (to.meta.guest && s.user) return { name: 'home' };
  return true;
});

export default router;
