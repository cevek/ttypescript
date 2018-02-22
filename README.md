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

## Transformers
You can use transformers written in ts or js

As extra feature ttsc provide the `program` as a second argument 

```ts
import * as ts from 'typescript';
export default (ctx: ts.TransformationContext, program: ts.Program): ts.Transformer<ts.SourceFile> => {
    return sourceFile => {
        function visitor(node: ts.Node): ts.Node {
            return ts.visitEachChild(node, visitor, ctx);
        }
        return ts.visitNode(sourceFile, visitor);
    };
};
```


## Example

An example project is in the `example` directory

## License
MIT License
