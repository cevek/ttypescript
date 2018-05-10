import * as ts from 'typescript';
import { PluginConfig, PluginCreator } from './PluginCreator';

export type BaseHost = Pick<typeof ts, 'createProgram' | 'versionMajorMinor'>;

export function patchCreateProgram<Host extends BaseHost>(tsm: Host, resolveBaseDir: string = process.cwd()): Host {
    const originCreateProgram = tsm.createProgram;
    tsm.createProgram = function newCreateProgram(
        rootNames: ReadonlyArray<string>,
        options: ts.CompilerOptions,
        host?: ts.CompilerHost,
        oldProgram?: ts.Program
    ): ts.Program {
        const program = originCreateProgram(rootNames, options, host, oldProgram);
        const compilerOptions = program.getCompilerOptions();
        const plugins = preparePluginsFromCompilerOptions(
            getPluginsFromCompilerOptions(compilerOptions, resolveBaseDir)
        );
        // console.log(plugins);
        const pluginCreator = new PluginCreator(plugins, resolveBaseDir);

        const originEmit = program.emit;
        program.emit = function newEmit(
            targetSourceFile?: ts.SourceFile,
            writeFile?: ts.WriteFileCallback,
            cancellationToken?: ts.CancellationToken,
            emitOnlyDtsFiles?: boolean,
            customTransformers: ts.CustomTransformers = pluginCreator.createTransformers({ program })
        ): ts.EmitResult {
            return originEmit(targetSourceFile, writeFile, cancellationToken, emitOnlyDtsFiles, customTransformers);
        };

        return program;
    };

    return tsm;
}

function getPluginsFromCompilerOptions(compilerOptions: ts.CompilerOptions, resolveBaseDir: string) {
    let plugins = compilerOptions.plugins;
    if (compilerOptions.configFilePath === undefined) {
        const configFileNamePath = ts.findConfigFile(resolveBaseDir, ts.sys.fileExists);
        if (configFileNamePath) {
            const config = readConfig(configFileNamePath, resolveBaseDir, ts);
            if (config !== undefined) {
                plugins = config.raw.compilerOptions.plugins || [];
            }
        }
    }
    return plugins;
}

function readConfig(configFileNamePath: string, projectDir: string, tsm: typeof ts) {
    const result = tsm.readConfigFile(configFileNamePath, tsm.sys.readFile);
    if (result.error) {
        throw new Error('tsconfig.json error: ' + result.error.messageText);
    }
    return tsm.parseJsonConfigFileContent(result.config, tsm.sys, projectDir, undefined, configFileNamePath);
}

function preparePluginsFromCompilerOptions(plugins: any): PluginConfig[] {
    if (!plugins) return [];
    // old transformers system
    if (plugins.length === 1 && plugins[0].customTransformers) {
        const { before = [], after = [] } = plugins[0].customTransformers;
        return [
            ...before.map((item: string) => ({ tranform: item, before: true })),
            ...after.map((item: string) => ({ tranform: item, after: true })),
        ];
    }
    return plugins;
}
