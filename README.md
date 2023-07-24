# AI as a function

Integrate AI with your code like any other function, no build steps required!

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

`Async Functions` and `ES Modules` are widely supported by browsers and can also be used to mix AI and Javascript.

One-off AI completions can help with many simples tasks, from content generation to text edition, moderation, and anything in between.

## Usage

First, go to [aifn.run](https://aifn.run) and sign in to get an API KEY.

Next, just import the module via https in a project and start using it!

```ts
import ai from 'https://aifn.run/ai.mjs';
```

## API

### `POST /fn`

Create a function

Request:
```json
{ "p": "Print a Lorem Ipsum paragraph with at most {length} words" }
```

Response:
```json
{ "uid": "function-id" }
```

### `PUT /fn/:uid`

Update a function

Request:
```json
{ "p": "Print a Lorem Ipsum paragraph with at most {length} words and only lowercase words" }
```

### `GET /fn/:uid.js`

Get a Javascript module with the code to call a function

```ts
import loremIpsum from 'https://aifn.run/fn/[uid].js';

console.log(await loremIpsum({ length: 20 }));
```

### `POST /run/[uid]`

Run a function using a function ID

Request:
```json
{ "inputs": { "length": "20" } }
```

Response:
```text
Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nulla vitae sagittis lorem. Fusce auctor euismod arcu...
```

### `GET /fn`

List all functions associated with an account (requires log in first)
