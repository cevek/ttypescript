import * as fs from 'fs';
import * as resolve from 'resolve';
import * as TS from 'typescript';
import { patchCreateProgram } from './patchCreateProgram';
import { dirname } from 'path';
import { runInThisContext } from 'vm'

export function loadTypeScript(
    filename: string,
    { folder = __dirname, forceConfigLoad = false, ts = {} as any }: { folder?: string; forceConfigLoad?: boolean, ts?: typeof TS } = {}
): typeof TS {
    const opts = { basedir: folder };
    const typescriptFilename = resolve.sync('typescript/lib/' + filename, opts);

    const module = { exports: ts }
    const code = fs.readFileSync(typescriptFilename, 'utf8');
    runInThisContext(
        `(function (exports, require, module, __filename, __dirname, ts) {${code}\n});`,
        { filename: typescriptFilename, lineOffset: 0, displayErrors: true }
    ).call(ts, ts, require, module, typescriptFilename, dirname(typescriptFilename), ts);
    ts = module.exports

    const [major, minor] = ts.versionMajorMinor.split('.');
    if (+major < 3 && +minor < 7) {
        throw new Error('ttypescript supports typescript from 2.7 version');
    }
    patchCreateProgram(ts, forceConfigLoad);
    return ts;
}
