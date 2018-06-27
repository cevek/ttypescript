import * as fs from 'fs';
import * as resolve from 'resolve';
import { loadTypeScript } from './loadTypescript';
import { dirname } from 'path';

const ts = loadTypeScript('typescript', { folder: process.cwd(), forceConfigLoad: true });
const tscFileName = resolve.sync('typescript/lib/tsc', { basedir: process.cwd() });
const commandLineTsCode = fs
    .readFileSync(tscFileName, 'utf8')
    .replace(/^[\s\S]+(\(function \(ts\) \{\s+function countLines[\s\S]+)$/, '$1')
    .replace('ts.executeCommandLine(ts.sys.args);', '');

__filename = tscFileName;
__dirname = dirname(__filename);
eval(commandLineTsCode);
(ts as any).executeCommandLine(ts.sys.args);
