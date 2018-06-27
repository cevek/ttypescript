import * as fs from 'fs';
import * as resolve from 'resolve';
import * as TS from 'typescript';
import { runInNewContext } from 'vm';
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
    patchCreateProgram(ts, forceConfigLoad);
    return ts;
}
