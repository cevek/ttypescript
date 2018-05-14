import * as fs from 'fs';
import * as path from 'path';
import * as ts from '../typescript';

describe('typescript', () => {
    it('should apply transformer from config', () => {
        const exampleDir = path.resolve(__dirname, '..', '..', 'example');
        const content = fs.readFileSync(path.join(exampleDir, 'test.ts')).toString();

        const res = ts.transpileModule(content, {
            compilerOptions: {
                plugins: [
                    {
                        customTransformers: {
                            before: [
                                path.join(exampleDir, 'transformers', 'transformer.ts'),
                            ],
                            after: [
                                path.join(exampleDir, 'transformers', 'transformer.ts'),
                            ],
                        },
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
