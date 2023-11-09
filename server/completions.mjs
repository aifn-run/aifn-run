import { request } from "https";
import { readBody, log, onError } from "./utils.mjs";

const apiChatUrl = process.env.API_CHAT_URL;
const apiPromptUrl = process.env.API_PROMPT_URL;
const apiKey = process.env.API_KEY;
const apiModel = process.env.API_MODEL;
const systemMessage = process.env.SYSTEM_MESSAGE || "";
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

function createPayload(model, content, format) {
  switch (format) {
    case "prompt":
      const prompt = systemMessage + "\n" + content;
      return {
        model,
        n: 1,
        max_tokens: 4080 - prompt.length,
        prompt: prompt,
      };

    case "chat":
      return {
        model,
        messages: [
          systemMessage && { role: "system", content: systemMessage },
          { role: "user", content },
        ].filter(Boolean),
      };

    default:
      return {};
  }
}

function readCompletion(json, format) {
  switch (format) {
    case "prompt":
      return json.choices.map((m) => m.text).join("\n");

    case "chat":
      return json.choices.map((m) => m.message.content).join("\n");

    default:
      return "";
  }
}

export async function fetchCompletion(fn, input) {
  const functionPrompt = fn.p;
  const model = fn.model || apiModel;
  const format = fn.format || apiFormat;
  const apiUrl = format === "chat" ? apiChatUrl : apiPromptUrl;

  return new Promise((resolve, reject) => {
    const remote = request(apiUrl, completionOptions);
    const content = replaceMarkers(functionPrompt, input);
    const payload = createPayload(model, content, format);

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
      const text = readCompletion(json, format);
      resolve(text);
    });

    remote.write(JSON.stringify(payload));
    remote.end();
  });
}
