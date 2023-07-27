<template>
  <div class="w-screen h-screen flex flex-col bg-gray-900 text-white">
    <div class="flex justify-between items-center border-b border-black bg-gray-700 space-x-2 shadow-lg p-4">
      <h1 class="text-xl font-bold text-white">
        <router-link to="/">ai.fn()</router-link>
      </h1>
      <nav class="py-2 flex-1 flex justify-center" :data-length="links.length">
        <router-link
          v-for="(route, index) of links"
          :key="route.path"
          :to="route.path"
          class="font-bold md:px-4 p-2 shadow-lg border text-white"
          :class="[index === 0 && 'rounded-l', index === links.length - 1 && 'rounded-r']"
          active-class="bg-gray-200 text-gray-900"
        >
          <span class="material-icons md:hidden text-lg">{{ route.icon }}</span>
          <span class="hidden md:inline">{{ route.name }}</span>
        </router-link>
      </nav>
      <div>
        <button v-if="!isLoggedIn" @click="signIn()">
          <span class="material-icons text-4xl text-white">account_circle</span>
        </button>
        <button v-if="isLoggedIn" @click="showProfile()">
          <span
            class="pt-1 font-bold text-3xl text-center text-white bg-gray-800 border border-white rounded-full inline-block w-12 h-12"
            >{{ profile && profile.name.charAt(0) }}</span
          >
        </button>
      </div>
    </div>

    <div class="overflow-y-scroll mx-auto container py-8 px-4">
      <router-view></router-view>
      <div class="bg-gray-700 text-center py-8 px-4 mt-8">
        <router-link
          v-for="route of footerPages"
          :key="route.path"
          :to="route.path"
          class="px-4 inline-block"
          active-class="bg-gray-200 text-gray-900"
        >
          <span class="text-sm">{{ route.name }}</span>
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useAuth } from './composables/useAuth';
import { useRouter } from './composables/useRouter';
import { computed } from 'vue';

const { topPages, footerPages, router } = useRouter();
const { isLoggedIn, profile, signIn } = useAuth();
const links = computed(() => topPages.filter((page) => !page.protected || isLoggedIn.value));

function showProfile() {
  router.push('/me');
}
</script>
