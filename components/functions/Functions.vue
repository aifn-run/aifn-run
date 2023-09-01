<template>
  <div>
    <h1 class="text-2xl font-bold mb-6 flex items-center justify-between">
      Your Functions
      <button
        class="p-4 block border-gray-200 border-b text-right w-full"
        @click.prevent="addFunction()"
      >
        <span class="material-icons">add</span>
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

      <div
        v-for="fn of functions"
        @click="fn.editing || editItem(fn)"
        class="px-4 border-b border-gray-200"
      >
        <div class="flex items-center justify-between">
          <span class="font-mono">{{
            (fn.tmp && fn.tmp.name) || fn.item.name || fn.item.uid
          }}</span>
          <button
            @click.prevent="fn.editing && (fn.editing = false)"
            class="p-2"
          >
            <span class="material-icons"
              >{{ (fn.editing && "close") || "arrow_down" }}
            </span>
          </button>
        </div>
        <Editor
          v-if="fn.editing"
          class="pt-2 mt-2 border-t border-gray-200"
          :fn="fn.tmp"
          @remove="loadFunctions()"
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
  Array<{ item: FunctionBody; tmp: Partial<FunctionBody>; editing: boolean }>
>([]);

async function editItem(item) {
  const { uid = "", p = "", name = "" } = item;
  item.tmp = { uid, p, name };
  item.editing = true;
}

function addFunction() {
  functions.value.push({ item: { p: "", name: "" }, tmp: {}, editing: true });
}

async function loadFunctions() {
  const list = await listFunctions();
  functions.value = list.map((fn) => ({
    item: fn,
    tmp: { ...fn },
    editing: false,
  }));
}

onMounted(loadFunctions);
</script>
