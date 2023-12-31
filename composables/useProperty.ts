import { Ref, onMounted, ref } from "vue";
import { useAuth } from "./useAuth";

const properties: Record<string, Ref<string>> = {};
type SetProperty = (value: string) => void;

export function useProperty(property: string): [Ref<string>, SetProperty] {
  const p = properties[property] || (properties[property] = ref<string>(""));
  const { getProperty, setProperty } = useAuth();

  const set = (value: string) => {
    p.value = value;
    setProperty("aifn:" + property, value);
  };

  onMounted(async () => {
    const currentValue = await getProperty("aifn:" + property);
    p.value = currentValue.value;
  });

  return [p, set];
}
