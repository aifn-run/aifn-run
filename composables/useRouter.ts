import { createRouter, createWebHashHistory } from "vue-router";
import ApiDocs from "../components/api/ApiDocs.vue";
import Me from "../components/user/Me.vue";
import Settings from "../components/settings/Settings.vue";

const topPages = [
  {
    path: "/",
    name: "Getting Started",
    component: ApiDocs,
  },
  {
    path: "/docs",
    name: "Docs",
    component: ApiDocs,
  },
  {
    path: "/settings",
    name: "Settings",
    protected: true,
    component: Settings,
  },
];

const routes = [
  ...topPages,
  {
    path: "/me",
    name: "Me",
    protected: true,
    component: Me,
  },
];

export const router = createRouter({
  history: createWebHashHistory("/"),
  routes,
});

export function useRouter() {
  return { router, routes, topPages };
}
