import { randomUUID } from "crypto";
import { request } from "https";
import { readBody, log, onError } from "./utils.mjs";

const apiUrl = process.env.API_URL;
const apiKey = process.env.API_KEY;
const apiModel = process.env.API_MODEL;
const systemMessage = process.env.SYSTEM_MESSAGE;
const apiFormat = process.env.API_FORMAT;

const completionOptions = {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: "Bearer " + apiKey,
  },
};

function replaceMarkers(text, input) {
  if (typeof input === "string") {
    return text + input;
  }

  return text.replace(/\{([\s\S]+?)\}/g, (_, item) => input[item.trim()] || "");
}

function createPayload() {
  switch (apiFormat) {
    case "prompt":
      return systemMessage + "\n" + content;

    case "chat":
      return {
        model,
        messages: [
          { role: "system", content: systemMessage },
          { role: "user", content },
        ],
      };
  }
}
export async function fetchCompletion(fn, input) {
  const functionPrompt = fn.p;
  const model = fn.model || apiModel;

  return new Promise((resolve, reject) => {
    const remote = request(apiUrl, completionOptions);
    const content = replaceMarkers(functionPrompt, input);
    const payload = createPayload(model, content);

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
    });

    remote.write(JSON.stringify(payload));
    remote.end();
  });
}
