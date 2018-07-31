import * as fs from 'fs';
import * as resolve from 'resolve';
import * as TS from 'typescript';
import { patchCreateProgram } from './patchCreateProgram';
import { dirname } from 'path';

export function loadTypeScript(
    filename: string,
    { folder = __dirname, forceConfigLoad = false }: { folder?: string; forceConfigLoad?: boolean } = {}
): typeof TS {
    const opts = { basedir: folder };
    const typescriptFilename = resolve.sync('typescript/lib/' + filename, opts);

    const code = fs.readFileSync(typescriptFilename, 'utf8');
    const module = { exports: {} as typeof TS };
    __filename = typescriptFilename;
    __dirname = dirname(__filename);
    eval(code);
    const ts = module.exports;
    const [major, minor] = ts.versionMajorMinor.split('.');
    if (+major < 3 && +minor < 7) {
        throw new Error('ttypescript supports typescript from 2.7 version');
    }
    patchCreateProgram(ts, forceConfigLoad);
    return ts;
}
