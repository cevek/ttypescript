export const transformers = {
    before: {
        transform: __dirname + '/before.ts',
        source: `declare function type<T>(): string; var x = type<{ abc: 1 }>();`,
        out: `var x = "{ abc: 1 }"\n`
    }
};
