import compareVersions from 'compare-versions';
import * as path from 'path';
import * as resolve from 'resolve';
import * as ts from 'typescript';

export type FactoryType = 'ls' | 'program' | 'opts' | 'checker';

export interface PluginConfig {
    name?: string;
    transform?: string;
    type: FactoryType;
    after?: boolean;
    before?: boolean;
    afterDeclaration?: boolean;
}

export type TsTransformerFactory = ts.TransformerFactory<ts.SourceFile>;

export interface TransformerPlugin {
    before?: TsTransformerFactory;
    after?: TsTransformerFactory;
    afterDeclaration?: TsTransformerFactory;
}

export type FactoryRet = TransformerPlugin | TsTransformerFactory;
export type LSPattern = (ls: ts.LanguageService, config?: PluginConfig) => FactoryRet;
export type ProgramPattern = (program: ts.Program, config?: PluginConfig) => FactoryRet;
export type CompilerOptionsPattern = (opts: ts.CompilerOptions, config?: PluginConfig) => FactoryRet;
export type TypeCheckerPattern = (opts: ts.TypeChecker, config?: PluginConfig) => FactoryRet;
export type DefaultPattern = (context: ts.TransformationContext, program?: ts.Program) => ts.Transformer<ts.SourceFile>;
export type PluginFactory = LSPattern | ProgramPattern | CompilerOptionsPattern | TypeCheckerPattern | DefaultPattern;

function patchEmitFiles(host: any): ts.TransformerFactory<ts.SourceFile>[] {
    const oldEmitFiles = host.emitFiles;
    if (oldEmitFiles.__patched instanceof Array) {
        oldEmitFiles.__patched.length = 0;
        return oldEmitFiles.__patched;
    }

    const dtsTransformers: ts.TransformerFactory<ts.SourceFile>[] = [];
    /**
     * Hack
     * Typescript 2.8 does not support transforms for declaration emit
     * see https://github.com/Microsoft/TypeScript/issues/23701
     */
    host.emitFiles = function newEmitFiles(resolver, tsHost, targetSourceFile, emitOnlyDtsFiles, transformers) {
        let newTransformers = transformers;
        if ((emitOnlyDtsFiles && !transformers) || transformers.length === 0) {
            newTransformers = dtsTransformers;
        }

        return oldEmitFiles(resolver, tsHost, targetSourceFile, emitOnlyDtsFiles, newTransformers);
    };
    host.emitFiles.__patched = dtsTransformers;
    return dtsTransformers;
}

function createTransformerFromPattern({
    factory,
    config,
    program,
    ls,
}: {
    factory: PluginFactory;
    config: PluginConfig;
    program: ts.Program;
    ls?: ts.LanguageService;
}): TransformerPlugin {
    const name = config.transform || config.name;
    let ret: FactoryRet;
    switch (config.type) {
        case 'ls':
            if (!ls) throw new Error(`Plugin ${name} need a LanguageService`);
            ret = (factory as LSPattern)(ls, config);
            break;
        case 'opts':
            ret = (factory as CompilerOptionsPattern)(program.getCompilerOptions(), config);
            break;
        case 'checker':
            ret = (factory as TypeCheckerPattern)(program.getTypeChecker(), config);
            break;
        case 'program':
            ret = (factory as ProgramPattern)(program, config);
            break;
        case undefined:
            ret = (ctx: ts.TransformationContext) => (factory as DefaultPattern)(ctx, program);
            break;
        default:
            return never(config.type);
    }
    if (typeof ret === 'function') {
        if (config.after) return { after: ret };
        else if (config.afterDeclaration) return { afterDeclaration: ret };
        else return { before: ret };
    }
    return ret;
}

function never(n: never): never {
    throw new Error('Unexpected type: ' + n);
}

let tsNodeIncluded = false;

/**
 * @example
 *
 * new PluginCreator([
 *   {transform: '@zerollup/ts-transform-paths', someOption: '123'},
 *   {transform: '@zerollup/ts-transform-paths', type: 'ls', someOption: '123'},
 *   {transform: '@zerollup/ts-transform-paths', type: 'ls', after: true, someOption: '123'}
 * ], ts).createTransformers({ program })
 */
export class PluginCreator<Host extends Pick<typeof ts, 'versionMajorMinor'>> {
    private host: Host | undefined;

    constructor(private configs: PluginConfig[], host: Host, private resolveBaseDir: string = process.cwd()) {
        this.validateConfigs(configs);
        this.host = compareVersions('2.9', host.versionMajorMinor || '2.8') < 0 ? host : undefined;
    }

    createTransformers(params: { program: ts.Program } | { ls: ts.LanguageService }) {
        const chain: {
            before: ts.TransformerFactory<ts.SourceFile>[];
            after: ts.TransformerFactory<ts.SourceFile>[];
            afterDeclaration: ts.TransformerFactory<ts.SourceFile>[];
        } = {
            before: [],
            after: [],
            afterDeclaration: this.host ? patchEmitFiles(this.host) : [],
        };
        let ls;
        let program;
        if ('ls' in params) ls = params.ls;
        else {
            program = params.program;
        }
        for (const config of this.configs) {
            if (!config.transform) {
                continue;
            }
            const factory = this.resolveFactory(config.transform);
            const transformer = createTransformerFromPattern({
                factory,
                config,
                program,
                ls,
            });
            if (transformer.before) {
                chain.before.push(transformer.before);
            }
            if (transformer.after) {
                chain.after.push(transformer.after);
            }
            if (transformer.afterDeclaration) {
                chain.afterDeclaration.push(transformer.afterDeclaration);
            }
        }

        return chain;
    }

    private resolveFactory(transform: string): PluginFactory {
        if (
            !tsNodeIncluded &&
            transform.match(/\.ts$/) &&
            (module.parent!.parent === null || module.parent!.parent!.id.split(/[\/\\]/).indexOf('ts-node') === -1)
        ) {
            require('ts-node').register({
                project: path.resolve(__dirname, '..', 'ts-node-config', 'tsconfig.json'),
                transpileOnly: true,
            });
            tsNodeIncluded = true;
        }

        const modulePath = resolve.sync(transform, { basedir: this.resolveBaseDir });
        const factory: PluginFactory | { default: PluginFactory } = require(modulePath);

        return typeof (factory as any).default === 'function' ? (factory as any).default : factory;
    }

    private validateConfigs(configs: PluginConfig[]) {
        const pluginObj: PluginConfig = {
            name: '',
            type: 'ls',
            transform: '',
            after: true,
            before: true,
            afterDeclaration: true,
        };
        const possibleKeys = Object.keys(pluginObj);
        for (const config of configs) {
            if (!config.name && !config.transform) {
                throw new Error('tsconfig.json plugins error: Either name or transform must be present');
            }
            for (const key in config) {
                if (possibleKeys.indexOf(key) === -1) {
                    throw new Error('tsconfig.json plugins error: Unexpected property in plugins: ' + key);
                }
            }
        }
    }
}
