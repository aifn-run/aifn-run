<template>
  <div class="font-mono my-4 p-4 bg-gray-100 text-gray-900 rounded overflow-scroll" ref="code">
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

let isEmbedded = true;
onMounted(async () => {
  const embed = isEmbedded ? '1' : '';
  isEmbedded = false;
  const node = code.value.querySelector('pre') || code.value;
  node.innerHTML = await highlight(node.textContent.trim(), { language: props.lang, embed });
});
</script>
