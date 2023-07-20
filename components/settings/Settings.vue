<template>
  <div>
    <h1 class="text-2xl font-bold mb-6">Settings</h1>
    <form>
      <div class="mb-4" v-for="setting of settingList">
        <label
          :for="setting.key"
          class="block uppercase text-xs font-medium text-gray-100"
          >{{ setting.label }}</label
        >
        <input
          :id="setting.key"
          v-model="setting.ref.value"
          type="text"
          class="mt-1 p-2 block w-full rounded-md border border-gray-300 shadow-sm text-gray-700 font-bold"
        />
      </div>
    </form>
  </div>
</template>

<script setup>
import { watch, ref } from "vue";
import { useProperty } from "../../composables/useProperty";

function debounce(func, delay) {
  let timeoutId;

  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
}

const properties = ["gptApiKey"];
const settingList = properties.map((key) => {
  const label = key.replace(/[A-Z]{1}/g, (c) => " " + c);
  const [current, setProperty] = useProperty(key);
  const reference = ref(current.value);

  watch(() => reference.value, debounce(setProperty, 1000));
  watch(
    () => current.value,
    (v) => (reference.value = v)
  );

  return { ref: reference, label, key };
});
</script>
