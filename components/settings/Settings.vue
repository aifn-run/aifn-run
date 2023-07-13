<template>
  <div class="container mx-auto p-4">
    <h1 class="text-2xl font-bold mb-4">Settings</h1>
    <form>
      <div class="mb-4" v-for="setting in settingList">
        <label
          :for="setting.key"
          class="block uppercase text-xs font-medium text-gray-700"
          >{{ setting.label }}</label
        >
        <input
          :id="setting.key"
          v-model="setting.ref.value"
          type="text"
          class="mt-1 p-2 block w-full rounded-md border border-gray-300 shadow-sm"
        />
      </div>
    </form>
  </div>
</template>

<script setup>
import { watch, ref } from "vue";
import { useProperty } from "../../composables/useProperty";

const properties = [];
const settingList = properties.map((key) => {
  const label = key.replace(/[A-Z]{1}/g, (c) => " " + c);
  const [current, setProperty] = useProperty(key);
  const reference = ref(current.value);

  watch(() => reference.value, setProperty);
  watch(
    () => current.value,
    (v) => (reference.value = v)
  );

  return { ref: reference, label, key };
});
</script>
