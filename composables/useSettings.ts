import { ref } from "vue";

export function useSettings() {
  const settings = ref({});
  const path = "/settings";

  async function load() {
    const s = await fetch(path);
    const t = await s.json();
    Object.assign(settings.value, t);
  }

  async function save() {
    return fetch(path, { method: "PUT", body: JSON.stringify(settings.value) });
  }

  return { load, save, settings };
}
