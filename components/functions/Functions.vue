<template>
  <div>
    <h1 class="text-2xl font-bold mb-6 flex items-center justify-between">
      Your Functions
      <button
        class="py-2 px-4 bg-gray-200 text-gray-900 rounded text-base"
        @click.prevent="addFunction()"
      >
        new function
      </button>
    </h1>
    <div class="my-8 border border-gray-200 rounded-lg overflow-hidden">
      <div
        class="p-4 flex items-center justify-center"
        v-if="!functions.length"
      >
        <div class="text-center my-4">
          <span class="material-icons text-4xl block mb-8">functions</span>
          <span class="text-2xl">Select a function or create a new one</span>
        </div>
      </div>

      <div v-for="fn of functions" class="px-4 border-b border-gray-200">
        <button
          @click.prevent="onToggle(fn)"
          class="flex items-center justify-between w-full py-4"
        >
          <span class="font-mono">{{
            (fn.tmp && fn.tmp.name) || fn.fn.name || fn.fn.uid
          }}</span>
          <span class="material-icons"
            >{{ (fn.editing && "close") || "expand_more" }}
          </span>
        </button>
        <Editor
          v-if="fn.editing"
          class="my-4"
          :fn="fn.tmp"
          @remove="loadFunctions()"
          @update="onUpdate(fn)"
        ></Editor>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useFunctions } from "../../composables/useFunctions";
import type { FunctionBody } from "../../composables/useFunctions";
import Editor from "./Editor.vue";

const { listFunctions } = useFunctions();

const functions = ref<
  Array<{ fn: FunctionBody; tmp: FunctionBody; editing: boolean }>
>([]);

function onToggle(fn) {
  if (fn.editing) {
    return (fn.editing = false);
  }

  fn.tmp = { ...fn.fn };
  fn.editing = true;
}

function addFunction() {
  const fn = { p: "", name: "-" };
  functions.value.unshift({ fn, tmp: fn, editing: true });
}

async function loadFunctions() {
  const list = await listFunctions();
  functions.value = list.map((fn: any) => ({
    fn,
    tmp: {},
    editing: false,
  }));
}

function onUpdate(item) {
  item.fn = item.tmp;
}

onMounted(loadFunctions);
</script>
