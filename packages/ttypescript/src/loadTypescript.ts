import * as TS from 'typescript';
type ts = typeof TS;
import { readFileSync } from 'fs';
import { sync as resolveSync } from 'resolve';
import { patchCreateProgram } from './patchCreateProgram';
import { dirname } from 'path';
import { runInThisContext } from 'vm';
import Module = require('module');

export function loadTypeScript(
    filename: string,
    { folder = __dirname, forceConfigLoad = false }: { folder?: string; forceConfigLoad?: boolean } = {}
): ts {
    const libFilename = resolveSync('typescript/lib/' + filename, { basedir: folder });

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

type TypeScriptFactory = (exports: ts, require: NodeRequire, module: Module, filename: string, dirname: string) => void;
const typeScriptFactoryCache = new Map<string, TypeScriptFactory>();

class TypeScriptModule extends Module {
    paths = module.paths.slice();
    loaded = true;
    private _exports: ts | undefined = undefined;

    constructor(public filename: string) {
        super(filename, module);
    }

    get exports() {
        return this._exports || this._init();
    }

    set exports(value: ts) {
        this._exports = value;
    }

    private _init() {
        this._exports = {} as ts;
        let factory = typeScriptFactoryCache.get(this.filename);
        if (!factory) {
            const code = readFileSync(this.filename, 'utf8');
            factory = runInThisContext(`(function (exports, require, module, __filename, __dirname) {${code}\n});`, {
                filename: this.filename,
                lineOffset: 0,
                displayErrors: true,
            }) as TypeScriptFactory;
            typeScriptFactoryCache.set(this.filename, factory);
        }
        factory.call(this._exports, this._exports, require, this, this.filename, dirname(this.filename));
        return this._exports;
    }
}
