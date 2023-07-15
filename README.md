# AI prompts as a Javascript service

Integrate AI with code like any other function

```ts
import ai from 'https://aifn.run/ai.mjs'

await ai.configure("__AIFN_KEY__");
const noVerbs = await ai.fn({ p: 'Remove all verbs from this paragraph: "{input}"' });

export async function removeVerbsFromText(text: string) {
  return await noVerbs({ input: text });
}

console.log(await removeVerbsFromText('The brown fox jumps over the lazy dog.'));
// "The brown fox over the lazy dog"
```

## Motivation

Calling AI generation API's still needs boilerplate.
In a single module, all the code required to call an API, get a JSON, find the message and print it out is abstracted away.

`Async Functions` in Javascript, along with `ES Modules`, are widely supported by browsers and can also be easily used in Node.

What if we could use what the language already provides us, to integrate AI into regular JS code?

## Usage

First, to [aifn.run](https://aifn.run) to get your API KEY.

Next, just import the module in your project and start using it!

```ts
import ai from 'https://aifn.run/ai.mjs';
```

## API

### `POST /fn`

Request:
```json
{ "p": "Print a Lorem Ipsum paragraph with {length} words" }
```

Response:
```json
{ "uid": "unique-function-id" }
```

### `GET /fn/[uid].js`

Get a Javascript module with the code to call a function

```ts
import loremIpsum from 'https://aifn.run/fn/[uid].js';

console.log(await loremIpsum({ length: 100 }));
```

### `POST /run/[uid]`

Request:
```json
{ "inputs": { "length": "100" } }
```

Response:
```text
Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nulla vitae sagittis lorem. Fusce auctor euismod arcu...
```
