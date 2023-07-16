<template>
  <div class="font-mono my-4 p-2 border border-gray-400 rounded-lg w-full mb-4" ref="code">
    <slot></slot>
  </div>
</template>

<script setup>
import { hightlight } from 'https://highlight.jsfn.run/index.js';

const code = ref(null);
const props = defineProps({
  lang: { type: String, default: 'javascript' }
})

let embed = '1';
onMounted(async () => {
  code.innerHTML = await hightlight(code.textContent.trim(), { language: props.lang, embed });
  embed = '';
});
</script>