import * as ts from 'typescript'
import * as resolve from 'resolve'
import compareVersions from 'compare-versions'

export type TransformerPlugin = {
    before?: ts.TransformerFactory<ts.SourceFile>
    after?: ts.TransformerFactory<ts.SourceFile>
    afterDeclaration?: ts.TransformerFactory<ts.SourceFile>
} | ts.TransformerFactory<ts.SourceFile>

export type FactoryType = 'ls' | 'program' | 'opts' | 'checker'

export type PluginConfig = {
    transform: string
    type?: FactoryType
    after?: boolean
    before?: boolean
    afterDeclaration?: boolean
    [options: string]: any;
} | (ts.PluginImport & {
    [options: string]: any
})

export type PluginFactory = {
    type: 'ls'
    (ls: ts.LanguageService, options?: PluginConfig): TransformerPlugin
} | {
    type?: 'program'
    (program: ts.Program, options?: PluginConfig): TransformerPlugin
} | {
    type: 'opts'
    (opts: ts.CompilerOptions, options?: PluginConfig): TransformerPlugin
} | {
    type: 'checker'
    (opts: ts.TypeChecker, options?: PluginConfig): TransformerPlugin
}

export type TransformerHost = ts.LanguageService | ts.Program | ts.CompilerOptions | ts.TypeChecker

function patchEmitFiles(): ts.TransformerFactory<ts.SourceFile>[] {
    let a: any = ts
    if (a.emitFiles.__patched) return a.emitFiles.__patched
    const dtsTransformers: ts.TransformerFactory<ts.SourceFile>[] = a.emitFiles.__patched = []

    const oldEmitFiles = a.emitFiles
    /**
     * Hack
     * Typescript 2.8 does not support transforms for declaration emit
     * see https://github.com/Microsoft/TypeScript/issues/23701
     */
    a.emitFiles = function newEmitFiles(resolver, host, targetSourceFile, emitOnlyDtsFiles, transformers) {
        let newTransformers = transformers
        if (emitOnlyDtsFiles && !transformers || transformers.length === 0) {
            newTransformers = dtsTransformers
        }

        return oldEmitFiles(resolver, host, targetSourceFile, emitOnlyDtsFiles, newTransformers)
    }
    a.emitFiles.__patched = dtsTransformers

    return dtsTransformers
}

class TransformerPluginFactory {
    public ls: ts.LanguageService | void
    public program: ts.Program | void
    public opts: ts.CompilerOptions | void
    public checker: ts.TypeChecker | void

    constructor(main: TransformerHost) {
        this.ls = typeof (main as any).getProgram === 'function'
            ? main as ts.LanguageService
            : undefined

        this.program = this.ls
            ? this.ls.getProgram()
            : (
                typeof (main as any).getTypeChecker === 'function'
                    ? main as ts.Program
                    : undefined
            )
        
        this.checker = this.program
            ? this.program.getTypeChecker()
            : (
                typeof (main as any).getBaseTypes === 'function'
                    ? main as ts.TypeChecker
                    : undefined
            )

        this.opts = this.program
            ? this.program.getCompilerOptions()
            : (
                typeof (main as any).getBaseTypes === 'function'
                    ? undefined
                    : main as ts.CompilerOptions
            )
    }

    createPlugin(factory: PluginFactory, options: PluginConfig): TransformerPlugin {
        const name = options.transformer || options.name
        switch (factory.type) {
            case 'ls':
                if (!this.ls) throw new Error(`Plugin ${name} need a LanguageService`)
                return factory(this.ls, options)

            case 'opts':
                if (!this.opts) throw new Error(`Plugin ${name} need a CompilerOptions`)
                return factory(this.opts, options)

            case 'checker':
                if (!this.checker) throw new Error(`Plugin ${name} need a TypeChecker`)
                return factory(this.checker, options)

            case 'program':
            default:
                if (!this.program) throw new Error(`Plugin ${name} need a Program`)
                return factory(this.program, options)
        }
    }
}

/**
 * @example
 * 
 * new PluginCreator([
 *   {transform: '@zerollup/ts-transform-paths', someOption: '123'},
 *   {transform: '@zerollup/ts-transform-paths', type: 'ls', someOption: '123'},
 *   {transform: '@zerollup/ts-transform-paths', type: 'ls', after: true, someOption: '123'}
 * ]).createTransformers(program)
 */
export class PluginCreator {
    private isOldVersion: boolean

    constructor(
        private configs: PluginConfig[],
        versionMajorMinor?: string | void,
        private basedir: string = process.cwd()
    ) {
        this.isOldVersion = compareVersions('2.9', versionMajorMinor || '2.8') < 0
    }

    private resolveFactory(transform: string): PluginFactory {
        const modulePath = resolve.sync(transform, {basedir: this.basedir})
        const module: PluginFactory | {default: PluginFactory} = require(modulePath)

        return typeof (module as any).default === 'function'
            ? (module as any).default
            : module
    }

    createTransformers = (main: TransformerHost) => this._createTransformers(main)

    private _createTransformers(main: TransformerHost): ts.CustomTransformers {
        const chain: {
            before: ts.TransformerFactory<ts.SourceFile>[]
            after: ts.TransformerFactory<ts.SourceFile>[]
            afterDeclaration: ts.TransformerFactory<ts.SourceFile>[]
        } = {
            before: [],
            after: [],
            afterDeclaration: this.isOldVersion ? patchEmitFiles() : []
        }
        const pluginFactory = new TransformerPluginFactory(main)

        for(let config of this.configs) {
            if (!config.transform) continue
            const factory = this.resolveFactory(config.transform)
            if (config.type && factory.type === undefined) {
                (factory as any).type = config.type
            }

            const plugin = pluginFactory.createPlugin(factory, config)

            if (typeof plugin === 'function') {
                if (config.after) chain.after.push(plugin)
                if (config.afterDeclaration) chain.afterDeclaration.push(plugin)
                if (
                    config.before
                    || (
                        config.before === undefined
                        && config.after === undefined
                        && config.afterDeclaration === undefined
                    )
                ) chain.before.push(plugin)
            } else {
                if (plugin.before) chain.before.push(plugin.before)
                if (plugin.after) chain.after.push(plugin.after)
                if (plugin.afterDeclaration) chain.afterDeclaration.push(plugin.afterDeclaration)
            }
        }

        return chain
    }
}
