import * as TS from 'typescript';
import { dirname } from 'path';
import { customRequire } from './customRequire';
require('ts-node').register({ project: __dirname + '/../ts-node-config/tsconfig.json' });

interface CustomCompilerOptions extends TS.CompilerOptions {
    // @ts-ignore
    plugins?: CustomTransformers[];
    configFilePath?: string;
}
interface CustomTransformers {
    customTransformers?: TransformerConfig;
}

interface TransformerConfig {
    pre?: string[];
    before?: string[];
    after?: string[];
}

interface Transformers {
    before: Function[];
    after: Function[];
}

export default function(ts: typeof TS, tsDirname: string) {
    const originCreateProgram = ts.createProgram;
    // (ts as any).version += '.transformers';

    ts.createProgram = function(
        rootNames: ReadonlyArray<string>,
        options: TS.CompilerOptions,
        host?: TS.CompilerHost,
        oldProgram?: TS.Program
    ): TS.Program {
        const program = originCreateProgram(rootNames, options, host, oldProgram);
        const compilerOptions = program.getCompilerOptions() as CustomCompilerOptions;
        const projectDir = compilerOptions.configFilePath ? dirname(compilerOptions.configFilePath) : process.cwd();
        console.log('Used TypeScript from: ' + dirname(tsDirname) + ', version: ' + ts.version);
        // console.log('TypeScript from: ' + tsDirname);

        const originEmit = program.emit;
        program.emit = function(
            targetSourceFile?: TS.SourceFile,
            writeFile?: TS.WriteFileCallback,
            cancellationToken?: TS.CancellationToken,
            emitOnlyDtsFiles?: boolean,
            customTransformers?: TS.CustomTransformers
        ): TS.EmitResult {
            const transformers = getCustomTransformersFromConfig(
                program,
                compilerOptions,
                projectDir,
                customTransformers
            ) as TS.CustomTransformers;
            return originEmit(targetSourceFile, writeFile, cancellationToken, emitOnlyDtsFiles, transformers);
        };
        return program;
    };
    return ts;
}

function requireTransformer(dir: string, module: string, program: TS.Program): Function | undefined {
    const transformer = customRequire(dir, module);
    if (typeof transformer === 'function') {
        return bindSecondArg(transformer, program);
    }
    if (typeof transformer.default === 'function') {
        return bindSecondArg(transformer.default, program);
    }
    // skip if empty object - recursion bug
    if (transformer && typeof transformer === 'object' && Object.keys(transformer).length === 0) {
        return;
    }
    console.error(`Transformer "${module}" must export a function; got: ${JSON.stringify(transformer)}`);
}

function addCustomTranformers(
    program: TS.Program,
    projectDir: string,
    transformerPathList: string[] | undefined,
    transformers: Transformers,
    type: 'before' | 'after'
) {
    if (transformerPathList === undefined) return;
    if (!Array.isArray(transformerPathList)) {
        console.error(
            `plugins.customTransformers.${type} is not an array; got: ` + JSON.stringify(transformerPathList)
        );
        return transformerPathList;
    }
    for (let i = 0; i < transformerPathList.length; i++) {
        const transformerPath = transformerPathList[i];
        const transformer = requireTransformer(projectDir, transformerPath, program);
        if (transformer !== undefined) {
            if (type === 'after') {
                transformers.after.push(transformer);
            } else {
                transformers.before.unshift(transformer);
            }
        }
    }
}

function getCustomTransformersFromConfig(
    program: TS.Program,
    compilerOptions: CustomCompilerOptions,
    projectDir: string,
    prevTransformers: Partial<Transformers> = {}
) {
    const { before = [], after = [] } = prevTransformers;
    const transformers: Transformers = { before, after };
    const { plugins = [] } = compilerOptions;
    const { customTransformers = {} } = plugins.find(plugin => !!plugin.customTransformers) || {
        customTransformers: undefined,
    };
    if (typeof customTransformers !== 'object' || Array.isArray(customTransformers)) {
        console.error(`plugins.customTransformers is not an object; got: ${JSON.stringify(customTransformers)}`);
        return transformers;
    }
    const keys = Object.keys(customTransformers);
    keys.forEach(key => {
        if (key !== 'before' && key !== 'after' && key !== 'pre') {
            console.error(`Unknown property: plugins.customTransformers.${key}`);
        }
    });
    addCustomTranformers(program, projectDir, customTransformers.before, transformers, 'before');
    addCustomTranformers(program, projectDir, customTransformers.after, transformers, 'after');
    return transformers;
}

function bindSecondArg(fn: Function, secondArg: {}) {
    return function(firstArg: {}) {
        return fn(firstArg, secondArg);
    };
}

// var copyHost = ts.createCompilerHost(options);
// var filesMap = new Map();
// var transformedFilesMap = new Map();
// var origGetTransformers = ts.getTransformers;

// copyHost.writeFile = (fileName, data) => {
//     filesMap.set(fileName.replace(/\.js(x)?$/, '.ts$1'), data);
//     // console.log('write', fileName, data);
// };
// const copyProgram = originCreateProgram(origSourceFiles, options, copyHost);
// var transformers = getCustomTransformersFromConfig(copyProgram, origCompilerOptions);
// ts.getTransformers = () => {
//     return [...transformers.before, dd];
// };
// copyProgram.emit(undefined, undefined, undefined, undefined, transformers);
// // }
// ts.getTransformers = origGetTransformers;

// var origGetSource = origHost.getSourceFile;
// origHost.getSourceFile = (filename, ...args) => {
//     var tSourceFile = transformedFilesMap.get(filename);
//     if (tSourceFile) {
//         if (!tSourceFile.ambientModuleNames) {
//             tSourceFile.ambientModuleNames = [];
//         }
//         tSourceFile.flags = 0;
//         return tSourceFile;
//     }
//     return origGetSource(filename, ...args);
// };

// const program = originCreateProgram(origSourceFiles, origCompilerOptions, origHost);
// const originEmit = program.emit;
// var files = program.getSourceFiles();
