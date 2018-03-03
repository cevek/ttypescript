const Module = require('module');
const path = require('path');
require('ts-node').register({ project: __dirname + '/../ts-node-config/tsconfig.json' });

function bindSecondArg(fn, secondArg) {
    return function(firstArg) {
        return fn(firstArg, secondArg);
    };
}

module.exports = function(ts) {
    const originCreateProgram = ts.createProgram;
    ts.version += '.transformers';

    ts.createProgram = function() {
        const program = originCreateProgram.apply(this, arguments);
        const originEmit = program.emit;
        program.emit = function(sourceFile, writeFileCallback, cancellationToken, emitOnlyDtsFiles, transformers) {
            transformers = getCustomTransformersFromConfig(program, transformers);
            return originEmit(sourceFile, writeFileCallback, cancellationToken, emitOnlyDtsFiles, transformers);
        };
        return program;
    };
    return ts;
};

function requireTransformer(dir, module, program) {
    const m = new Module();
    m.filename = dir + '/index.js';
    m.paths = Module._nodeModulePaths(dir);
    const transformer = Module._load(module, m);
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

function getCustomTransformersFromConfig(program, { before = [], after = [] } = {}) {
    const transformers = { before, after };
    const compilerOptions = program.getCompilerOptions();
    const currentDir = compilerOptions.configFilePath ? path.dirname(compilerOptions.configFilePath) : process.cwd();
    const customTransformers = compilerOptions.plugins
        ? compilerOptions.plugins.reduce((t, p) => (t ? t : p.customTransformers), undefined)
        : undefined;
    if (customTransformers) {
        const errorPrefix = `plugins.customTransformers`;
        if (typeof customTransformers !== 'object' || Array.isArray(customTransformers)) {
            console.error(`${errorPrefix} is not an object; got: ${JSON.stringify(customTransformers)}`);
            return transformers;
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
                return transformers;
            }
            for (let i = before.length - 1; i >= 0; i--) {
                const transformerPath = before[i];
                const transformer = requireTransformer(currentDir, transformerPath, program);
                if (transformer) {
                    transformers.before.unshift(transformer);
                }
            }
        }
        if (after) {
            if (!Array.isArray(after)) {
                console.error(`${errorPrefix}.after is not an array; got: ` + JSON.stringify(after));
                return transformers;
            }
            for (let i = 0; i < after.length; i++) {
                const transformerPath = after[i];
                const transformer = requireTransformer(currentDir, transformerPath, program);
                if (transformer) {
                    transformers.after.push(transformer);
                }
            }
        }
    }
    return transformers;
}
