<template>
  <div
    class="w-screen h-screen flex flex-col overflow-hidden bg-gray-900 text-white"
  >
    <div
      class="flex justify-between items-center border-b border-black bg-gray-700 space-x-12 shadow-lg p-4"
    >
      <h1 class="text-2xl font-bold text-white">ai.fn()</h1>
      <nav class="py-2 flex-1 flex justify-center" :data-length="links.length">
        <router-link
          v-for="(route, index) of links"
          :key="route.path"
          :to="route.path"
          class="font-bold px-4 py-2 shadow-lg border text-white"
          :class="[
            index === 0 && 'rounded-l',
            index === links.length - 1 && 'rounded-r',
          ]"
          active-class="bg-gray-200 text-gray-900"
          >{{ route.name }}</router-link
        >
      </nav>
      <div>
        <button v-if="!isLoggedIn" @click="signIn()">
          <span class="material-icons text-4xl text-white">account_circle</span>
        </button>
        <button v-if="isLoggedIn" @click="showProfile()">
          <span
            class="pt-1 font-bold text-3xl text-center text-white bg-gray-800 border border-white rounded-full inline-block w-12 h-12"
            >{{ profile.displayName.charAt(0) }}</span
          >
        </button>
      </div>
    </div>

    <div>
      <router-view></router-view>
    </div>
  </div>
</template>

<script setup>
import { useAuth } from "./composables/useAuth";
import { useRouter } from "./composables/useRouter";
import { computed } from "vue";

const { topPages, router } = useRouter();
const { isLoggedIn, signIn } = useAuth();
const links = computed(() =>
  topPages.filter((page) => !page.protected || isLoggedIn.value)
);

function showProfile() {
  router.push("/me");
}
</script>
