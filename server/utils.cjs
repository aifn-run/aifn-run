const { randomUUID } = require("crypto");
const Resource = require("./resource.cjs");

const logs = new Resource("log");
const errors = new Resource("log");

function onError(error) {
  errors.set(Date.now(), error);
}

const logEnabled = !!process.env.DEBUG;
function log(...args) {
  if (!logEnabled) return;

  const time = Date.now();
  const uid = randomUUID();
  console.log(...args);
  logs.set(uid, { uid, time, body: args.length > 1 ? args : args[0] });
}

function readBody(stream) {
  return new Promise((resolve) => {
    const a = [];
    stream.on("data", (c) => a.push(c));
    stream.on("end", () => {
      const buffer = Buffer.concat(a).toString("utf-8");
      resolve(buffer);
    });
  });
}

module.exports = { readBody, log, onError };
