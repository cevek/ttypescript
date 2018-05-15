import * as ts from '../typescript';
import * as fs from 'fs';
import * as path from 'path';

describe('typescript', () => {
    it('should apply transformer from config', () => {
        const exampleDir = path.resolve(__dirname, '..', '..', 'example');
        const content = fs.readFileSync(path.join(exampleDir, 'test.ts')).toString();

        const res = ts.transpileModule(content, {
            compilerOptions: {
                plugins: [
                    {
                        transform: path.join(exampleDir, 'transformers', 'transformer.ts'),
                    },
                ] as any,
            },
        });

        const result = `var a = { b: 1 };
function abc() {
    var c = a && a.b;
}
console.log(abc.toString());
`;

        expect(res.outputText).toEqual(result);
    });
});

describe('3rd party', () => {
    it('should run 3rd party transformers', () => {
        const res = ts.transpileModule('var x = 1;', {
            compilerOptions: {
                plugins: [
                    { transform: 'ts-transformer-keys/transformer' },
                    { transform: 'ts-transformer-enumerate/transformer' },
                    { transform: 'ts-transform-graphql-tag/dist/transformer' },
                    { transform: 'ts-transform-img/dist/transform', type: 'config' },
                    { transform: 'ts-transform-css-modules/dist/transform', type: 'config' },
                    { transform: 'ts-transform-react-intl/dist/transform', type: 'config' },
                    { transform: 'ts-nameof', type: 'raw' },
                ] as any,
            },
        });

        const result = `var x = 1;\n`;
        expect(res.outputText).toEqual(result);
    });
});
