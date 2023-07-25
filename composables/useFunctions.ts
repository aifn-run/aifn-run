export function useFunctions() {
  const listFunctions = async () => {
    const req = await fetch("/fn", { credentials: "include" });
    return await req.json();
  };

  const saveFunction = async (f) => {
    const { uid, p, name } = f;

    await fetch("/fn/" + uid, {
      method: "PUT",
      credentials: "include",
      body: JSON.stringify({ p, name }),
    });
  };

  return { listFunctions, saveFunction };
}
