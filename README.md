# ttypescript
## What it is
Currently TypeScript doesn't support custom transformers in the tsconfig.json, but supports it programmatically.

And there is no way to compile your files using custom transformers using `tsc` command.

TTypescript (Transformer TypeScript) solves this problem by patching on the fly the compile module to use transformers from `tsconfig.json`.

## How to install
```
npm i ttypescript --save
npm i -g ttypescript
```
ttypescript uses your installed `typescript` in your `node_modules`

## How to use

### tsconfig.json
You just need to add the `customTransformers` block with `before` and(or) `after` object contains array of transformer paths into the `compilerOptions`
```json
{
  "compilerOptions": {
   "customTransformers": {
      "before": [
        "transformermodule"
      ],
      "after": [
        "./or_some_path_in_your_project_directory"
      ]
    }
  }
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
        include: paths.appSrc,
        loader: require.resolve('ts-loader'),
        options: {
            compiler: 'ttypescript'
        }
    }
```

### Visual Studio Code
Set the config `typescript.tsdk` to `/usr/local/lib/node_modules/ttypescript/lib/`

### WebStorm
Set in the TypeScript settings tab the typescript path: `/usr/local/lib/node_modules/ttypescript` or from your project node_modules

## License
MIT License
