<template>
  <article class="mx-auto container py-8">
    <section>
      <h2 class="text-2xl font-bold mb-4">How to start</h2>
      <p>Import the library in your code</p>
      <CodeBlock>
        import ai from 'https://aifn.run/ai.mjs'
      </CodeBlock>

      <p>Create an AI function:</p>
      <CodeBlock>
        const lorem = await ai.fn('Create a lorem ipsum paragraph with {count} words');
      </CodeBlock>

      <p>And use the new function like any other:</p>
      <CodeBlock>
        const paragraph = await lorem({ count: 100 });
      </CodeBlock>
    </section>

    <section>
      <h2 class="text-2xl font-bold my-4">Try it</h2>

      <textarea class="font-mono my-4 p-2 border border-gray-400 bg-gray-800 rounded-lg w-full h-40 mb-4" v-model="code"></textarea>

      <div class="text-center">
        <button @click="run()" class="text-white bg-blue-500 shadow-lg border border-blue-400 font-bold text-lg py-1 px-4 rounded">Run</button>
      </div>

      <div v-if="output" class="font-mono my-4 p-2 border border-gray-400 bg-gray-800 rounded-lg w-full mb-4">{{ output }}</div>
    </section>
  </article>
</template>

<script setup>
import { ref } from "vue";
import CodeBlock from "./CodeBlock.vue";

const initialSnippet = `
import ai from 'https://aifn.run/ai.mjs'

async function runExample() {
  const lorem = await ai.fn('Create a lorem ipsum paragraph with {count} words');
  const paragraph = await lorem({ count: 100 });
  console.log(paragraph)
}

try {
  runExample();
} catch (e) {
  console.log(e)
}
`;

const code = ref(initialSnippet.trim());
const output = ref('');

function run() {
  const script = document.createElement('script');
  script.setAttribute('data-aifn', '');
  script.setAttribute('type', 'module');
  document.head.querySelectorAll('script[data-aifn]').forEach(s => s.remove());
  script.textContent = code.value;
  document.head.appendChild(script);
}

console.log = (text) => output.value = text;
</script>