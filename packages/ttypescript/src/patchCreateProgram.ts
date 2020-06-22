import { dirname } from 'path';
import * as ts from 'typescript';
import { PluginConfig, PluginCreator } from './PluginCreator';
import { Diagnostic } from 'typescript/lib/tsserverlibrary';

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

export const transformerErrors = new WeakMap<ts.Program, Diagnostic[]>();
export function addDiagnosticFactory(program: ts.Program) {
    return (diag: ts.Diagnostic) => {
        const arr = transformerErrors.get(program) || [];
        arr.push(diag);
        transformerErrors.set(program, arr);
    };
}

export function patchCreateProgram(tsm: typeof ts, forceReadConfig = false, projectDir = process.cwd()) {
    const originCreateProgram = tsm.createProgram as any;

    function createProgramWithOpts(createProgramOptions: ts.CreateProgramOptions): ts.Program {
        if (forceReadConfig) {
            const info = getConfig(tsm, createProgramOptions.options, createProgramOptions.rootNames, projectDir);
            createProgramOptions.options = info.compilerOptions;
            projectDir = info.projectDir;
        }

        const plugins = preparePluginsFromCompilerOptions(createProgramOptions.options.plugins);
        const pluginCreator = new PluginCreator(tsm, plugins, projectDir);

        const middlewares = pluginCreator.createMiddlewares({
            createProgram: originCreateProgram
        });

        const program: ts.Program = middlewares.createProgram(createProgramOptions);

        const originEmit = program.emit;
        program.emit = function newEmit(
            targetSourceFile?: ts.SourceFile,
            writeFile?: ts.WriteFileCallback,
            cancellationToken?: ts.CancellationToken,
            emitOnlyDtsFiles?: boolean,
            customTransformers?: ts.CustomTransformers
        ): ts.EmitResult {
            const mergedTransformers = pluginCreator.createTransformers({ program }, customTransformers);
            const result: ts.EmitResult = originEmit(
                targetSourceFile,
                writeFile,
                cancellationToken,
                emitOnlyDtsFiles,
                mergedTransformers
            );
            // todo: doesn't work with 3.7
            // result.diagnostics = [...result.diagnostics, ...transformerErrors.get(program)!];
            return result;
        };
        return program;
    }

    function createProgram(createProgramOptions: ts.CreateProgramOptions): ts.Program;
    function createProgram(
        rootNames: ReadonlyArray<string>,
        options: ts.CompilerOptions,
        host?: ts.CompilerHost,
        oldProgram?: ts.Program,
        configFileParsingDiagnostics?: ReadonlyArray<ts.Diagnostic>
    ): ts.Program;
    function createProgram(
        createProgramOptionsOrRootNames: ts.CreateProgramOptions | ReadonlyArray<string>,
        options?: ts.CompilerOptions,
        host?: ts.CompilerHost,
        oldProgram?: ts.Program,
        configFileParsingDiagnostics?: ReadonlyArray<ts.Diagnostic>
    ): ts.Program {
        if (Array.isArray(createProgramOptionsOrRootNames)) {
            return createProgramWithOpts({
                rootNames: createProgramOptionsOrRootNames as ReadonlyArray<string>,
                options: options!,
                host,
                oldProgram,
                configFileParsingDiagnostics
            });
        } else {
            return createProgramWithOpts(createProgramOptionsOrRootNames as ts.CreateProgramOptions);
        }
    }

    tsm.createProgram = createProgram;

    return tsm;
}

function getConfig(
    tsm: typeof ts,
    compilerOptions: ts.CompilerOptions,
    rootFileNames: ReadonlyArray<string>,
    defaultDir: string
) {
    if (compilerOptions.configFilePath === undefined) {
        const dir = rootFileNames.length > 0 ? dirname(rootFileNames[0]) : defaultDir;
        const tsconfigPath = tsm.findConfigFile(dir, tsm.sys.fileExists);
        if (tsconfigPath) {
            const projectDir = dirname(tsconfigPath);
            const config = readConfig(tsm, tsconfigPath, dirname(tsconfigPath));
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

function readConfig(tsm: typeof ts, configFileNamePath: string, projectDir: string) {
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
