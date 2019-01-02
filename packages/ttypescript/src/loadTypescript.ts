import * as TS from 'typescript';
type ts = typeof TS;
import { readFileSync } from 'fs';
import { sync as resolveSync } from 'resolve';
import { patchCreateProgram } from './patchCreateProgram';
import { dirname } from 'path';
import { runInThisContext } from 'vm'
import Module = require('module')

export function resolveTypeScriptModule(filename: string, folder: string = __dirname): string {
    return resolveSync('typescript/lib/' + filename, { basedir: folder });
}

const moduleLoaderCache: { [key: string]: TypeScriptModuleLoader } = Object.create(null)

export class TypeScriptModuleLoader {
    public readonly filename: string;
    public readonly loadToModule: (m: Module, ts?: ts) => any;

    public constructor(filename: string, code: string) {
        this.filename = filename;
        
        const loader = runInThisContext(
            `(function (exports, require, module, __filename, __dirname, ts) {${code}\n});`,
            { filename, lineOffset: 0, displayErrors: true }
        );

        this.loadToModule = (m: Module, ts?: ts) => {
            loader.call(m.exports, m.exports, require, this, m.filename, dirname(m.filename), ts || m.exports);
            return m.exports
        };
    }

    public static get(filename: string): TypeScriptModuleLoader {
        let loader = moduleLoaderCache[filename];
        if (loader === undefined) {
            loader = new TypeScriptModuleLoader(filename, readFileSync(filename, 'utf8'));
            moduleLoaderCache[filename] = loader;
        }
        return loader
    }
}

export class TypeScriptModule extends Module {
    public constructor(filename: string) {
        super(filename, module)
        this.filename = filename;
        this.loaded = true;
        this.paths = module.paths.slice();
    }
}

class LazyTypeScriptModule extends TypeScriptModule {
    public constructor(filename: string, loader: TypeScriptModuleLoader) {
        super(filename)
        const exports = this.exports
        Object.defineProperty(this, 'exports', {
            get: () => {
                this.exports = exports
                return loader.loadToModule(this)
            },
            set: (value: ts) => Object.defineProperty(this, 'exports', { value, enumerable: true, configurable: true, writable: true }),
            enumerable: true,
            configurable: true
        });
    }
}


export function loadTypeScript(
    filename: string,
    { folder, forceConfigLoad = false }: { folder?: string; forceConfigLoad?: boolean } = {}
): ts {

    const libFilename = resolveTypeScriptModule(filename, folder)
    const loader = TypeScriptModuleLoader.get(libFilename);

    if (!require.cache[libFilename]) {
        require.cache[libFilename] = new LazyTypeScriptModule(libFilename, loader);
    }

    const ts = loader.loadToModule(new TypeScriptModule(libFilename))

    const [major, minor] = ts.versionMajorMinor.split('.');
    if (+major < 3 && +minor < 7) {
        throw new Error('ttypescript supports typescript from 2.7 version');
    }

    return patchCreateProgram(ts, forceConfigLoad);
}
