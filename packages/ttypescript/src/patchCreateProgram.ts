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

    function createProgram(createProgramOptions: ts.CreateProgramOptions): ts.Program;
    function createProgram(
        rootNames: ReadonlyArray<string>,
        options: ts.CompilerOptions,
        host?: ts.CompilerHost,
        oldProgram?: ts.Program,
        configFileParsingDiagnostics?: ReadonlyArray<ts.Diagnostic>
    ): ts.Program;
    function createProgram(
        rootNamesOrOptions: ReadonlyArray<string> | ts.CreateProgramOptions,
        _options?: ts.CompilerOptions,
        _host?: ts.CompilerHost,
        _oldProgram?: ts.Program,
        _configFileParsingDiagnostics?: ReadonlyArray<ts.Diagnostic>
    ): ts.Program {
        const createProgramOptions: ts.CreateProgramOptions = Array.isArray(rootNamesOrOptions)
            ? {
                  rootNames: rootNamesOrOptions,
                  options: _options!,
                  host: _host,
                  oldProgram: _oldProgram,
                  configFileParsingDiagnostics: _configFileParsingDiagnostics,
              }
            : (rootNamesOrOptions as ts.CreateProgramOptions);

        if (forceReadConfig) {
            const info = getConfig(createProgramOptions.options, createProgramOptions.rootNames, projectDir);
            createProgramOptions.options = info.compilerOptions;
            projectDir = info.projectDir;
        }
        const program = originCreateProgram(createProgramOptions);

        const plugins = preparePluginsFromCompilerOptions(createProgramOptions.options.plugins);
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
    }
    tsm.createProgram = createProgram;
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
        const { before = [], after = [] } = plugins[0].customTransformers as { before: string[]; after: string[] };
        return [
            ...before.map((item: string) => ({ transform: item })),
            ...after.map((item: string) => ({ transform: item, after: true })),
        ];
    }
    return plugins;
}
