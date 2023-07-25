export function useFunctions() {
  const listFunctions = async () => {
    const req = await fetch("/fn", { credentials: "include" });
    return await req.json();
  };

  const saveFunction = async (fn) => {
    const { uid, p, name } = fn;
    const url = uid ? "/fn/" + uid : "/fn";

    const request = await fetch(url, {
      method: uid ? "PUT" : "POST",
      credentials: "include",
      body: JSON.stringify({ p, name }),
    });

    const response = await request.json();

    return response.uid;
  };

  return { listFunctions, saveFunction };
}
