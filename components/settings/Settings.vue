<template>
  <div>
    <h1 class="text-2xl font-bold mb-6">My Functions</h1>
    <div class="flex my-4 border border-gray-200 rounded-lg">
      <div class="w-3/4">
        <textarea
          class="font-mono my-4 p-2 border border-gray-400 bg-gray-800 rounded-lg w-full h-half mb-4"
          v-model="code"
        ></textarea>
      </div>
      <div class="w-1/4 bg-gray-100">
        <ul>
          <li v-for="fn of functions">
            <a href="#" @click.prevent="loadItem(fn)">{{
              fn.name || fn.uid
            }}</a>
          </li>
        </ul>
      </div>
    </div>
    <hr />
    <form @submit.prevent="save()">
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
        <button class="border border-white px-4 py-2" type="submit">
          Save
        </button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { onMounted, ref } from "vue";
import { useSettings } from "../../composables/useSettings";

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
const properties = ["gptApiKey"];
const functions = ref([]);

function loadFunctions() {
  const req = await fetch("/fn", { credentials: "include" });
  const list = await req.json();

  functions.value = list;
}

function onChange(key, value) {
  settings.value[key] = value;
}

onMounted(loadSettings);
onMounted(loadFunctions);

const settingList = properties.map((key) => {
  const label = key.replace(/[A-Z]{1}/g, (c) => " " + c);
  return { label, key };
});
</script>
