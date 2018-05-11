const ts = require('../lib/typescript')
const fs = require('fs')

const res = ts.transpileModule(
  fs.readFileSync('./test.ts').toString(),
  require('./tsconfig.json')
)

console.log(res.outputText)
