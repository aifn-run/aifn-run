<template>
  <div class="space-x-8" ref="page">
    <main>
      <h1 class="text-2xl font-bold mb-6">Javascript API</h1>

      <h2 id="create" class="text-lg my-4">Create a function</h2>
      <CodeBlock>
        <pre v-pre>// with just a prompt
const f = await ai.fn('text for prompt');

// with a prompt and a name
const g = await ai.fn({ p: 'text for prompt', name: 'lorem' });</pre>
      </CodeBlock>

      <h2 id="use" class="text-lg my-4">Use an AI function</h2>
      <CodeBlock>const result = await f('input for AI to process');</CodeBlock>
      <h2>HTTP API</h2>
<h3><code>POST /fn</code></h3>
<p>Create a function</p>
<p>Request:</p>
<pre><code class="language-json">{ &quot;p&quot;: &quot;Print a Lorem Ipsum paragraph with at most {length} words&quot; }
</code></pre>
<p>Response:</p>
<pre><code class="language-json">{ &quot;uid&quot;: &quot;function-id&quot; }
</code></pre>
<h3><code>PUT /fn/:uid</code></h3>
<p>Update a function</p>
<p>Request:</p>
<pre><code class="language-json">{ &quot;p&quot;: &quot;Print a Lorem Ipsum paragraph with at most {length} words and only lowercase words&quot; }
</code></pre>
<h3><code>GET /fn/:uid.js</code></h3>
<p>Get a Javascript module with the code to call a function</p>
<pre><code class="language-ts">import loremIpsum from 'https://aifn.run/fn/[uid].js';

console.log(await loremIpsum({ length: 20 }));
</code></pre>
<h3><code>POST /run/[uid]</code></h3>
<p>Run a function using a function ID</p>
<p>Request:</p>
<pre><code class="language-json">{ &quot;inputs&quot;: { &quot;length&quot;: &quot;20&quot; } }
</code></pre>
<p>Response:</p>
<pre><code class="language-text">Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nulla vitae sagittis lorem. Fusce auctor euismod arcu...
</code></pre>
<h3><code>GET /fn</code></h3>
<p>List all functions associated with an account (requires log in first)</p>
    </main>
    <!-- <aside class="w-1/4">
      <nav class="flex flex-col">
        <a href="#" class="px-4 py-2 text-underline" v-nav="'create'">Create a function</a>
        <a href="#" class="px-4 py-2 text-underline" v-nav="'use'">Use an AI function</a>
      </nav>
    </aside> -->
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
