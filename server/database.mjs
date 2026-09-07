const databaseURL = process.env.DATABASE_URL;

if (!databaseURL) {
  throw new Error("DATABASE_URL is required");
}

let parsedURL;

try {
  parsedURL = new URL(databaseURL);
} catch {
  throw new Error("DATABASE_URL must be a valid module URL");
}

if (!["http:", "https:"].includes(parsedURL.protocol)) {
  throw new Error("DATABASE_URL must use HTTP or HTTPS");
}

const imported = await import(parsedURL.href);
const database = imported.default || imported;

for (const operation of ["get", "run", "all"]) {
  if (typeof database[operation] !== "function") {
    throw new Error(`DATABASE_URL module must export ${operation}()`);
  }
}

export const { get, run, all } = database;
export const pragma = typeof database.pragma === "function" ? database.pragma : () => {};
export default database;
