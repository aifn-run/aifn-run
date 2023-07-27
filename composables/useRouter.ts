import { createRouter, createWebHashHistory } from 'vue-router';
import GettingStarted from '../components/guide/GettingStarted.vue';
import ApiDocs from '../components/guide/ApiDocs.vue';
import Me from '../components/user/Me.vue';
import Functions from '../components/functions/Functions.vue';
import Privacy from '../components/about/Privacy.vue';

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
    path: '/functions',
    name: 'Functions',
    icon: 'functions',
    protected: true,
    component: Functions,
  },
];

const footerPages = [
  {
    path: '/ai/privacy',
    name: 'Privacy Policy',
    title: 'Privacy Policy',
    component: Privacy,
  },
];

const routes = [
  ...topPages,
  ...footerPages,
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
  return { router, routes, topPages, footerPages };
}
