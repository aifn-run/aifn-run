import * as auth from 'https://auth.aifn.run/auth.js';
import { onMounted, ref } from 'vue';

const isLoggedIn = ref(false);
const profile = ref({});

export function useAuth() {
  const refresh = async () => {
    try {
      profile.value = await auth.getProfile();
      isLoggedIn.value = true;
    } catch {
      isLoggedIn.value = false;
    }
  };

  onMounted(refresh);

  const signOut = async () => {
    await auth.signOut();
    isLoggedIn.value = false;
  };

  return { ...auth, signOut, isLoggedIn, profile, refresh };
}
