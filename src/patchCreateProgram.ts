import * as ts from 'typescript';
import { PluginConfig, PluginCreator } from './PluginCreator';

export type BaseHost = Pick<typeof ts, 'createProgram' | 'versionMajorMinor'>;

export function patchCreateProgram<Host extends BaseHost>(tsm: Host, resolveBaseDir: string = process.cwd()): Host {
    const originCreateProgram = tsm.createProgram;
    tsm.createProgram = function newCreateProgram(
        rootNames: ReadonlyArray<string>,
        options: ts.CompilerOptions,
        host?: ts.CompilerHost,
        oldProgram?: ts.Program,
    ): ts.Program {
        const program = originCreateProgram(rootNames, options, host, oldProgram);
        const pluginCreator = new PluginCreator(
            preparePluginsFromCompilerOptions(program.getCompilerOptions().plugins),
            tsm,
            resolveBaseDir,
        );

        const originEmit = program.emit;
        program.emit = function newEmit(
            targetSourceFile?: ts.SourceFile,
            writeFile?: ts.WriteFileCallback,
            cancellationToken?: ts.CancellationToken,
            emitOnlyDtsFiles?: boolean,
            customTransformers: ts.CustomTransformers = pluginCreator.createTransformers({ program }),
        ): ts.EmitResult {
            return originEmit(targetSourceFile, writeFile, cancellationToken, emitOnlyDtsFiles, customTransformers);
        };

        return program;
    };

    return tsm;
}

function preparePluginsFromCompilerOptions(plugins: any): PluginConfig[] {
    if (!plugins) return [];
    // old transformers system
    if (plugins.length === 1 && plugins[0].customTransformers) {
        const { before = [], after = [] } = plugins[0].customTransformers;
        return [
            ...before.map((item) => ({ tranform: item, before: true })),
            ...after.map((item) => ({ tranform: item, after: true })),
        ];
    }
    return plugins;
}
