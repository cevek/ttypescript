import * as fs from 'fs';
import * as resolve from 'resolve';
import { loadTypeScript } from './loadTypescript';
import { dirname } from 'path';
import { runInThisContext } from 'vm'

const ts = loadTypeScript('typescript', { folder: process.cwd(), forceConfigLoad: true });
const tscFileName = resolve.sync('typescript/lib/tsc', { basedir: process.cwd() });
const commandLineTsCode = fs
    .readFileSync(tscFileName, 'utf8')
    .replace(/^[\s\S]+(\(function \(ts\) \{\s+function countLines[\s\S]+)$/, '$1')
    .replace('ts.executeCommandLine(ts.sys.args);', '');

runInThisContext(
    `(function (exports, require, module, __filename, __dirname, ts) {${commandLineTsCode}\n});`,
    { filename: tscFileName, lineOffset: 0, displayErrors: true }
).call(ts, ts, require, { exports: ts }, tscFileName, dirname(tscFileName), ts);

(ts as any).executeCommandLine(ts.sys.args);
