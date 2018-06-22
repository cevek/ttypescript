import * as fs from 'fs';
import * as path from 'path';
import * as resolve from 'resolve';
import * as vm from 'vm';
import { patchCreateProgram } from './patchCreateProgram';
import tsModule from './tsmodule';

const opts = { basedir: process.cwd() };

const tscFileName = resolve.sync('typescript/lib/tsc', opts);
const typescriptFilename = resolve.sync('typescript/lib/typescript', opts);

__filename = tscFileName;
__dirname = path.dirname(__filename);

let content = fs.readFileSync(typescriptFilename, 'utf8');

content += fs
    .readFileSync(tscFileName, 'utf8')
    .replace(/^[\s\S]+(\(function \(ts\) \{\s+function countLines[\s\S]+)$/, '$1')
    .replace('ts.executeCommandLine(ts.sys.args);', 'module.exports = ts;');

const script = new vm.Script(content, { filename: __filename });

const context = vm.createContext({
    ...global,
    require,
    module: {},
    __filename,
    __dirname,
});

const tss = script.runInContext(context);
patchCreateProgram(tss, true);
tsModule.tsModule = tss;

tss.executeCommandLine(tss.sys.args);
