import * as resolve from 'resolve';
import * as ts from 'typescript';
import { inspect } from 'util';

export interface PluginConfig {
    /**
     * Language Server TypeScript Plugin name
     */
    name?: string;
    /**
     * Path to transformer or transformer module name
     */
    transform?: string;

    /**
     * Plugin entry point format type, default is program
     */
    type?: 'ls' | 'program' | 'config' | 'checker' | 'raw' | 'compilerOptions';

    /**
     * Should transformer applied after all ones
     */
    after?: boolean;

    /**
     * Should transformer applied for d.ts files, supports from TS2.9
     */
    afterDeclarations?: boolean;
}

export interface TransformerBasePlugin {
    before?: ts.TransformerFactory<ts.SourceFile>;
    after?: ts.TransformerFactory<ts.SourceFile>;
    afterDeclarations?: ts.TransformerFactory<ts.SourceFile | ts.Bundle>;
}
export type TransformerList = Required<ts.CustomTransformers>

export type TransformerPlugin = TransformerBasePlugin | ts.TransformerFactory<ts.SourceFile>;

export type LSPattern = (ls: ts.LanguageService, config: {}) => TransformerPlugin;
export type ProgramPattern = (program: ts.Program, config: {}, helpers?: { ts: typeof ts }) => TransformerPlugin;
export type CompilerOptionsPattern = (compilerOpts: ts.CompilerOptions, config: {}) => TransformerPlugin;
export type ConfigPattern = (config: {}) => TransformerPlugin;
export type TypeCheckerPattern = (checker: ts.TypeChecker, config: {}) => TransformerPlugin;
export type RawPattern = (
    context: ts.TransformationContext,
    program: ts.Program,
    config: {}
) => ts.Transformer<ts.SourceFile>;
export type PluginFactory =
    | LSPattern
    | ProgramPattern
    | ConfigPattern
    | CompilerOptionsPattern
    | TypeCheckerPattern
    | RawPattern;

function createTransformerFromPattern({
    typescript,
    factory,
    config,
    program,
    ls,
}: {
    typescript: typeof ts;
    factory: PluginFactory;
    config: PluginConfig;
    program: ts.Program;
    ls?: ts.LanguageService;
}): TransformerBasePlugin {
    const { transform, after, afterDeclarations, name, type, ...cleanConfig } = config;
    if (!transform) throw new Error('Not a valid config entry: "transform" key not found');
    let ret: TransformerPlugin;
    switch (config.type) {
        case 'ls':
            if (!ls) throw new Error(`Plugin ${transform} need a LanguageService`);
            ret = (factory as LSPattern)(ls, cleanConfig);
            break;
        case 'config':
            ret = (factory as ConfigPattern)(cleanConfig);
            break;
        case 'compilerOptions':
            ret = (factory as CompilerOptionsPattern)(program.getCompilerOptions(), cleanConfig);
            break;
        case 'checker':
            ret = (factory as TypeCheckerPattern)(program.getTypeChecker(), cleanConfig);
            break;
        case undefined:
        case 'program':
            ret = (factory as ProgramPattern)(program, cleanConfig, { ts: typescript });
            break;
        case 'raw':
            ret = (ctx: ts.TransformationContext) => (factory as RawPattern)(ctx, program, cleanConfig);
            break;
        default:
            return never(config.type);
    }
    if (typeof ret === 'function') {
        if (after) return { after: ret };
        else if (afterDeclarations) {
            return { afterDeclarations: ret as ts.TransformerFactory<ts.SourceFile | ts.Bundle> };
        } else return { before: ret };
    }
    return ret;
}

function never(n: never): never {
    throw new Error('Unexpected type: ' + n);
}

let tsNodeIncluded = false;
// to fix recursion bug, see usage below
const requireStack: string[] = [];
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
    constructor(private typescript: typeof ts, private configs: PluginConfig[], private resolveBaseDir: string = process.cwd()) {
        this.validateConfigs(configs);
    }

    mergeTransformers(into: TransformerList, source: ts.CustomTransformers | TransformerBasePlugin) {
        const slice = <T>(input: T | T[]) => Array.isArray(input) ? input.slice() : [input]
        if (source.before) {
            into.before.push(...slice(source.before));
        }
        if (source.after) {
            into.after.push(...slice(source.after));
        }
        if (source.afterDeclarations) {
            into.afterDeclarations.push(...slice(source.afterDeclarations));
        }
        return this
    }

    createTransformers(params: { program: ts.Program } | { ls: ts.LanguageService }, customTransformers?: ts.CustomTransformers) {
        const chain: TransformerList = {
            before: [],
            after: [],
            afterDeclarations: [],
        };
        let ls;
        let program;
        if ('ls' in params) {
            ls = params.ls;
            program = ls.getProgram()!;
        } else {
            program = params.program;
        }
        for (const config of this.configs) {
            if (!config.transform) {
                continue;
            }
            const factory = this.resolveFactory(config.transform);
            // if recursion
            if (factory === undefined) continue;
            const transformer = createTransformerFromPattern({
                typescript: this.typescript,
                factory,
                config,
                program,
                ls,
            });
            this.mergeTransformers(chain, transformer)
        }

        // if we're given some custom transformers, they must be chained at the end
        if (customTransformers) {
            this.mergeTransformers(chain, customTransformers)
        }

        return chain;
    }

    private resolveFactory(transform: string): PluginFactory | undefined {
        if (
            !tsNodeIncluded &&
            transform.match(/\.ts$/) &&
            (module.parent!.parent === null ||
                module.parent!.parent!.parent === null ||
                module.parent!.parent!.parent!.id.split(/[\/\\]/).indexOf('ts-node') === -1)
        ) {
            require('ts-node').register({
                transpileOnly: true,
                skipProject: true,
                compilerOptions: {
                    target: 'es5',
                    module: 'commonjs',
                },
            });
            tsNodeIncluded = true;
        }

        const modulePath = resolve.sync(transform, { basedir: this.resolveBaseDir });
        // in ts-node occurs error cause recursion:
        //   ts-node file.ts -> createTransformers -> require transformer.ts
        //        -> createTransformers -> require transformer.ts -> ...
        //   this happens cause ts-node uses to compile transformers the same config included this transformer
        //   so this stack checks that if we already required this file we are in the reqursion
        if (requireStack.indexOf(modulePath) > -1) return;
        requireStack.push(modulePath);
        const factoryModule: PluginFactory | { default: PluginFactory } | { transform: PluginFactory } = require(modulePath);
        requireStack.pop();

        let factory: PluginFactory
        if ('default' in factoryModule) {
            factory = factoryModule.default
        } else if ('transform' in factoryModule && typeof factoryModule === 'object') {
            factory = factoryModule.transform
        } else {
            factory = factoryModule
        }

        if (typeof factory !== 'function') {
            throw new Error(
                `tsconfig.json > plugins: "${transform}" is not a plugin module: ` + inspect(factoryModule)
            );
        }
        return factory;
    }

    private validateConfigs(configs: PluginConfig[]) {
        for (const config of configs) {
            if (!config.name && !config.transform) {
                throw new Error('tsconfig.json plugins error: transform must be present');
            }
        }
    }
}
