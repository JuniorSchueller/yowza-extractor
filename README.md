# Yowza Extractor

Yowza Extractor is a pure JavaScript lib made to easily extract relevant content from Next.js RSC Dumps!

# How to install Yowza Extractor?

To install *Yowza* it's very simple! Just run the following command on a terminal at your project's directory:
```js
npm i yowza-extractor
```

By doing that **Yowza** will be installed succesfully on your project.

# How do I use it?

To use is very simple too! You just need to call it's main function: ``extract(...)``. You'll need just 2 arguments:
- Content, as a plain string (e.g. the raw text of your RSC dump, read from a file or from a response body)
- Parameters

`extract` is synchronous — it returns the result directly, no `await` needed.

## Basic example

```js
const YowzaExtractor = require('yowza-extractor');
const fs = require('fs');

const dumpContent = fs.readFileSync('./dump.txt', 'utf8');

const result = YowzaExtractor.extract(dumpContent, {
    find: { contains: 'some text' },
    isJsonOutput: true
});

console.log(result);
```

## Multiline example (extracting several RSC chunks at once)

RSC dumps are often a single huge blob with several `id:value` chunks glued together. Use `multiline` with `split-by` and `handle-multiline-split-by` to pull out a clean array of values, with the `id:` prefixes stripped:

```js
const result = YowzaExtractor.extract(dumpContent, {
    find: {
        multiline: {
            'start-after': 'hello\n',
            'end-after': 'world'
        },
        'split-by': ':',
        'handle-multiline-split-by': true
    },
    isJsonOutput: false
});

// result is an array of chunks!
const parsed = result.join('\n');
```

## Parameters

Yowza needs at least one `find` criterion to work (either a matching criterion, `multiline`, or `dangerously-set-line`).

```
- find                          <object>  (required)
  - equals                          <string>
  - different                       <string>
  - contains                        <string>
  - startswith                      <string>
  - endswith                        <string>
  - multiline                       <object>
      - start-before                   <string>  (mutually exclusive with start-after)
      - start-after                    <string>  (mutually exclusive with start-before)
      - end-before                     <string>  (mutually exclusive with end-after, excludes the delimiter from the result)
      - end-after                      <string>  (mutually exclusive with end-before, includes the delimiter in the result)
  - dangerously-set-line            <number>
  - split-by                        <string>   extracts the text after the first occurrence of this delimiter on each matched/returned line
  - handle-multiline-split-by       <boolean>  requires split-by; splits the multiline result into lines and applies split-by to each one, returning an array
- isJsonOutput                  <boolean>  (default: true) if true, the result is run through JSON.stringify before being returned
- silent                        <boolean>  (default: false) if true, suppresses all console.log output from Yowza
```

### Notes on `multiline`

- You must provide exactly one of `start-before` / `start-after`, and exactly one of `end-before` / `end-after`.
- The start boundary uses the **first** occurrence of the delimiter in the content.
- The end boundary uses the **last** occurrence of the delimiter in the content (useful when the same closing pattern repeats several times, e.g. once per item in a list).

### Return values

- Simple `find` matching (`equals`/`different`/`contains`/`startswith`/`endswith`): returns the matching line (a string), or `null` if nothing matched.
- `multiline`: returns the extracted substring (a string), an array of strings if `handle-multiline-split-by` is used, or `null` if the delimiters aren't found in the content.
- `dangerously-set-line`: returns the requested line (a string), or `null` if that line doesn't exist.
- When `isJsonOutput` is `true` (the default), the returned value above is passed through `JSON.parse` before being returned to you.

### Errors

`extract` throws (rather than returning `null`) when:
- `content` isn't a non-empty string, or `params` isn't an object.
- No `find` criteria are provided at all.
- `multiline` is missing a required start or end param, or has both of a mutually exclusive pair.
- `handle-multiline-split-by` is set without `split-by`.

# What is this for?

Well... I originally made it for __extracting relevant response data__ from a platform called "Prepara SP" (an educational platform of São Paulo's education secretary), because all it's data (like courses, tests and essays) are being returned in Next.js RSC stuff, so I needed a useful tool to help me finish my automation fastly and then I made this. By the way, it's being actually used for the original purpose yet... lol.

# License

[MIT License](LICENSE)! Feel free to use it as you want.
