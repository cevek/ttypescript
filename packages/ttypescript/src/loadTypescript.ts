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

    if (!require.cache[libFilename]) {
        const temp =  TSModuleFactory(libFilename);
        require.cache = {...require.cache, [libFilename]: temp};
    }

    const ts = TSModuleFactory(libFilename).exports;
    const [major, minor] = ts.versionMajorMinor.split('.');
    if (+major < 3 && +minor < 7) {
        throw new Error('ttypescript supports typescript from 2.7 version');
    }

    const result = patchCreateProgram(ts, forceConfigLoad);

    if(+major >= 5 && (result as any).args){
        (result as any).args.this = (result as any).args.exports;
    }
    
    return result;
}

type TypeScriptFactory = (exports: ts, require: NodeRequire, module: Module, filename: string, dirname: string) => void;
const typeScriptFactoryCache = new Map<string, TypeScriptFactory>();

function TSModuleFactory(filename: string) {
    let factory = typeScriptFactoryCache.get(filename);
    if (!factory) {
        const code = readFileSync(filename, 'utf8');
        factory = runInThisContext(`(function (exports, require, module, __filename, __dirname) {${code}\n});`, {
            filename: filename,
            lineOffset: 0,
            displayErrors: true,
        }) as TypeScriptFactory;
        typeScriptFactoryCache.set(filename, factory);
    }

    const newModule = new Module(filename, module);
    factory.call(newModule, newModule.exports, require, newModule, filename, dirname(filename));
    return newModule;
}
