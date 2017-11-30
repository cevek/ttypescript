const path = require('path');
const fs = require('fs');
const vm = require('vm');
const tscFilename = require.resolve('typescript/lib/tsc');
const content = fs.readFileSync(tscFilename, 'utf8').replace('ts.executeCommandLine(ts.sys.args);', 'module.exports = ts;');

const script = new vm.Script(content, {filename: tscFilename});
const context = vm.createContext(Object.assign({}, global, {
    require,
    module: {},
    __filename: tscFilename,
    __dirname: path.dirname(tscFilename)
}));
const ts = script.runInContext(context);

require('./patch')(ts);

ts.executeCommandLine(ts.sys.args);