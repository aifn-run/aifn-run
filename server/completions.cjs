const { randomUUID } = require("crypto");
const { request } = require("https");
const { readBody, log, onError } = require("./utils.cjs");

const apiUrl = process.env.API_URL;
const apiKey = process.env.API_KEY;
const apiModel = process.env.API_MODEL;
const systemMessage = process.env.SYSTEM_MESSAGE;

const completionOptions = {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: "Bearer " + apiKey,
  },
};

const Resource = require("./resource.cjs");
const queryHistory = new Resource("history");

function replaceMarkers(text, input) {
  if (typeof input === "string") {
    return text + input;
  }

  return text.replace(/\{([\s\S]+?)\}/g, (_, item) => input[item.trim()] || "");
}

async function fetchCompletion(fn, input) {
  const functionPrompt = fn.p;
  const uid = fn.uid;
  const model = fn.model || apiModel;

  return new Promise((resolve, reject) => {
    const remote = request(apiUrl, completionOptions);
    const content = replaceMarkers(functionPrompt, input);
    const payload = {
      model,
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content },
      ],
    };

    remote.on("error", (error) => {
      log(input, model, error);
      onError(error);
      reject();
    });

    remote.on("response", async (ai) => {
      const buffer = await readBody(ai);

      if (ai.statusCode !== 200) {
        reject();
        log(`${ai.statusCode}: ${ai.statusMessage}`, buffer);
        return;
      }

      const json = JSON.parse(buffer);
      const text = json.choices[0].message.content;
      resolve(text);

      queryHistory.set(randomUUID(), { uid, input: content, output: text });
    });

    remote.write(JSON.stringify(payload));
    remote.end();
  });
}

module.exports = { fetchCompletion };
