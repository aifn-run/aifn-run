import "./highlight.css";
import { createApp } from "vue";
import App from "./components/App.vue";
import { router } from "./composables/useRouter.js";

createApp(App).use(router).mount("#app");
