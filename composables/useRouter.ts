import { createRouter, createWebHashHistory } from "vue-router";
import ApiDocs from "../components/ApiDocs.vue";

const topPages = [
  {
    path: "/api",
    name: "API",
    component: ApiDocs,
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
