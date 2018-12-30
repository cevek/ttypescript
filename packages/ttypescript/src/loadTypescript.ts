import * as fs from 'fs';
import * as resolve from 'resolve';
import * as TS from 'typescript';
import { patchCreateProgram } from './patchCreateProgram';
import { dirname } from 'path';
import { runInThisContext } from 'vm'

export function loadTypeScript(
    filename: string,
    { folder = __dirname, forceConfigLoad = false }: { folder?: string; forceConfigLoad?: boolean } = {}
): typeof TS {
    const opts = { basedir: folder };
    const typescriptFilename = resolve.sync('typescript/lib/' + filename, opts);

    const m = { exports: {} as typeof TS }
    const code = fs.readFileSync(typescriptFilename, 'utf8');
    runInThisContext(
        `(function (exports, require, module, __filename, __dirname) {${code}\n});`,
        { filename: typescriptFilename, lineOffset: 0, displayErrors: true }
    ).call(m.exports, m.exports, require, m, typescriptFilename, dirname(typescriptFilename));
    
    const ts = m.exports;

    const [major, minor] = ts.versionMajorMinor.split('.');
    if (+major < 3 && +minor < 7) {
        throw new Error('ttypescript supports typescript from 2.7 version');
    }
    patchCreateProgram(ts, forceConfigLoad);
    return ts;
}
