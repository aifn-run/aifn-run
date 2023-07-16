<template>
  <div class="font-mono my-4 p-2 border border-gray-400 bg-gray-800 rounded-lg w-full mb-4" ref="code">
    <slot></slot>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { highlight } from 'https://highlight.jsfn.run/index.js';

const code = ref(null);
const props = defineProps({
  lang: { type: String, default: 'javascript' }
})

let embed = '1';
onMounted(async () => {
  code.innerHTML = await highlight(code.textContent.trim(), { language: props.lang, embed });
  embed = '';
});
</script>