const ts = require('ttypescript')
const fs = require('fs')
const path = require('path')

const res = ts.transpileModule(
  fs.readFileSync(path.join(__dirname, 'test.ts')).toString(),
  require('./tsconfig.json')
)

console.log(res.outputText)
