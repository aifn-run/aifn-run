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
            class="font-mono my-4 p-2 border border-gray-400 bg-gray-800 rounded-md w-full h-40 mb-4"
            v-model="fn.p"
          ></textarea>
          <p class="text-sm">
            Tip: you can use curly brackets to create input {placeholders}. The
            function input will be an object to replace in the text.
          </p>
          <p class="text-sm">
            If the function input is just text, it will be appended to the
            function prompt instead.
          </p>
        </div>
        <div class="text-right">
          <button
            class="text-white bg-blue-500 shadow-lg border border-blue-400 font-bold text-lg py-1 px-4 rounded flex mx-auto"
            :disabled="busy"
            type="submit"
          >
            {{ fn.uid ? "Save" : "Create" }}
          </button>
        </div>
        <template v-if="fn.uid">
          <hr class="my-4" />
          <p class="text-sm mb-2">Use this function as a module:</p>
          <div class="font-mono p-4 rounded border border-gray-600 bg-gray-800">
            <span class="hljs-keyword">import</span>
            {{ fn.name }}
            <span class="hljs-keyword">from </span>
            <span class="hljs-string"
              >'https://aifn.run/fn/{{ fn.uid }}.js'</span
            >;
          </div>
          <hr class="my-4" />
          <div class="mb-4">
            <p class="text-sm">Try this function (save it first!):</p>
            <label
              for="fnInput"
              class="block uppercase text-xs font-medium text-gray-100 mb-2"
              >Function inputs</label
            >
            <textarea
              id="fnInput"
              class="font-mono my-4 p-2 border border-gray-400 bg-gray-800 rounded-md w-full h-half"
              v-model="fnInput"
            ></textarea>
            <p class="text-sm">
              Tip: use regular JS objects for input, or plain text.
            </p>
          </div>
          <div
            v-if="output.length"
            class="font-mono my-4 p-2 bg-gray-800 rounded-md"
          >
            <div class="mb-2 border-gray-400 border-b" v-for="next of output">
              {{ next }}
            </div>

            <div class="mb-2 border-gray-400 border-b" v-if="running">
              <span class="material-icons animate-spin">autorenew</span>
            </div>
          </div>
          <div class="text-right">
            <button
              :disabled="running"
              @click="runFunction(fn.uid)"
              class="border border-white px-4 py-2 rounded-md"
            >
              <span class="material-icons" :class="running && 'animate-spin'">{{
                running ? "refresh" : "play_arrow"
              }}</span>
              <span>Run</span>
            </button>
          </div>
        </template>
      </form>
      <div class="w-1/4 bg-gray-600 border-gray-200 border-l">
        <ul class="h-max-half overflow-y-scroll">
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

  const newId = await saveFunction({ uid, p, name });
  await loadFunctions();

  busy.false = true;
  fn.value.uid = newId;
}

const fnInput = ref("");
const output = ref([]);

async function runFunction(uid) {
  const fn = `
  import fn from 'https://aifn.run/fn/${uid}.js';

  async function runExample() {
    try {
      console.log(await fn(${fnInput.value}))
    } catch (e) {
      console.log(e.message);
    }
  }

  runExample()`;

  const s = document.createElement("script");
  s.type = "module";
  s.onerror = (e) => console.log(String(e));
  s.innerHTML = fn;

  running.value = true;
  document.head.append(s);
}

console.log = (text) => {
  output.value.push(text);
  running.value = false;
};

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
<style scoped>
.h-half {
  height: 50vh;
}
.h-max-half {
  max-height: 50vh;
}
</style>
