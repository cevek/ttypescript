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
    const originCreateProgram = tsm.createProgram;
    const {createProgram : _, ...rest1} = tsm;
    function hackCreateProgram(createProgramOptions: ts.CreateProgramOptions): ts.Program;
    function hackCreateProgram(
        rootNames: ReadonlyArray<string>,
        options: ts.CompilerOptions,
        host?: ts.CompilerHost,
        oldProgram?: ts.Program,
        configFileParsingDiagnostics?: ReadonlyArray<ts.Diagnostic>
    ): ts.Program;
    function hackCreateProgram(
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
            const info = getConfig(tsm, options, rootNames, projectDir);
            options = info.compilerOptions;
            if (createOpts) {
                createOpts.options = options;
            }
            projectDir = info.projectDir;
        }
        const program: ts.Program = createOpts
            ? originCreateProgram(createOpts)
            : originCreateProgram(rootNames, options, host, oldProgram, configFileParsingDiagnostics);

        const plugins = preparePluginsFromCompilerOptions(options.plugins);
        const pluginCreator = new PluginCreator(tsm, plugins, projectDir);

        const originEmit = program.emit;

        /**
         * The emit method has the following declaration:
         * https://github.com/microsoft/TypeScript/blob/bfc55b5762443c37ecdef08a3b5a4e057b4d1e85/src/compiler/builderPublic.ts#L101
         * The declaration specifies 5 arguments, but it's not true. Sometimes the emit method takes 6 arguments.
         */
        program.emit = function newEmit(
            targetSourceFile?: ts.SourceFile,
            writeFile?: ts.WriteFileCallback,
            cancellationToken?: ts.CancellationToken,
            emitOnlyDtsFiles?: boolean,
            customTransformers?: ts.CustomTransformers,
            arg?: boolean
        ): ts.EmitResult {
            const mergedTransformers = pluginCreator.createTransformers({ program }, customTransformers);
            const result: ts.EmitResult = (originEmit as any)(
                targetSourceFile,
                writeFile,
                cancellationToken,
                emitOnlyDtsFiles,
                mergedTransformers,
                arg
            );
            // todo: doesn't work with 3.7
            // result.diagnostics = [...result.diagnostics, ...transformerErrors.get(program)!];
            return result;
        };
        return program;
    }
    (rest1 as typeof ts).createProgram = hackCreateProgram;
    
    return injectionShadowedValues(rest1) as typeof ts;
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

function injectionShadowedValues(target : any){
    target.getDefaultCompilerOptions2 = function getDefaultCompilerOptions2() {
        return {
            target: 1 /* ES5 */,
            jsx: 1 /* Preserve */
        };
    };
    function fail(message:string, stackCrawlMark : any) {
        debugger;
        const e = new Error(message ? `Debug Failure. ${message}` : "Debug Failure.");
        if (Error.captureStackTrace) {
          Error.captureStackTrace(e, stackCrawlMark || fail);
        }
        throw e;
      }

    function assertEqual(a : any, b : any, msg : string, msg2 : string, stackCrawlMark : any) {
        if (a !== b) {
            const message = msg ? msg2 ? `${msg} ${msg2}` : msg : "";
            fail(`Expected ${a} === ${b}. ${message}`, stackCrawlMark || assertEqual);
        }
    };
    target.assertEqual = assertEqual;
    function fileExtensionIs(path : string, extension : string){
        return path.length > extension.length && path.endsWith(extension)
    }
    try {
        let originTranspileModule = (target.transpileModule as any).toString()
            .replace(/(?<!function)\s([a-z][A-Za-z0-9]+)\(/g, " target.$1(")
            .replace("hasProperty", "target.hasProperty")
            .replace(/Debug\./g, "target.")
            .replace("transpileOptionValueCompilerOptions", "target.transpileOptionValueCompilerOptions");
        const {transpileModule : __, ..._target} = target;
        (_target as typeof ts).transpileModule = eval("(" + originTranspileModule + ")");
        return _target;
    } catch (e) {
        return target;
    }
 }