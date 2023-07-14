# ai.fn for Javascript

Integrate AI with code like any other function

```ts
import ai from 'https://aifn.run/ai.mjs'

const noVerbs = ai.fn({ p: 'Remove all verbs from this paragraph: "{input}"' });
const output = await noVerbs({ input: 'The brown fox jumps over the lazy dog.' });
```