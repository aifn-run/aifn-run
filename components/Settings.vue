<template>
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
</template>

<script setup>
import { onMounted } from "vue";
import { useSettings } from "../../composables/useSettings";

const { settings, load: loadSettings, save } = useSettings();

onMounted(loadSettings);

const properties = ["gptApiKey"];
const settingList = properties.map((key) => {
  const label = key.replace(/[A-Z]{1}/g, (c) => " " + c);
  return { label, key };
});
</script>
