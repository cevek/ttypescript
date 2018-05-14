import { dirname } from 'path';
import * as ts from 'typescript';
import { PluginConfig, PluginCreator } from './PluginCreator';

export type BaseHost = Pick<typeof ts, 'createProgram' | 'versionMajorMinor'>;

export function patchCreateProgram<Host extends BaseHost>(
    tsm: Host,
    forceReadConfig = false,
    projectDir = process.cwd()
): Host {
    const originCreateProgram = tsm.createProgram;
    tsm.createProgram = function newCreateProgram(
        rootNames: ReadonlyArray<string>,
        compilerOptions: ts.CompilerOptions,
        host?: ts.CompilerHost,
        oldProgram?: ts.Program
    ): ts.Program {
        if (forceReadConfig) {
            const info = getConfig(compilerOptions, rootNames, projectDir);
            compilerOptions = info.compilerOptions;
            projectDir = info.projectDir;
        }
        const program = originCreateProgram(rootNames, compilerOptions, host, oldProgram);

        const plugins = preparePluginsFromCompilerOptions(compilerOptions.plugins);
        const pluginCreator = new PluginCreator(plugins, projectDir);

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

function getConfig(compilerOptions: ts.CompilerOptions, rootFileNames: ReadonlyArray<string>, defaultDir: string) {
    if (compilerOptions.configFilePath === undefined) {
        const dir = rootFileNames.length > 0 ? dirname(rootFileNames[0]) : defaultDir;
        const tsconfigPath = ts.findConfigFile(dir, ts.sys.fileExists);
        if (tsconfigPath) {
            const projectDir = dirname(tsconfigPath);
            const config = readConfig(tsconfigPath, dirname(tsconfigPath), ts);
            compilerOptions = { ...config.options, ...compilerOptions };
            return {
                projectDir,
                compilerOptions,
            };
        }
    }
    return {
        projectDir: dirname(compilerOptions.configFilePath as string),
        compilerOptions,
    };
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
            ...before.map((item: string) => ({ transform: item, before: true })),
            ...after.map((item: string) => ({ transform: item, after: true })),
        ];
    }
    return plugins;
}
