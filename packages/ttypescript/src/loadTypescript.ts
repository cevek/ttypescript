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

    if (!(libFilename in require.cache)) {
        require.cache[libFilename] = new TypeScriptModule(libFilename);
    }

    const ts = new TypeScriptModule(libFilename).exports;

    const [major, minor] = ts.versionMajorMinor.split('.');
    if (+major < 3 && +minor < 7) {
        throw new Error('ttypescript supports typescript from 2.7 version');
    }

    return patchCreateProgram(ts, forceConfigLoad);
}

type TypeScriptModuleInitializer = (exports: ts, require: NodeRequireFunction, module: Module, filename: string, dirname: string, ts?: ts) => void
const typeScriptModuleInitializerCache: { [filename: string]: TypeScriptModuleInitializer } = Object.create(null);

class TypeScriptModule extends Module {
    public readonly paths = module.paths.slice();
    private _exports: ts | null = null;

    public constructor(public readonly filename: string) {
        super(filename, module);
    }

    public get exports(): ts {
        return this._exports || this._initializeTypeScriptExports();
    }

    public set exports(value: ts) {
        this._exports = value;
    }

    private _initializeTypeScriptExports(): ts {
        let initModule: TypeScriptModuleInitializer = typeScriptModuleInitializerCache[this.filename];
        if (!initModule) {
            const code = readFileSync(this.filename, 'utf8');
            initModule = runInThisContext(
                `(function (exports, require, module, __filename, __dirname) {${code}\n});`,
                { filename: this.filename, lineOffset: 0, displayErrors: true }
            );
            typeScriptModuleInitializerCache[this.filename] = initModule;
        }
        this._exports = {} as ts;
        initModule.call(this._exports, this._exports, require, this, this.filename, dirname(this.filename));
        this.loaded = true;
        return this._exports;
    }
}