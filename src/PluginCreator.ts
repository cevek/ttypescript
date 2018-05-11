import * as path from 'path';
import * as resolve from 'resolve';
import * as ts from 'typescript';

export type FactoryType = 'ls' | 'program' | 'config' | 'checker' | 'raw' | 'compilerOptions';

export interface PluginConfig {
    name?: string;
    transform?: string;
    type?: FactoryType;
    after?: boolean;
    before?: boolean;
    afterDeclaration?: boolean;
}

export interface TransformerBasePlugin {
    before?: ts.TransformerFactory<ts.SourceFile>;
    after?: ts.TransformerFactory<ts.SourceFile>;
    afterDeclaration?: ts.TransformerFactory<ts.SourceFile>;
}

export type TransformerPlugin = TransformerBasePlugin | ts.TransformerFactory<ts.SourceFile>;

export type LSPattern = (ls: ts.LanguageService, config?: PluginConfig) => TransformerPlugin;
export type ProgramPattern = (program: ts.Program, config?: PluginConfig) => TransformerPlugin;
export type CompilerOptionsPattern = (compilerOpts: ts.CompilerOptions, config?: PluginConfig) => TransformerPlugin;
export type ConfigPattern = (config: PluginConfig) => TransformerPlugin;
export type TypeCheckerPattern = (checker: ts.TypeChecker, config?: PluginConfig) => TransformerPlugin;
export type RawPattern = (context: ts.TransformationContext, program?: ts.Program) => ts.Transformer<ts.SourceFile>;
export type PluginFactory =
    | LSPattern
    | ProgramPattern
    | ConfigPattern
    | CompilerOptionsPattern
    | TypeCheckerPattern
    | RawPattern;

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
}): TransformerBasePlugin {
    const name = config.transform || config.name;
    let ret: TransformerPlugin;
    switch (config.type) {
        case 'ls':
            if (!ls) throw new Error(`Plugin ${name} need a LanguageService`);
            ret = (factory as LSPattern)(ls, config);
            break;
        case 'config':
            ret = (factory as ConfigPattern)(config);
            break;
        case 'compilerOptions':
            ret = (factory as CompilerOptionsPattern)(program.getCompilerOptions(), config);
            break;
        case 'checker':
            ret = (factory as TypeCheckerPattern)(program.getTypeChecker(), config);
            break;
        case undefined:
        case 'program':
            ret = (factory as ProgramPattern)(program, config);
            break;
        case 'raw':
            ret = (ctx: ts.TransformationContext) => (factory as RawPattern)(ctx, program);
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
 * ]).createTransformers({ program })
 */
export class PluginCreator {
    constructor(private configs: PluginConfig[], private resolveBaseDir: string = process.cwd()) {
        this.validateConfigs(configs);
    }

    createTransformers(params: { program: ts.Program } | { ls: ts.LanguageService }) {
        const chain: {
            before: ts.TransformerFactory<ts.SourceFile>[];
            after: ts.TransformerFactory<ts.SourceFile>[];
            afterDeclaration: ts.TransformerFactory<ts.SourceFile>[];
        } = {
            before: [],
            after: [],
            afterDeclaration: [],
        };
        let ls;
        let program;
        if ('ls' in params) {
            ls = params.ls;
            program = ls.getProgram();
        } else {
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
