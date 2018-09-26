import { dirname } from 'path';
import * as ts from 'typescript';
import { PluginConfig, PluginCreator } from './PluginCreator';

declare module 'typescript' {
    interface CreateProgramOptions {
        rootNames: ReadonlyArray<string>;
        options: ts.CompilerOptions;
        projectReferences?: ReadonlyArray<ts.ProjectReference>;
        host?: ts.CompilerHost;
        oldProgram?: ts.Program;
        configFileParsingDiagnostics?: ReadonlyArray<ts.Diagnostic>;
    }
    interface ProjectReference {
        path: string;
        originalPath?: string;
        prepend?: boolean;
        circular?: boolean;
    }
}

export function patchCreateProgram(tsm: typeof ts, forceReadConfig = false, projectDir = process.cwd()) {
    const originCreateProgram = tsm.createProgram as any;

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
        options?: ts.CompilerOptions,
        host?: ts.CompilerHost,
        oldProgram?: ts.Program,
        configFileParsingDiagnostics?: ReadonlyArray<ts.Diagnostic>
    ): ts.Program {
        let rootNames;
        let createOpts: ts.CreateProgramOptions | undefined;
        if (!Array.isArray(rootNamesOrOptions)) {
            createOpts = rootNamesOrOptions as ts.CreateProgramOptions;
        }
        if (createOpts) {
            rootNames = createOpts.rootNames;
            options = createOpts.options;
            host = createOpts.host;
            oldProgram = createOpts.oldProgram;
            configFileParsingDiagnostics = createOpts.configFileParsingDiagnostics;
        } else {
            options = options!;
            rootNames = rootNamesOrOptions as ReadonlyArray<string>;
        }

        if (forceReadConfig) {
            const info = getConfig(options, rootNames, projectDir);
            options = info.compilerOptions;
            if (createOpts) {
                createOpts.options = options;
            }
            projectDir = info.projectDir;
        }
        const program = createOpts
            ? originCreateProgram(createOpts)
            : originCreateProgram(rootNames, options, host, oldProgram, configFileParsingDiagnostics);

        const plugins = preparePluginsFromCompilerOptions(options.plugins);
        const pluginCreator = new PluginCreator(tsm, plugins, projectDir);

        const originEmit = program.emit;
        program.emit = function newEmit(
            targetSourceFile?: ts.SourceFile,
            writeFile?: ts.WriteFileCallback,
            cancellationToken?: ts.CancellationToken,
            emitOnlyDtsFiles?: boolean,
            customTransformers?: ts.CustomTransformers
        ): ts.EmitResult {
            const mergedTransformers = pluginCreator.createTransformers({ program }, customTransformers)
            return originEmit(targetSourceFile, writeFile, cancellationToken, emitOnlyDtsFiles, mergedTransformers);
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
            const config = readConfig(tsconfigPath, dirname(tsconfigPath));
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

function readConfig(configFileNamePath: string, projectDir: string) {
    const result = ts.readConfigFile(configFileNamePath, ts.sys.readFile);
    if (result.error) {
        throw new Error('tsconfig.json error: ' + result.error.messageText);
    }
    return ts.parseJsonConfigFileContent(result.config, ts.sys, projectDir, undefined, configFileNamePath);
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
