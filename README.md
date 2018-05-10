# ttypescript

## What it is
Currently TypeScript doesn't support custom transformers in the tsconfig.json, but supports it programmatically.

And there is no way to compile your files using custom transformers using `tsc` command.

TTypescript (Transformer TypeScript) solves this problem by patching on the fly the compile module to use transformers from `tsconfig.json`.

## How to install

```
npm i ttypescript -D
```

ttypescript uses your installed `typescript` in your `node_modules`

## How to use

### tsconfig.json

`compilerOptions.plugins` entries described by PluginConfig:

```ts
export type PluginConfig = {
    name?: string
    transform?: string
    type?: FactoryType
    after?: boolean
    before?: boolean
    afterDeclaration?: boolean
    [options: string]: any;
}
```

You just need to add the `transform` block with optional `type`, `after`, `afterDeclaration` and plugin-related options.

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
npx ttsc
```

Be careful `npx ttsc test.ts` like `tsc test.ts` doesn't use your tsconfig.json and transformations won't be applied

### ts-node

```
npx ts-node --compiler ttypescript index.ts
or
npx ts-node -C ttypescript index.ts
```

### Webpack

```js
    {
        test: /\.(ts|tsx)$/,
        include: paths.appSrc,
        loader: require.resolve('ts-loader'),
        options: {
            compiler: 'ttypescript'
        }
    }
```

### VC Code
If you want to compile your project with VC Code task runner you need to overwrite the config `typescript.tsdk` to path of the installed `ttsc`: 
```
"typescript.tsdk": "/usr/local/lib/node_modules/ttypescript/lib",
or 
"typescript.tsdk": "node_modules/ttypescript/lib",
```

## Transformers

You can use transformers written in ts or js

Transformer plugin entry point described in PluginFactory interface:

```ts
export type TransformerPlugin = {
    before?: ts.TransformerFactory<ts.SourceFile>
    after?: ts.TransformerFactory<ts.SourceFile>
    afterDeclaration?: ts.TransformerFactory<ts.SourceFile>
} | ts.TransformerFactory<ts.SourceFile>

export type PluginFactory = {
    type: 'ls'
    (ls: ts.LanguageService, options?: PluginConfig): TransformerPlugin
} | {
    type?: 'program'
    (program: ts.Program, options?: PluginConfig): TransformerPlugin
} | {
    type: 'opts'
    (opts: ts.CompilerOptions, options?: PluginConfig): TransformerPlugin
} | {
    type: 'checker'
    (opts: ts.TypeChecker, options?: PluginConfig): TransformerPlugin
}
```

Multiple plugin formats supported via type modifier from config:

```json
{
    "compilerOptions": {
        "plugins": [
            { "transform": "transformer1-module", "someOpt": 123},
            { "transform": "transformer1-module", "type": "ls" },
            { "transform": "transformer2-module", "type": "opts" },
            { "transform": "transformer3-module", "type": "checker" }
        ]
    }
}
```

Without modifier instance of Program passed as first argument.

```ts
// transformer1-module
import * as ts from 'typescript'
export default function myPlugin(program: ts.Program, pluginOptions: MyPluginOptions | void) {
    // pluginOptions.someOpt === 123

    return {
        before(
            transformationContext: ts.TransformationContext
        ): ts.Transformer<ts.SourceFile> {
            return (sf: ts.SourceFile) => {
                // visitor = ...
                return ts.visitNode(sf, visitor)
            }
        }
    }
}
```

## Example

An example project is in the `example` directory

## License
MIT License
