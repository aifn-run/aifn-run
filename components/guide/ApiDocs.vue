<template>
  <div class="mx-auto container p-8 flex space-x-8">
    <main class="w-3/4">
      <h1 class="text-2xl mb-6">API</h1>

      <h2 id="create" class="text-lg mb-4">Create a function</h2>
      <CodeBlock lang="javascript">
        const f = await ai.fn('text for prompt');
        const g = await ai.fn({ p: 'text for prompt', model: 'gpt-4' })
      </CodeBlock>

      <h2 id="use" class="text-lg mb-4">Create a function</h2>
      <CodeBlock lang="javascript">
        const result = await f('input for AI to process');
      </CodeBlock>
    </main>
    <aside class="w-1/4">
      <nav class="flex flex-col">
        <a href="#" class="px-4 py-2 text-underline" v-nav="'create'">Create a function</a>
        <a href="#" class="px-4 py-2 text-underline" v-nav="'use'">Create a function</a>
      </nav>
    </aside>
  </div>
</template>

<script setup>
import CodeBlock from "./CodeBlock.vue";
import { ref } from 'vue';

const page = ref(null);
const vNav = {
  async mounted(el, {value}) {
    el.addEventListener('click', (e) => e.preventDefault());
    page.getElementById(value)?.scrollIntoView({ behavior: 'smooth' });
  }
};

</script>
