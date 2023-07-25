<template>
  <div>
    <h1 class="text-2xl font-bold mb-6">My Functions</h1>
    <div class="flex my-8 border border-gray-200 rounded-lg overflow-hidden">
      <form class="w-3/4 p-4" @submit.prevent="saveItem()">
        <div class="mb-4">
          <label
            for="fnName"
            class="block uppercase text-xs font-medium text-gray-100 mb-2"
            >Name
          </label>
          <input
            id="fnName"
            v-model="fn.name"
            type="text"
            class="font-mono my-4 p-2 border border-gray-400 bg-gray-800 rounded-md w-full mb-4"
          />
        </div>
        <div class="mb-4">
          <label
            for="fnBody"
            class="block uppercase text-xs font-medium text-gray-100 mb-2"
            >Instruction (required)</label
          >

          <textarea
            id="fnBody"
            class="font-mono my-4 p-2 border border-gray-400 bg-gray-800 rounded-md w-full h-half mb-4"
            v-model="fn.p"
          ></textarea>
          <p class="text-sm">
            Tip: use curly brackets to create input {placeholders}.
          </p>
        </div>
        <div class="text-right">
          <button
            class="border border-white px-4 py-2 rounded-md"
            :disabled="busy"
            type="submit"
          >
            {{ fn.uid ? "Save" : "Create" }}
          </button>
        </div>
        <hr class="my-4" />
        <p class="text-sm">Use this function as a module:</p>
        <div class="font-mono p-4 rounded border border-gray-600 bg-gray-800">
          <span class="hljs-keyword">import</span>
          {{ fn.name }}
          <span class="hljs-keyword">from</span>
          <span class="hljs-string">'https://aifn.run/fn/{{ fn.uid }}.js'</span
          >;
        </div>
      </form>
      <div class="w-1/4 bg-gray-600 border-gray-200 border-l">
        <ul>
          <li v-for="fn of functions">
            <a
              href="#"
              class="text-sm px-4 py-2 block border-gray-200 border-b overflow-ellipsis overflow-hidden whitespace-nowrap"
              @click.prevent="editItem(fn)"
              >{{ fn.name || fn.uid }}</a
            >
          </li>

          <li>
            <a
              href="#"
              class="text-sm px-4 py-2 block border-gray-200 border-b overflow-ellipsis overflow-hidden whitespace-nowrap"
              @click.prevent="editItem({})"
              >New function...</a
            >
          </li>
        </ul>
      </div>
    </div>
    <hr class="my-8" />
    <form @submit.prevent="save()" v-if="settingList.length">
      <div class="mb-4" v-for="setting of settingList">
        <label
          :for="setting.key"
          class="block uppercase text-xs font-medium text-gray-100"
          >{{ setting.label }}</label
        >
        <input
          :id="setting.key"
          :value="settings[setting.key]"
          @change="onChange(setting.key, $event.target.value)"
          type="text"
          class="mt-1 p-2 block w-full rounded-md border border-gray-300 shadow-sm text-gray-700 font-bold"
        />
      </div>
      <div class="text-right">
        <button class="border border-white px-4 py-2 rounded-md" type="submit">
          Save
        </button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { onMounted, ref } from "vue";
import { useSettings } from "../../composables/useSettings";
import { useFunctions } from "../../composables/useFunctions";

// function debounce(func, delay) {
//   let timeoutId;

//   return function (...args) {
//     clearTimeout(timeoutId);
//     timeoutId = setTimeout(() => {
//       func.apply(this, args);
//     }, delay);
//   };
// }

const { settings, load: loadSettings, save } = useSettings();
const { listFunctions, saveFunction } = useFunctions();
const functions = ref([]);
const fn = ref({});
const busy = ref(false);

async function loadFunctions() {
  functions.value = await listFunctions();
}

async function editItem(item) {
  const { uid, p, name } = item;
  fn.value = { uid, p, name };
}

async function saveItem() {
  const { uid, p, name } = fn.value;

  if (!p) {
    return;
  }

  busy.value = true;

  await saveFunction({ uid, p, name });
  await loadFunctions();

  busy.false = true;
}

function onChange(key, value) {
  settings.value[key] = value;
}

onMounted(loadSettings);
onMounted(loadFunctions);

// const properties = ["gptApiKey"];
const properties = [];
const settingList = properties.map((key) => {
  const label = key.replace(/[A-Z]{1}/g, (c) => " " + c);
  return { label, key };
});
</script>
