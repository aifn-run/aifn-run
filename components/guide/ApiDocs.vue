<template>
  <div class="flex space-x-8" ref="page">
    <main class="w-3/4">
      <h1 class="text-2xl font-bold mb-6">Javascript API</h1>

      <h2 id="create" class="text-lg my-4">Create a function</h2>
      <CodeBlock v-pre>
        // with just a prompt
        const f = await ai.fn('text for prompt');

        // with a prompt and a name
        const g = await ai.fn({ p: 'text for prompt', name: 'lorem' });
      </CodeBlock>

      <h2 id="use" class="text-lg my-4">Use an AI function</h2>
      <CodeBlock>const result = await f('input for AI to process');</CodeBlock>
    </main>
    <aside class="w-1/4">
      <nav class="flex flex-col">
        <a href="#" class="px-4 py-2 text-underline" v-nav="'create'">Create a function</a>
        <a href="#" class="px-4 py-2 text-underline" v-nav="'use'">Use an AI function</a>
      </nav>
    </aside>
  </div>
</template>

<script setup>
import CodeBlock from './CodeBlock.vue';
import { ref } from 'vue';

const page = ref(null);
const vNav = {
  async mounted(el, { value }) {
    el.addEventListener('click', (e) => e.preventDefault());
    page.value.getElementById(value)?.scrollIntoView({ behavior: 'smooth' });
  },
};
</script>
