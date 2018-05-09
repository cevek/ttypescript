"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var ts = __importStar(require("typescript"));
var resolve = __importStar(require("resolve"));
var compare_versions_1 = __importDefault(require("compare-versions"));
function patchEmitFiles() {
    var a = ts;
    if (a.emitFiles.__patched)
        return a.emitFiles.__patched;
    var dtsTransformers = a.emitFiles.__patched = [];
    var oldEmitFiles = a.emitFiles;
    /**
     * Hack
     * Typescript 2.8 does not support transforms for declaration emit
     * see https://github.com/Microsoft/TypeScript/issues/23701
     */
    a.emitFiles = function newEmitFiles(resolver, host, targetSourceFile, emitOnlyDtsFiles, transformers) {
        var newTransformers = transformers;
        if (emitOnlyDtsFiles && !transformers || transformers.length === 0) {
            newTransformers = dtsTransformers;
        }
        return oldEmitFiles(resolver, host, targetSourceFile, emitOnlyDtsFiles, newTransformers);
    };
    a.emitFiles.__patched = dtsTransformers;
    return dtsTransformers;
}
var TransformerPluginFactory = /** @class */ (function () {
    function TransformerPluginFactory(main) {
        this.ls = typeof main.getProgram === 'function'
            ? main
            : undefined;
        this.program = this.ls
            ? this.ls.getProgram()
            : (typeof main.getTypeChecker === 'function'
                ? main
                : undefined);
        this.checker = this.program
            ? this.program.getTypeChecker()
            : (typeof main.getBaseTypes === 'function'
                ? main
                : undefined);
        this.opts = this.program
            ? this.program.getCompilerOptions()
            : (typeof main.getBaseTypes === 'function'
                ? undefined
                : main);
    }
    TransformerPluginFactory.prototype.createPlugin = function (factory, options) {
        var name = options.transformer || options.name;
        switch (factory.type) {
            case 'ls':
                if (!this.ls)
                    throw new Error("Plugin " + name + " need a LanguageService");
                return factory(this.ls, options);
            case 'opts':
                if (!this.opts)
                    throw new Error("Plugin " + name + " need a CompilerOptions");
                return factory(this.opts, options);
            case 'checker':
                if (!this.checker)
                    throw new Error("Plugin " + name + " need a TypeChecker");
                return factory(this.checker, options);
            case 'program':
            default:
                if (!this.program)
                    throw new Error("Plugin " + name + " need a Program");
                return factory(this.program, options);
        }
    };
    return TransformerPluginFactory;
}());
/**
 * @example
 *
 * new PluginCreator([
 *   {transform: '@zerollup/ts-transform-paths', someOption: '123'},
 *   {transform: '@zerollup/ts-transform-paths', type: 'ls', someOption: '123'},
 *   {transform: '@zerollup/ts-transform-paths', type: 'ls', after: true, someOption: '123'}
 * ]).createTransformers(program)
 */
var PluginCreator = /** @class */ (function () {
    function PluginCreator(configs, versionMajorMinor, basedir) {
        if (basedir === void 0) { basedir = process.cwd(); }
        var _this = this;
        this.configs = configs;
        this.basedir = basedir;
        this.createTransformers = function (main) { return _this._createTransformers(main); };
        this.isOldVersion = compare_versions_1.default('2.9', versionMajorMinor || '2.8') < 0;
    }
    PluginCreator.prototype.resolveFactory = function (transform) {
        var modulePath = resolve.sync(transform, { basedir: this.basedir });
        var module = require(modulePath);
        return typeof module.default === 'function'
            ? module.default
            : module;
    };
    PluginCreator.prototype._createTransformers = function (main) {
        var chain = {
            before: [],
            after: [],
            afterDeclaration: this.isOldVersion ? patchEmitFiles() : []
        };
        var pluginFactory = new TransformerPluginFactory(main);
        for (var _i = 0, _a = this.configs; _i < _a.length; _i++) {
            var config = _a[_i];
            if (!config.transform)
                continue;
            var factory = this.resolveFactory(config.transform);
            if (config.type && factory.type === undefined) {
                factory.type = config.type;
            }
            var plugin = pluginFactory.createPlugin(factory, config);
            if (typeof plugin === 'function') {
                if (config.after)
                    chain.after.push(plugin);
                if (config.afterDeclaration)
                    chain.afterDeclaration.push(plugin);
                if (config.before
                    || (config.before === undefined
                        && config.after === undefined
                        && config.afterDeclaration === undefined))
                    chain.before.push(plugin);
            }
            else {
                if (plugin.before)
                    chain.before.push(plugin.before);
                if (plugin.after)
                    chain.after.push(plugin.after);
                if (plugin.afterDeclaration)
                    chain.afterDeclaration.push(plugin.afterDeclaration);
            }
        }
        return chain;
    };
    return PluginCreator;
}());
exports.PluginCreator = PluginCreator;
