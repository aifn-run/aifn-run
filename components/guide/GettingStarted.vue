<template>
  <article>
    <section>
      <h1 class="text-3xl font-bold pb-4">AI as a function</h1>
      <h2 class="text-2xl font-bold mt-8 mb-4">Introduction</h2>
      <p>
        <strong
          >ai.fn() is a service to use AI chat completions as a regular
          Javascript function</strong
        >
        in any project, for both browser and Node.JS.
      </p>

      <h2 class="text-2xl font-bold mb-4 mt-8">But why?</h2>
      <p class="mb-4">ChatBots and AI services are all the rage these days!</p>
      <p class="mb-4">
        And Javascript offers the tools we need to turn AI into code:
        "async/await' combined with "ES module imports".
      </p>
      <p class="mb-4">
        Combining these two, we can complete tasks using AI and async functions.
      </p>

      <h2 class="text-2xl font-bold mb-4 mt-8">How to start (web)</h2>
      <p class="mb-4">For web pages, import the library as a module:</p>
      <CodeBlock>
        <pre v-pre>
import ai from 'https://aifn.run/ai.mjs';

async function main() {
  // Create an AI function
  const lorem = await ai.fn('Create a lorem ipsum paragraph with {count} words');

  // And use the new function like any other:
  const paragraph = await lorem({ count: 100 });

  console.log(paragraph);
}

main();</pre
        >
      </CodeBlock>

      <h2 class="text-2xl font-bold mb-4 mt-8">How to start (Node.js)</h2>
      <p class="mb-4">
        For server-side, install
        <code class="py-1 px-2 bg-gray-800">@aifn/client</code> and use the
        module in the same way. This is more useful if you want to create an API
        or hide your prompts:
      </p>
      <CodeBlock>
        <pre v-pre>
import ai from '@aifn/client';

async function main() {
  const lorem = await ai.fn('Create a lorem ipsum paragraph with {count} words');
  const paragraph = await lorem({ count: 100 });

  console.log(paragraph);
}

main();</pre
        >
      </CodeBlock>
    </section>

    <section>
      <h2 class="text-2xl font-bold mb-4 mt-8">Try it</h2>

      <textarea
        class="font-mono mb-4 p-2 border border-gray-400 bg-gray-800 rounded-lg w-full h-half"
        v-model="code"
      ></textarea>

      <div
        v-if="output.length || running"
        class="font-mono mb-4 p-4 bg-gray-800 rounded"
      >
        <div v-for="next in output" class="border-b border-gray-500 mb-2 py-2">
          {{ next }}
        </div>
        <div v-if="running" class="border-b border-gray-500 mb-2 py-2">
          <span class="material-icons animate-spin">autorenew</span>
        </div>
      </div>
      <div class="text-right mb-4">
        <button
          type="button"
          class="text-sm p-2 rounded"
          v-if="output.length"
          @click="output.length = 0"
        >
          Clear
        </button>
      </div>

      <div class="mb-4">
        <button
          :disabled="running"
          @click="run()"
          class="text-white bg-blue-500 shadow-lg border border-blue-400 font-bold text-lg py-1 px-4 rounded flex mx-auto"
        >
          <span class="material-icons" :class="running && 'animate-spin'">{{
            running ? "refresh" : "play_arrow"
          }}</span>
          <span>Run</span>
        </button>
      </div>
    </section>
  </article>
</template>

<script setup>
import ai from "https://aifn.run/ai.mjs";
import { ref } from "vue";
import CodeBlock from "./CodeBlock.vue";

const running = ref(false);
const initialSnippet = `
const fillText = await ai.fn('Create a lorem ipsum paragraph with at most {count} words');
const translate = await ai.fn('Translate the following text to English: {text}');

console.log(await fillText({ count: 10 }));
console.log(await translate({ text: "Cada día sabemos más y entendemos menos" }));
`;

const code = ref(initialSnippet.trim());
const output = ref([]);

async function run() {
  const fn = Function('ai', `async function runExample() { ${code.value}; } return runExample()`);

  running.value = true;

  try {
    await fn(ai);
  } finally {
    running.value = false;
  }
}

console.log = (text) => output.value.push(text);
</script>

<style scoped>
.h-half {
  height: 50vh;
}
</style>
