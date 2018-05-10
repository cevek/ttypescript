import * as ts from 'typescript'
import {PluginCreator, preparePluginsFromCompilerOptions} from './PluginCreator'

export type BaseHost = Pick<typeof ts, 'createProgram' | 'versionMajorMinor'>

export function patchCreateProgram<Host extends BaseHost>(
    tsm: Host,
    resolveBaseDir: string = process.cwd()
): Host {
    const originCreateProgram = tsm.createProgram
    tsm.createProgram = function newCreateProgram(
        rootNames: ReadonlyArray<string>,
        options: ts.CompilerOptions,
        host?: ts.CompilerHost,
        oldProgram?: ts.Program
    ): ts.Program {
        const program = originCreateProgram(rootNames, options, host, oldProgram)
        const pluginCreator = new PluginCreator(
            preparePluginsFromCompilerOptions(program.getCompilerOptions().plugins),
            tsm,
            resolveBaseDir
        )

        const originEmit = program.emit
        program.emit = function newEmit(
            targetSourceFile?: ts.SourceFile,
            writeFile?: ts.WriteFileCallback,
            cancellationToken?: ts.CancellationToken,
            emitOnlyDtsFiles?: boolean,
            customTransformers: ts.CustomTransformers = pluginCreator.createTransformers({program})
        ): ts.EmitResult {
            return originEmit(
                targetSourceFile,
                writeFile,
                cancellationToken,
                emitOnlyDtsFiles,
                customTransformers
            )
        }

        return program
    }

    return tsm
}
