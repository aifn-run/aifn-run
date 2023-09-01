<template>
  <div class="space-x-8" ref="page">
    <main>
      <h1 class="text-2xl font-bold mb-6">Javascript API</h1>

      <p class="mb-3">Note: the same API works for browsers and Node</p>

      <h3 class="mt-6 mb-3 border-gray-100 border-b py-2 font-mono">ai.fn(prompt)</h3>

      <p class="mb-3">Creates and returns a function</p>

      <CodeBlock>
        <pre v-pre>
import ai from 'https://aifn.run/ai.mjs';

// with just a prompt
const f = await ai.fn('text for prompt');

// with a prompt and a name
const g = await ai.fn({ p: 'text for prompt', name: 'lorem' });
</pre
        >
      </CodeBlock>

      <h3 class="mt-6 mb-3 border-gray-100 border-b py-2 font-mono">ai.create(fnOptions)</h3>
      <p class="mb-3">Creates a function and returns its UID</p>

      <CodeBlock>
        <pre v-pre>
import ai from 'https://aifn.run/ai.mjs';

const { uid } = await ai.create({ p: 'text for prompt', name: 'lorem' });
</pre
        >
      </CodeBlock>

      <h3 class="mt-6 mb-3 border-gray-100 border-b py-2 font-mono">ai.call(uid, inputs)</h3>
      <p class="mb-3">Calls a function and returns the text output from AI</p>

      <CodeBlock>
        <pre v-pre>
import ai from 'https://aifn.run/ai.mjs';

const uid = await ai.call('fd050f3c-4ac5-4742-a33b-5cc506c13189', { input: 'value' });
</pre
        >
      </CodeBlock>

      <h3 class="mt-6 mb-3 border-gray-100 border-b py-2 font-mono">Using an AI function</h3>
      <p class="mb-3">Just invoke it with inputs, like a regular function:</p>
      <CodeBlock>const result = await f('input for AI to process');</CodeBlock>

      <p class="mb-3">All together:</p>
      <CodeBlock>
        <pre v-pre>
        // create and call in 2 steps
const { uid } = await ai.create({ p: 'text for prompt' });
const fn = (input) => ai.call(uid, input);

await ai.update(uid, { p: 'new prompt for {text}' });
fn({ text: 'text input' })</pre
        >
      </CodeBlock>

      <h2 class="text-2xl font-bold mb-4 mt-6">HTTP API</h2>

      <h3 class="mt-6 mb-3 border-gray-100 border-b py-2 font-mono">POST /fn</h3>

      <p class="mb-3">Create a function</p>
      <p class="mb-3">Request:</p>
      <CodeBlock class="mb-3">{ "p": "Print a Lorem Ipsum paragraph with at most {length} words" }</CodeBlock>

      <p class="mb-3">Response:</p>
      <CodeBlock class="mb-3">{ "uid": "function-id" }</CodeBlock>

      <h3 class="mt-6 mb-3 border-gray-100 border-b py-2 font-mono">PUT /fn/:uid</h3>

      <p class="mb-3">Update a function</p>

      <p class="mb-3">Request:</p>
      <CodeBlock class="mb-3"
        >{ "p": "Print a Lorem Ipsum paragraph with at most {length} words and only lowercase words" }</CodeBlock
      >

      <h3 class="mt-6 mb-3 border-gray-100 border-b py-2 font-mono">GET /fn/:uid.js</h3>

      <p class="mb-3">Get a Javascript module with the code to call a function</p>
      <CodeBlock class="mb-3"
        >import loremIpsum from 'https://aifn.run/fn/[uid].js'; console.log(await loremIpsum({ length: 20 }));
      </CodeBlock>

      <h3 class="mt-6 mb-3 border-gray-100 border-b py-2 font-mono">POST /run/[uid]</h3>

      <p class="mb-3">Run a function using a function ID</p>
      <p class="mb-3">Request:</p>
      <CodeBlock class="mb-3">{ "inputs": { "length": "20" } }</CodeBlock>

      <p class="mb-3">Response:</p>
      <CodeBlock class="mb-3"
        >Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nulla vitae sagittis lorem. Fusce auctor euismod
        arcu...</CodeBlock
      >

      <h3 class="mt-6 mb-3 border-gray-100 border-b py-2 font-mono">GET /fn</h3>
      <p class="mb-3">List all functions associated with an account (requires log in first)</p>
    </main>
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
