<template>
  <article>
    <section>
      <h1 class="text-3xl font-bold pb-4">AI as a function</h1>
      <h2 class="text-2xl font-bold mt-8 mb-4">Introduction</h2>
      <p>
        <strong>ai.fn() is a service to use AI chat completions as a regular Javascript function</strong> in any
        project, for both browser and Node.JS.
      </p>

      <h2 class="text-2xl font-bold mb-4 mt-8">But why?</h2>
      <p class="mb-4">
        ChatBots and AI services are all the rage these days!
        But they always have a boilerplate to set up. It has to be done over and
        over again.
      </p>
      <p class="mb-4">
        Javascript already offers the tools we need to make that easier: async/await combined with ES module imports.
      </p>
      <p class="mb-4">
        Or... You can forget all that and complete tasks using simple prompts, encapsulated as Javascript
        functions.
      </p>

      <h2 class="text-2xl font-bold mb-4 mt-8">How to start (web)</h2>
      <p class="mb-4">For web pages, import the library as a module:</p>
      <CodeBlock>
        <pre v-pre>import ai from 'https://aifn.run/ai.mjs';

async function main() {
  // Create an AI function
  const lorem = await ai.fn('Create a lorem ipsum paragraph with {count} words');

  // And use the new function like any other:
  const paragraph = await lorem({ count: 100 });

  console.log(paragraph);
}

main();</pre>
      </CodeBlock>

      <h2 class="text-2xl font-bold mb-4 mt-8">How to start (Node.js)</h2>
      <p class="mb-4">
        For server-side, install <code class="py-1 px-2 bg-gray-800">@aifn/client</code> and use the module in the same
        way the web API works:
      </p>
      <CodeBlock>
        <pre v-pre>import ai from '@aifn/client';

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
        class="font-mono my-4 p-2 border border-gray-400 bg-gray-800 rounded-lg w-full h-half mb-4"
        v-model="code"
      ></textarea>

      <div
        v-if="output || running"
        class="font-mono my-4 p-2 border border-gray-400 bg-gray-800 rounded-lg w-full mb-4"
      >
        <span class="material-icons animate-spin" v-if="running">autorenew</span>
        {{ output }}
      </div>

      <div>
        <button
          :disabled="running"
          @click="run()"
          class="text-white bg-blue-500 shadow-lg border border-blue-400 font-bold text-lg py-1 px-4 rounded flex mx-auto"
        >
          <span class="material-icons" :class="running && 'animate-spin'">{{
            running ? 'refresh' : 'play_arrow'
          }}</span>
          <span>Run</span>
        </button>
      </div>
    </section>
  </article>
</template>

<script setup>
import { ref } from 'vue';
import CodeBlock from './CodeBlock.vue';

const running = ref(false);
const initialSnippet = `
// create an AI function
const lorem = await ai.fn('Create a lorem ipsum paragraph with at most {count} words');

// use the function to get an AI response
const paragraph = await lorem({ count: 10 });

console.log(paragraph);
`;

const code = ref(initialSnippet.trim());
const output = ref('');

async function run() {
  output.value = '';
  const fn = Function(`async function runExample() { ${code.value}; }
  return runExample()`);

  running.value = true;

  try {
    await fn();
  } finally {
    running.value = false;
  }
}

console.log = (text) => (output.value += text);
</script>

<style scoped>
.h-half {
  height: 50vh;
}
</style>
