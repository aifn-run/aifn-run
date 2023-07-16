<template>
  <article>
    <section>
      <h1 class="text-3xl font-bold pb-4">ai.fn() -- AI as a function</h1>
      <h2 class="text-2xl font-bold mb-4">Introduction</h2>
      <p><strong>ai.fn()</strong> is a service to use AI chat completions as a regular Javascript function in any project, for both browser and Node.JS.</p>

      <h2 class="text-2xl font-bold my-4">But why?</h2>
      <p class="mb-4">ChatBots and AI integrations via REST API's have their own boilerplate and set up, which has to be done over and over again.</p>
      <p class="mb-4">Javascript already offers the tools we need to make that easier: async/await combined with ES module imports.</p>
      <p class="mb-4">Not only that, with AI completions we can achieve many tasks using simple prompts, encapsulated as Javascript functions.</p>

      <h2 class="text-2xl font-bold my-4">How to start (web)</h2>
      <p class="mb-4">For web pages, import the library in your code:</p>
      <CodeBlock>import ai from 'https://aifn.run/ai.mjs'</CodeBlock>

      <p class="mb-4">Create an AI function:</p>
      <CodeBlock>const lorem = await ai.fn('Create a lorem ipsum paragraph with {count} words');</CodeBlock>

      <p class="mb-4">And use the new function like any other:</p>
      <CodeBlock>const paragraph = await lorem({ count: 100 });</CodeBlock>

      <h2 class="text-2xl font-bold my-4">How to start (Node.js)</h2>
      <p class="mb-4">For server-side, install `npm i @aifn/client`.</p>
      <p class="mb-4">Then use the module in the same way the web API works:</p>
      <CodeBlock>
        <pre v-pre>
          import ai from '@aifn/client';

          async function main() {
            const lorem = await ai.fn('Create a lorem ipsum paragraph with {count} words');
            const paragraph = await lorem({ count: 100 });

            console.log(paragraph);
          }

          main();
        </pre>
      </CodeBlock>
    </section>

    <section>
      <h2 class="text-2xl font-bold my-4">Try it</h2>

      <textarea
        class="font-mono my-4 p-2 border border-gray-400 bg-gray-800 rounded-lg w-full h-40 mb-4"
        v-model="code"
      ></textarea>

      <div class="text-center">
        <button
          @click="run()"
          class="text-white bg-blue-500 shadow-lg border border-blue-400 font-bold text-lg py-1 px-4 rounded"
        >
          Run
        </button>
      </div>

      <div v-if="output" class="font-mono my-4 p-2 border border-gray-400 bg-gray-800 rounded-lg w-full mb-4">
        {{ output }}
      </div>
    </section>
  </article>
</template>

<script setup>
import { ref } from 'vue';
import CodeBlock from './CodeBlock.vue';

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
  document.head.querySelectorAll('script[data-aifn]').forEach((s) => s.remove());
  script.textContent = code.value;
  document.head.appendChild(script);
}

console.log = (text) => (output.value = text);
</script>
