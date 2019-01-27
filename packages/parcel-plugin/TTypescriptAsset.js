const vm = require('vm');
const { createRequireFromPath } = require('module');
const tsAssetPath = require.resolve('parcel-bundler/src/assets/TypeScriptAsset.js');
const original = require('fs').readFileSync(tsAssetPath, 'utf8');
const patchedAsset = original.replace(/'typescript'/g, "'ttypescript'").replace(/this\.relativeName/g, 'this.name');
const factory = vm.runInThisContext(
    `(function (exports, require, module, __filename, __dirname) {${patchedAsset}\n});`,
    { filename: this.filename, lineOffset: 0, displayErrors: true }
);
const _require = createRequireFromPath(tsAssetPath);
factory(module.exports, _require, module, __filename, __dirname);
