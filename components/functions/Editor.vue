<template>
  <div>
    <form @submit.prevent="saveItem()">
      <div class="mb-4">
        <label
          for="fnName"
          class="block uppercase text-xs font-medium text-gray-100"
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
          class="block uppercase text-xs font-medium text-gray-100"
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
      <div class="flex justify-end my-4">
        <button
          class="text-white bg-transparent shadow-lg border border-red-500 text-lg py-1 px-4 rounded flex mr-8"
          type="button"
          v-if="fn.uid"
          @click="onRemoveFunction()"
        >
          <span class="material-icons">delete</span>
          <span>Delete</span>
        </button>
        <button
          class="text-white bg-blue-500 shadow-lg border border-blue-400 font-bold text-lg py-1 px-4 rounded flex"
          :disabled="busy || !fn.p"
          type="submit"
        >
          <span v-if="busy" class="material-icons animate-spin">refresh</span>
          <span>{{ fn.uid ? "Save" : "Create" }}</span>
        </button>
      </div>
    </form>

    <template v-if="fn.uid">
      <p class="text-sm mb-4">Use this function as a module:</p>
      <div
        class="font-mono p-4 rounded border border-gray-600 bg-gray-800 relative"
      >
        <div class="absolute top-0 right-0 -m-1">
          <button @click="onCopyImport()" class="w-8 h-8">
            <span class="material-icons text-sm">{{
              copied ? "check" : "content_paste"
            }}</span>
          </button>
        </div>
        <div ref="importSnippet">
          <span class="hljs-keyword">import</span>
          {{ fn.name }}
          <span class="hljs-keyword">from </span>
          <span class="hljs-string">'https://aifn.run/fn/{{ fn.uid }}.js'</span
          >;
        </div>
      </div>
      <p class="text-sm my-4">Or copy the function ID:</p>

      <div
        class="font-mono p-4 rounded border border-gray-600 bg-gray-800 relative"
      >
        <div class="absolute top-0 right-0 -m-1">
          <button @click="onCopyId()" class="w-8 h-8">
            <span class="material-icons text-sm">{{
              copied ? "check" : "content_paste"
            }}</span>
          </button>
        </div>
        <div ref="fnIdSnippet" class="text-white font-bold">
          {{ fn.uid }}
        </div>
      </div>

      <div class="mt-8">
        <p class="text-sm mb-2">Try this function (save it first!):</p>
        <label
          for="fnInput"
          class="block uppercase text-xs font-medium text-gray-100"
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
        v-if="output.length || running"
        class="font-mono my-4 p-2 bg-gray-800 rounded-md"
      >
        <div
          class="mb-2 border-gray-400 border-b whitespace-pre-wrap"
          v-for="next of output"
        >
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
          class="border border-white px-4 py-2 rounded-md flex ml-auto"
        >
          <span class="material-icons" :class="running && 'animate-spin'">{{
            running ? "refresh" : "play_arrow"
          }}</span>
          <span>Run</span>
        </button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useProperty } from "../../composables/useProperty";
import { useFunctions } from "../../composables/useFunctions";

const { saveFunction, removeFunction } = useFunctions();

const props = defineProps({
  fn: { type: Object, default: {} },
});
const emit = defineEmits(["update", "remove"]);
const busy = ref(false);
const [model] = useProperty("defaultModel");
const fnInput = ref("");
const output = ref<string[]>([]);
const running = ref(false);
const copied = ref(false);
const importSnippet = ref<any>(null);
const fnIdSnippet = ref<any>(null);

async function saveItem() {
  if (!props.fn) {
    return;
  }

  const { uid, p, name } = props.fn;

  if (!String(p).trim()) {
    return;
  }

  busy.value = true;

  try {
    const body: any = { uid, p, name, model: undefined };

    if (model.value) {
      body.model = model.value;
    }

    const newId = await saveFunction(body);
    props.fn.uid = newId;
    emit("update");
  } finally {
    busy.value = false;
  }
}

async function onRemoveFunction() {
  if (!props.fn?.uid) return;

  if (confirm("Are you sure?")) {
    await removeFunction(props.fn?.uid);
    emit("remove");
  }
}

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

  console.log = (text: string) => {
    output.value.push(text);
    running.value = false;
  };

  const s = document.createElement("script");
  s.type = "module";
  s.onerror = (e) => console.log(String(e));
  s.innerHTML = fn;

  running.value = true;
  document.head.append(s);
}

function onCopyImport() {
  onCopy(importSnippet.value.textContent.trim());
}

function onCopyId() {
  onCopy(fnIdSnippet.value.textContent.trim());
}

async function onCopy(t) {
  await navigator.clipboard.writeText(t);
  copied.value = true;
  setTimeout(() => (copied.value = false), 2000);
}
</script>
