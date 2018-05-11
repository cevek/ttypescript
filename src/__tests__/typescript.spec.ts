import * as ts from '../typescript'
import * as fs from 'fs'
import * as path from 'path'

describe('typescript', () => {
    it('should apply transformer from config', () => {
        const exampleDir = path.resolve(__dirname, '..', '..', 'example')
        const content = fs.readFileSync(path.join(exampleDir, 'test.ts')).toString()

        const res = ts.transpileModule(content, {
            compilerOptions: {
                plugins: <any>[
                    {
                        transform: path.join(exampleDir, 'transformers', 'transformer.ts')
                    }
                ]
            }
        })

        const result = `var a = { b: 1 };
function abc() {
    var c = a && a.b;
}
console.log(abc.toString());
`

        expect(res.outputText).toEqual(result)
    })
})
