import * as auth from "https://auth.aifn.run/auth.js";
import { onMounted, ref } from "vue";

const isLoggedIn = ref(false);

export function useAuth() {
  onMounted(async () => {
    try {
      await auth.getProfile();
      isLoggedIn.value = true;
    } catch {
      isLoggedIn.value = false;
    }
  });

  return { ...auth, isLoggedIn };
}
