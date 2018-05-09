"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var PluginCreator_1 = require("./PluginCreator");
function patchCreateProgram(tsm) {
    var basedir = process.cwd();
    var originCreateProgram = tsm.createProgram;
    tsm.createProgram = function newCreateProgram(rootNames, options, host, oldProgram) {
        var program = originCreateProgram(rootNames, options, host, oldProgram);
        var creator = new PluginCreator_1.PluginCreator(program.getCompilerOptions().plugins, tsm.versionMajorMinor, basedir);
        var originEmit = program.emit;
        program.emit = function newEmit(targetSourceFile, writeFile, cancellationToken, emitOnlyDtsFiles, customTransformers) {
            var newCustomTransformers = customTransformers && (customTransformers.before
                || customTransformers.after
                || customTransformers.afterDeclaration)
                ? customTransformers
                : creator.createTransformers(program);
            return originEmit(targetSourceFile, writeFile, cancellationToken, emitOnlyDtsFiles, newCustomTransformers);
        };
        return program;
    };
}
exports.patchCreateProgram = patchCreateProgram;
