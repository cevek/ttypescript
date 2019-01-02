import * as TS from 'typescript';
type ts = typeof TS;
import { readFileSync } from 'fs';
import { sync as resolveSync } from 'resolve';
import { patchCreateProgram } from './patchCreateProgram';
import { dirname } from 'path';
import { runInThisContext } from 'vm'
import Module = require('module')

type TypeScriptModuleFactory = (exports: ts, require: NodeRequireFunction, module: { exports: any }, filename: string, dirname: string) => ts;
const typeScriptModuleFactoryCache: { [key: string]: TypeScriptModuleFactory } = Object.create(null)

export function loadTypeScript(
    filename: string,
    { folder = __dirname, forceConfigLoad = false }: { folder?: string; forceConfigLoad?: boolean } = {}
): ts {
    const libFilename = resolveSync('typescript/lib/' + filename, { basedir: folder })

    let factory = typeScriptModuleFactoryCache[libFilename];
    if (!factory) {
        const code = readFileSync(libFilename, 'utf8');
        factory = runInThisContext(
            `(function (exports, require, module, __filename, __dirname) {${code}\n});`,
            { filename: libFilename, lineOffset: 0, displayErrors: true }
        )
        typeScriptModuleFactoryCache[libFilename] = factory;
    }

    if (!require.cache[libFilename]) {
        require.cache[libFilename] = createPristineTypeScriptLazyModule(libFilename, factory);
    }

    const m = { exports: {} as ts };
    factory.call(m.exports, m.exports, require, m, libFilename, dirname(libFilename));
    const ts = m.exports;

    const [major, minor] = ts.versionMajorMinor.split('.');
    if (+major < 3 && +minor < 7) {
        throw new Error('ttypescript supports typescript from 2.7 version');
    }

    return patchCreateProgram(ts, forceConfigLoad);
}

function createPristineTypeScriptLazyModule(filename: string, factory: TypeScriptModuleFactory) {
    const m = new Module(filename, module);
    m.filename = filename;
    m.loaded = true;
    m.paths = module.paths.slice();
    let exports: any
    Object.defineProperty(m, 'exports', {
        get() {
            if (exports === undefined) {
                exports = {}
                factory.call(exports, exports, require, m, filename, dirname(filename));
            }
            return exports;
        },
        set(value: any) {
            exports = value;
        },
        enumerable: true,
        configurable: true
    });
    return m;
}