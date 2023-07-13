import { createRouter, createWebHashHistory } from "vue-router";
import ApiDocs from "../components/api/ApiDocs.vue";
import Settings from "../components/settings/Settings.vue";

const topPages = [
  {
    path: "/api",
    name: "API",
    component: ApiDocs,
  },
  {
    path: "/settings",
    name: "Settings",
    protected: true,
    component: Settings,
  },
];

const routes = [...topPages];

export const router = createRouter({
  history: createWebHashHistory("/"),
  routes,
});

export function useRouter() {
  return { router, routes, topPages };
}
