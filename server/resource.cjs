const baseUrl = process.env.STORE_URL;
const fetchOptions = { mode: "cors" };
const fetchHeaders = { headers: { "content-type": "application/json" } };
const idIsMissingError = new Error("Id is missing");

module.exports = class Resource {
  constructor(name) {
    if (!name) {
      throw new Error("Resource name is missing");
    }

    this.resourceUrl = new URL(`${name}/`, baseUrl).toString();
  }

  async list(filters = null) {
    const res = await fetch(this.resourceUrl, fetchOptions);

    if (!res.ok) {
      return [];
    }

    const all = await res.json();
    if (!filters) {
      return all;
    }

    const f = Object.entries(filters);
    let filtered = all;

    while (filtered.length && f.length) {
      const [key, value] = f.shift();
      filtered = filtered.filter((next) => next[key] == value);
    }

    return filtered;
  }

  async get(id = "") {
    if (!id) {
      throw idIsMissingError;
    }

    const url = new URL(id, this.resourceUrl);
    const x = await fetch(url, fetchOptions);

    if (!x) {
      return null;
    }

    return x.json();
  }

  async remove(id = "") {
    if (!id) {
      throw idIsMissingError;
    }

    const url = new URL(id, this.resourceUrl);
    const res = await fetch(url, { ...fetchOptions, method: "DELETE" });

    return res.ok;
  }

  async set(id, payload = {}) {
    const url = new URL(id, this.resourceUrl);
    const res = await fetch(url, {
      ...fetchOptions,
      ...fetchHeaders,
      method: "PUT",
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      return true;
    }

    throw new Error(res.status);
  }
};
