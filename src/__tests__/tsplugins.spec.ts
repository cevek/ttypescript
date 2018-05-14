import * as ts from '../typescript';

describe('typescript', () => {
    it('should skip ts plugin without errors', () => {
        const res = ts.transpileModule('var a = 1;', {
            compilerOptions: {
                plugins: [{ name: 'foobar' }],
            },
        });
        expect(res.outputText).toBe('var a = 1;\n');
    });
});
