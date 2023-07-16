import { createRouter, createWebHashHistory } from 'vue-router';
import GettingStarted from '../components/guide/GettingStarted.vue';
import ApiDocs from '../components/guide/ApiDocs.vue';
import Me from '../components/user/Me.vue';
import Settings from '../components/settings/Settings.vue';

const topPages = [
  {
    path: '/',
    name: 'Getting Started',
    icon: 'home',
    component: GettingStarted,
  },
  {
    path: '/api',
    name: 'API',
    icon: 'menu_book',
    component: ApiDocs,
  },
  {
    path: '/settings',
    name: 'Settings',
    icon: 'settings',
    protected: true,
    component: Settings,
  },
];

const routes = [
  ...topPages,
  {
    path: '/me',
    name: 'Me',
    protected: true,
    component: Me,
  },
];

export const router = createRouter({
  history: createWebHashHistory('/'),
  routes,
});

export function useRouter() {
  return { router, routes, topPages };
}
