import * as fs from 'fs';
import * as resolve from 'resolve';
import { loadTypeScript } from './loadTypescript';
import { dirname } from 'path';
import { runInThisContext } from 'vm';

const ts = loadTypeScript('typescript', { folder: process.cwd(), forceConfigLoad: true });
const tscFileName = resolve.sync('typescript/lib/tsc', { basedir: process.cwd() });
const [major, minor]: [number, number] = 
    ts.version.split(".").map(
        (str: string) => Number(str)
    ) as [number, number];

const commandLineTsCode = fs
    .readFileSync(tscFileName, 'utf8')
    .replace(
        major >= 4 && minor >= 9
            ? /^[\s\S]+(\(function \(ts\) {\s+var StatisticType;[\s\S]+)$/
            : /^[\s\S]+(\(function \(ts\) \{\s+function countLines[\s\S]+)$/, 
        '$1'
    );

const globalCode = (fs.readFileSync(tscFileName, 'utf8').match(/^([\s\S]*?)var ts;/) || ['', ''])[1];
runInThisContext(
    `(function (exports, require, module, __filename, __dirname, ts) {${globalCode}${commandLineTsCode}\n});`,
    {
        filename: tscFileName,
        lineOffset: 0,
        displayErrors: true,
    }
).call(ts, ts, require, { exports: ts }, tscFileName, dirname(tscFileName), ts);
