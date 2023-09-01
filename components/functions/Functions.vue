<template>
  <div>
    <h1 class="text-2xl font-bold mb-6 flex items-center justify-between">
      Your Functions
      <button class="p-4 flex items-center" @click.prevent="addFunction()">
        <span class="material-icons">add</span>
        New function
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
        <div class="flex items-center justify-between">
          <button @click="fn.editing || editItem(fn)">
            <span class="font-mono">{{
              (fn.tmp && fn.tmp.name) || fn.item.name || fn.item.uid
            }}</span>
          </button>
          <button
            @click.prevent="
              (fn.editing && (fn.editing = false)) || editItem(fn)
            "
            class="p-2"
          >
            <span class="material-icons"
              >{{ (fn.editing && "close") || "expand_more" }}
            </span>
          </button>
        </div>
        <Editor
          v-if="fn.editing"
          class="mt-4"
          :fn="fn.tmp"
          @remove="loadFunctions()"
          @update="onUpdate(fn)"
        ></Editor>
        {{ fn }}
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
  Array<{ item: FunctionBody; tmp: FunctionBody; editing: boolean }>
>([]);

async function editItem(item) {
  item.tmp = { ...item.fn };
  item.editing = true;
}

function addFunction() {
  const fn = { p: "", name: "-" };
  functions.value.push({ item: fn, tmp: fn, editing: true });
}

async function loadFunctions() {
  const list = await listFunctions();
  functions.value = list.map((fn) => ({
    item: fn,
    tmp: { ...fn },
    editing: false,
  }));
}

function onUpdate(item) {
  item.fn = item.tmp;
}

onMounted(loadFunctions);
</script>
