import * as fs from 'fs';
import * as path from 'path';
import * as resolve from 'resolve';
import { patchCreateProgram } from './patchCreateProgram';

const opts = { basedir: process.cwd() };

const tscFileName = resolve.sync('typescript/lib/tsc', opts);
const typescriptFilename = resolve.sync('typescript/lib/typescript', opts);

__filename = tscFileName;
__dirname = path.dirname(__filename);

const commandLineTsCode = fs
    .readFileSync(tscFileName, 'utf8')
    .replace(/^[\s\S]+(\(function \(ts\) \{\s+function countLines[\s\S]+)$/, '$1')
    .replace('ts.executeCommandLine(ts.sys.args);', 'module.exports = ts;');


const ts = require(typescriptFilename);
patchCreateProgram(ts, true);
eval(commandLineTsCode);
ts.executeCommandLine(ts.sys.args);
