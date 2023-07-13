<template>
  <div class="w-screen h-screen flex overflow-hidden bg-gray-900 text-white">
    <div
      class="flex justify-between border-b border-black bg-gray-700 space-x-8 shadow-lg"
    >
      <h1 class="text-lg font-bold text-white">ai.fn()</h1>
      <nav class="mx-4 py-2 flex-1 flex">
        <router-link
          v-for="route in links"
          :to="route.path"
          class="text-gray-900 py-2 px-4 rounded"
          active-class="text-blue-500 bg-gray-200 font-bold"
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
