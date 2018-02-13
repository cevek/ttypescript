# ttypescript

## What it is

Currently TypeScript doesn't support custom transformers in the tsconfig.json, but supports its programatically.

And there is no way to compile your files using custom transformers using `tsc` command.

TTypescript (Transformer Typescript) solves this problem by patching on the fly the compile module to use transformers from `tsconfig.json`.

## How to install

```
npm i ttypescript -D
```

ttypescript uses your installed `typescript` in your `node_modules`

## How to use

You can use transformers written in ts or js

### tsconfig.json

You just need to add the `customTransformers` block with `before` and(or) `after` object contains array of transformer paths into the `compilerOptions.plugins`

Don't forget to exclude your transformers in the tsconfig.json

```json
{
    "compilerOptions": {
        "plugins": [
            {
                "customTransformers": {
                    "before": ["transformer-module"],
                    "after": ["./transformers/my-transformer.ts"]
                }
            }
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

## Example

An example project is in the `example` directory

## License

MIT License
