# ttypescript

## What it is
Currently TypeScript doesn't support custom transformers in the tsconfig.json, but supports it programmatically.

And there is no way to compile your files using custom transformers using `tsc` command.

TTypescript (Transformer TypeScript) solves this problem by patching on the fly the compile module to use transformers from `tsconfig.json`.

TTypescript is a drop-in replacement for all typescript modules, located in ``` node_modules/typescript/lib ``` directory:

```ts
import * as ts from 'ttypescript'
import * as tsServer from 'ttypescript/lib/tsserver'
import * as watchGuard from 'ttypescript/lib/watchGuard'
```

In command line, instead of tsc and tsserver, use ttsc and ttsserver wrappers.

No version lock-ins - typescript used as peer dependency.

## How to install

```
npm i ttypescript -D
```

ttypescript uses your installed `typescript` in your `node_modules`

## How to use

### tsconfig.json

Set a transformer path to the `tsconfig.json` in `compilerOptions` section `plugin` array:
```
{
    "compilerOptions": {
        "plugins": [
            { "transform": "transformer-module" },
        ]
    }
}
```

plugin entries described by `PluginConfig`:

```ts
interface PluginConfig {
    transform?: string; // path to transformer
    type?: 'program' | 'checker' | 'raw' | 'compilerOptions' | 'config';  // decribed below
    after?: boolean; // should transformer applied after all ones
    before?: boolean; // should transformer applied before all ones
    afterDeclaration?: boolean; // transformer for d.ts files, supports from TS2.9
    [options: string]: any; // any other properties provided to the transformer as config argument
}

export type TransformerPlugin = TransformerBasePlugin | ts.TransformerFactory<ts.SourceFile>;
```

You just need to add the `transform` block with optional `type`, `after`, `afterDeclaration` and plugin-related options.

`transform` can accept npm module or local file path (.ts or .js) related to `tsconfig.json`


### PluginConfig.type
Because currently transformers can run only programmatically, most of them use factory wrapper with different signatures.
For the possible to work with any of them you can specify `type` in the plugin config
By default will be used `program`
#### program 
If the transformer has a factory signature using `program` as first argument: 
```ts
(program: ts.Program, config?: PluginConfig) => ts.TransformerFactory
```
use type `program` in the plugin config `{ "transform": "transformer-module", "type": "program" }`


#### config
for the signature with transformer's config:
```ts
(config: any) => ts.TransformerFactory
```

#### checker
```ts
(checker: ts.TypeChecker, config?: PluginConfig) => ts.TransformerFactory
```

#### raw
for the signature without factory wrapper:
```ts
ts.TransformerFactory
```

#### compilerOptions
```ts
(compilerOptions: ts.CompilerOptions, config?: PluginConfig) => ts.TransformerFactory
```

Don't forget to exclude your transformers in the tsconfig.json

```json
{
    "compilerOptions": {
        "plugins": [
            { "transform": "transformer-module", "someOption1": 123, "someOption2": 321 },
            { "transform": "./transformers/my-transformer.ts" },
            { "transform": "transformer-module", "after": true },
            { "transform": "transformer-module", "afterDeclaration": true },
            { "transform": "transformer-module", "type": "ls" }
        ]
    },
    "exclude": ["node_modules", "transformers/**/*"]
}
```

### Command line

Like usual `tsc`, all arguments work the same way.
```
ttsc
```


### ts-node

```
ts-node --compiler ttypescript index.ts
or
ts-node -C ttypescript index.ts
```

### Webpack
```js
    {
        test: /\.(ts|tsx)$/,
        loader: require.resolve('awesome-typescript-loader'),
        // or
        loader: require.resolve('ts-loader'),
        options: {
            compiler: 'ttypescript'
        }
    }
```

### Rollup
```js
// rollup.config.js
import ttypescript from 'ttypescript'
import tsPlugin from 'rollup-plugin-typescript2'

export default {
    // ...
    plugins: [
        // ...
        tsPlugin({
            typescript: ttypescript
        })
    ]
}
```

### VC Code
If you want to compile your project with VC Code task runner you need to overwrite the config `typescript.tsdk` to path of the installed `ttypescript`: 
```
"typescript.tsdk": "/usr/local/lib/node_modules/ttypescript/lib",
or 
"typescript.tsdk": "node_modules/ttypescript/lib",
```

## Transformers

You can use transformers written in ts or js

```ts
// transformer1-module
import * as ts from 'typescript'
export default function (program: ts.Program, pluginOptions: {}) {
    return (ctx: ts.TransformationContext) => {
        return (sourceFile: ts.SourceFile) => {
            return sourceFile;
        }
    }
}
```

Examples of transformers

[`{transform: "ts-transformer-keys", type: "program"}`](https://github.com/kimamula/ts-transformer-keys) 

[`{transform: "ts-transformer-enumerate", type: "program"}`](https://github.com/kimamula/ts-transformer-enumerate)

[`{transform: "ts-transform-graphql-tag", type: "program"}`](https://github.com/firede/ts-transform-graphql-tag) 

[`{transform: "ts-transform-img", type: "config"}`](https://github.com/longlho/ts-transform-img) 

[`{transform: "ts-transform-css-modules", type: "config"}`](https://github.com/longlho/ts-transform-css-modules) 

[`{transform: "ts-transform-react-intl", type: "config"}`](https://github.com/longlho/ts-transform-react-intl) 

[`{transform: "ts-nameof", type: "raw"}`](https://github.com/dsherret/ts-nameof) 

[Tutorial how to write a typescript transformer](https://dev.doctorevidence.com/how-to-write-a-typescript-transform-plugin-fc5308fdd943)


## Example
An example project is in the `example` directory

## License
MIT License
