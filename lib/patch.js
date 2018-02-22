const Module = require('module');
const path = require('path');
require('ts-node').register({ project: __dirname + '/../ts-node-config' });

function bindSecondArg(fn, secondArg) {
    return function (firstArg) {
        return fn(firstArg, secondArg);
    }
}

let globalProgram;

function requireTransformer(dir, module) {
    const m = new Module();
    m.filename = dir + '/index.js';
    m.paths = Module._nodeModulePaths(dir);
    const transformer = Module._load(module, m);
    if (typeof transformer === 'function') {
        return bindSecondArg(transformer, globalProgram);
    }
    if (typeof transformer.default === 'function') {
        return bindSecondArg(transformer.default, globalProgram);
    }
    // skip if empty object - recursion bug
    if (transformer && typeof transformer === 'object' && Object.keys(transformer).length === 0) {
        return;
    }
    console.error(`Transformer "${module}" must export a function; got: ${JSON.stringify(transformer)}`);
}

module.exports = function(ts) {
    const originCreateProgram = ts.createProgram;
    const originEmitFiles = ts.emitFiles;
    ts.version += '.transformers';

    ts.createProgram = function() {
        return globalProgram = originCreateProgram.apply(this, arguments);
    }
    ts.emitFiles = function(resolver, host, targetSourceFile, emitOnlyDtsFiles, transformers) {
        const compilerOptions = host.getCompilerOptions();
        const currentDir = compilerOptions.configFilePath
            ? path.dirname(compilerOptions.configFilePath)
            : process.cwd();
        // const options = compilerOptions.configFile ? ts.convertToObject(compilerOptions.configFile) : compilerOptions;
        const customTransformers = compilerOptions.plugins
            ? compilerOptions.plugins.reduce((t, p) => (t ? t : p.customTransformers), undefined)
            : undefined;
        label: {
            if (customTransformers) {
                const errorPrefix = `plugins.customTransformers`;
                if (typeof customTransformers !== 'object' || Array.isArray(customTransformers)) {
                    console.error(`${errorPrefix} is not an object; got: ${JSON.stringify(customTransformers)}`);
                    break label;
                }
                const keys = Object.keys(customTransformers);
                keys.forEach(key => {
                    if (key !== 'before' && key !== 'after') {
                        console.error(`Unknown property: ${errorPrefix}.${key}`);
                    }
                });
                const before = customTransformers.before;
                const after = customTransformers.after;
                if (before) {
                    if (!Array.isArray(before)) {
                        console.error(`${errorPrefix}.before is not an array; got: ` + JSON.stringify(before));
                        break label;
                    }
                    for (let i = before.length - 1; i >= 0; i--) {
                        const transformerPath = before[i];
                        const transformer = requireTransformer(currentDir, transformerPath);
                        if (transformer) {
                            transformers.unshift(transformer);
                        }
                    }
                }
                if (after) {
                    if (!Array.isArray(after)) {
                        console.error(`${errorPrefix}.after is not an array; got: ` + JSON.stringify(after));
                        break label;
                    }
                    for (let i = 0; i < after.length; i++) {
                        const transformerPath = after[i];
                        const transformer = requireTransformer(currentDir, transformerPath);
                        if (transformer) {
                            transformers.push(transformer);
                        }
                    }
                }
            }
        }
        return originEmitFiles(resolver, host, targetSourceFile, emitOnlyDtsFiles, transformers);
    };
    return ts;
};
