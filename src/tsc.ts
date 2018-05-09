const fs = require('fs');
const vm = require('vm');
const { customRequireResolve } = require('./customRequire');
const tscFileName = customRequireResolve(process.cwd(), 'typescript/lib/tsc.js');
var typescriptFilename = customRequireResolve(process.cwd(), 'typescript/lib/typescript.js');
__filename = tscFileName;
__dirname = require('path').dirname(__filename);
let content = fs.readFileSync(typescriptFilename, 'utf8');
content += fs.readFileSync(tscFileName, 'utf8').replace(/^[\s\S]+(\(function \(ts\) \{\s+function countLines[\s\S]+)$/, '$1').replace('ts.executeCommandLine(ts.sys.args);', 'module.exports = ts;');
const script = new vm.Script(content, { filename: __filename });
const context = vm.createContext(
    Object.assign({}, global, {
        require,
        module: {},
        __filename: __filename,
        __dirname: __dirname,
    })
);
const ts = script.runInContext(context);
require('./patchCreateProgram').default(ts, __dirname);

ts.executeCommandLine(ts.sys.args);
