export function useFunctions() {
  const listFunctions = async () => {
    const req = await fetch("/fn", { credentials: "include" });
    return await req.json();
  };

  const saveFunction = async (fn) => {
    const { uid, p, name, model } = fn;
    const url = uid ? "/fn/" + uid : "/fn";

    const request = await fetch(url, {
      method: uid ? "PUT" : "POST",
      credentials: "include",
      body: JSON.stringify({ p, name, model }),
    });

    const response = await request.json();

    return response.uid;
  };

  const removeFunction = async (uid) => {
    const request = await fetch("/fn/" + uid, {
      method: "DELETE",
      credentials: "include",
    });

    return request.ok;
  };

  return { listFunctions, saveFunction, removeFunction };
}
