<template>
  <div
    class="w-screen h-screen flex flex-col overflow-hidden bg-gray-900 text-white"
  >
    <div
      class="flex justify-between border-b border-black bg-gray-700 space-x-8 shadow-lg p-4"
    >
      <h1 class="text-2xl font-bold text-white">ai.fn()</h1>
      <nav class="mx-4 py-2 flex-1 flex" :data-length="links.length">
        <router-link
          v-for="route of links"
          :key="route.path"
          :to="route.path"
          class="font-bold px-4 py-2 rounded shadow-lg border text-white"
          active-class="bg-gray-200 text-gray-900"
          >{{ route.name }}</router-link
        >
      </nav>
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

const { topPages } = useRouter();
const { isLoggedIn } = useAuth();
const links = computed(() => {
  topPages.filter((page) => !page.protected || isLoggedIn.value);
});
</script>
