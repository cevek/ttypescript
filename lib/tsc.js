const fs = require('fs');
const vm = require('vm');
__filename = require.resolve('typescript/lib/tsc.js');
__dirname = require('path').dirname(__filename);
const content = fs.readFileSync(__filename, 'utf8').replace('ts.executeCommandLine(ts.sys.args);', 'module.exports = ts;');
const script = new vm.Script(content, {filename: __filename});
const context = vm.createContext(Object.assign({}, global, {
    require,
    module: {},
    __filename: __filename,
    __dirname: __dirname
}));
const ts = script.runInContext(context);
require('./patch')(ts);

ts.executeCommandLine(ts.sys.args);