"use strict";
var fs = require('fs');
var vm = require('vm');
var customRequireResolve = require('./customRequire').customRequireResolve;
var tscFileName = customRequireResolve(process.cwd(), 'typescript/lib/tsc.js');
var typescriptFilename = customRequireResolve(process.cwd(), 'typescript/lib/typescript.js');
__filename = tscFileName;
__dirname = require('path').dirname(__filename);
var content = fs.readFileSync(typescriptFilename, 'utf8');
content += fs.readFileSync(tscFileName, 'utf8').replace(/^[\s\S]+(\(function \(ts\) \{\s+function countLines[\s\S]+)$/, '$1').replace('ts.executeCommandLine(ts.sys.args);', 'module.exports = ts;');
var script = new vm.Script(content, { filename: __filename });
var context = vm.createContext(Object.assign({}, global, {
    require: require,
    module: {},
    __filename: __filename,
    __dirname: __dirname,
}));
var ts = script.runInContext(context);
require('./patchCreateProgram').default(ts, __dirname);
ts.executeCommandLine(ts.sys.args);
