<template>
  <div class="w-screen h-screen flex flex-col bg-gray-900 text-white">
    <div class="flex justify-between items-center border-b border-black bg-gray-700 space-x-12 shadow-lg p-4">
      <h1 class="text-2xl font-bold text-white">ai.fn()</h1>
      <nav class="py-2 flex-1 flex justify-center" :data-length="links.length">
        <router-link
          v-for="(route, index) of links"
          :key="route.path"
          :to="route.path"
          class="font-bold px-4 py-2 shadow-lg border text-white"
          :class="[index === 0 && 'rounded-l', index === links.length - 1 && 'rounded-r']"
          active-class="bg-gray-200 text-gray-900"
        >
          <span class="material-icons md:hidden">{{ route.icon }}</span>
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
            >{{ profile && profile.displayName.charAt(0) }}</span
          >
        </button>
      </div>
    </div>

    <div class="overflow-y-scroll mx-auto container py-8 px-4">
      <router-view></router-view>
    </div>
  </div>
</template>

<script setup>
import { useAuth } from './composables/useAuth';
import { useRouter } from './composables/useRouter';
import { computed } from 'vue';
import ai from 'https://aifn.run/ai.mjs';

window.ai = ai;

const { topPages, router } = useRouter();
const { isLoggedIn, profile, signIn } = useAuth();
const links = computed(() => topPages.filter((page) => !page.protected || isLoggedIn.value));

function showProfile() {
  router.push('/me');
}
</script>

<style>
/* https://highlightjs.org/static/demo/styles/atom-one-dark.css */
pre code.hljs{display:block;overflow-x:auto;padding:1em}code.hljs{padding:3px 5px}.hljs{color:#abb2bf;background:#282c34}.hljs-comment,.hljs-quote{color:#5c6370;font-style:italic}.hljs-doctag,.hljs-formula,.hljs-keyword{color:#c678dd}.hljs-deletion,.hljs-name,.hljs-section,.hljs-selector-tag,.hljs-subst{color:#e06c75}.hljs-literal{color:#56b6c2}.hljs-addition,.hljs-attribute,.hljs-meta .hljs-string,.hljs-regexp,.hljs-string{color:#98c379}.hljs-attr,.hljs-number,.hljs-selector-attr,.hljs-selector-class,.hljs-selector-pseudo,.hljs-template-variable,.hljs-type,.hljs-variable{color:#d19a66}.hljs-bullet,.hljs-link,.hljs-meta,.hljs-selector-id,.hljs-symbol,.hljs-title{color:#61aeee}.hljs-built_in,.hljs-class .hljs-title,.hljs-title.class_{color:#e6c07b}.hljs-emphasis{font-style:italic}.hljs-strong{font-weight:700}.hljs-link{text-decoration:underline}
</style>
