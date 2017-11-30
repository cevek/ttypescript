const Module = require('module');
function customRequire(dir, module) {
    const m = new Module();
    m.filename = dir + '/index.js';
    m.paths = Module._nodeModulePaths(dir);
    return Module._load(module, m);
}

module.exports = (function (ts) {
    const origin = ts.emitFiles;

    const item = {
        name: "customTransformers",
        paramType: ts.Diagnostics.KIND,
        type: "object",
    };
    ts.optionDeclarations.push(item);

    ts.emitFiles = function (resolver, host, targetSourceFile, emitOnlyDtsFiles, transformers) {
        const currentDir = host.getCurrentDirectory();
        const options = host.getCompilerOptions();
        if (options.customTransformers) {
            const before = options.customTransformers.before;
            const after = options.customTransformers.after;
            if (before) {
                if (!Array.isArray(before)) {
                    throw new Error('customTransformers.before is not an array: ' + JSON.stringify(before));
                }
                for (let i = before.length - 1; i >= 0; i--) {
                    const transformerPath = before[i];
                    const transformer = customRequire(currentDir, transformerPath);
                    transformers.unshift(transformer);
                }
            }
            if (after) {
                if (!Array.isArray(after)) {
                    throw new Error('customTransformers.after is not an array: ' + JSON.stringify(after));
                }
                for (let i = 0; i < after.length; i++) {
                    const transformerPath = after[i];
                    const transformer = customRequire(currentDir, transformerPath);
                    transformers.push(transformer);
                }
            }
        }
        return origin(resolver, host, targetSourceFile, emitOnlyDtsFiles, transformers);
    };
    return ts;
});