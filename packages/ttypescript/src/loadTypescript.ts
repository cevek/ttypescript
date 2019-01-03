import * as TS from 'typescript';
type ts = typeof TS;
import { readFileSync } from 'fs';
import { sync as resolveSync } from 'resolve';
import { patchCreateProgram } from './patchCreateProgram';
import { dirname } from 'path';
import { runInThisContext } from 'vm'
import Module = require('module')

export function loadTypeScript(
    filename: string,
    { folder = __dirname, forceConfigLoad = false }: { folder?: string; forceConfigLoad?: boolean } = {}
): ts {
    const libFilename = resolveSync('typescript/lib/' + filename, { basedir: folder })

    if (!require.cache[libFilename]) {
        require.cache[libFilename] = new PristineTypeScriptModule(libFilename);
    }

    const ts = loadPristineTypeScriptModule(libFilename);

    const [major, minor] = ts.versionMajorMinor.split('.');
    if (+major < 3 && +minor < 7) {
        throw new Error('ttypescript supports typescript from 2.7 version');
    }

    return patchCreateProgram(ts, forceConfigLoad);
}

const typeScriptModuleInitializerCache: {
    [filename: string]: (exports: ts, require: NodeRequireFunction, module: { exports: any }, filename: string, dirname: string, ts?: ts) => ts
} = Object.create(null);

function loadPristineTypeScriptModule(filename: string): ts {
    let factory = typeScriptModuleInitializerCache[filename];
    if (!factory) {
        const code = readFileSync(filename, 'utf8');
        factory = runInThisContext(
            `(function (exports, require, module, __filename, __dirname) {${code}\n});`,
            { filename, lineOffset: 0, displayErrors: true }
        )
        typeScriptModuleInitializerCache[filename] = factory;
    }
    const m = { exports: {} as ts };
    factory.call(m.exports, m.exports, require, m, filename, dirname(filename));
    return m.exports;
}

class PristineTypeScriptModule extends Module {
    private _exports: ts = {} as ts;

    public constructor(public readonly filename: string) {
        super(filename, module);
        this.paths = module.paths.slice();
    }

    public get exports(): ts {
        if (!this.loaded) {
            this.loaded = true;
            this._exports = loadPristineTypeScriptModule(this.filename);
        }
        return this._exports;
    }

    public set exports(value: ts) {
        this.loaded = true;
        this._exports = value;
    }
}
