import * as ts from 'typescript'
import {PluginCreator} from './PluginCreator'

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

        const creator = new PluginCreator(
            (program.getCompilerOptions() as any).plugins,
            tsm.versionMajorMinor,
            resolveBaseDir
        )

        const originEmit = program.emit
        program.emit = function newEmit(
            targetSourceFile?: ts.SourceFile,
            writeFile?: ts.WriteFileCallback,
            cancellationToken?: ts.CancellationToken,
            emitOnlyDtsFiles?: boolean,
            customTransformers?: ts.CustomTransformers
        ): ts.EmitResult {
            const newCustomTransformers = customTransformers && (
                    customTransformers.before
                    || customTransformers.after
                    || (customTransformers as any).afterDeclaration
                )
                ? customTransformers
                : creator.createTransformers(program)

            return originEmit(
                targetSourceFile,
                writeFile,
                cancellationToken,
                emitOnlyDtsFiles,
                newCustomTransformers
            )
        }

        return program
    }

    return tsm
}
