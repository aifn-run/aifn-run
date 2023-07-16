<template>
  <div class="font-mono my-4 p-4 rounded overflow-scroll border border-gray-600 bg-gray-800" ref="code">
    <slot></slot>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { highlight } from 'https://highlight.jsfn.run/index.js';

const code = ref(null);
const props = defineProps({
  lang: { type: String, default: 'javascript' },
});

onMounted(async () => {
  const node = code.value.querySelector('pre') || code.value;
  node.innerHTML = await highlight(node.textContent.trim(), { language: props.lang });
});
</script>
