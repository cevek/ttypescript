"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const module_1 = __importDefault(require("module"));
function customRequireResolve(dir, module) {
    const m = new module_1.default('');
    m.filename = dir + '/index.js';
    m.paths = module_1.default._nodeModulePaths(dir);
    return module_1.default._resolveFilename(module, m);
}
exports.customRequireResolve = customRequireResolve;
function customRequire(dir, module) {
    const m = new module_1.default(dir + '/index.js');
    m.filename = dir + '/index.js';
    m.paths = module_1.default._nodeModulePaths(dir);
    return module_1.default._load(module, m);
}
exports.customRequire = customRequire;
