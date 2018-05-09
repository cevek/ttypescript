"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-ignore
var ts = __importStar(require("typescript/lib/tsserver"));
var patchCreateProgram_1 = require("./patchCreateProgram");
patchCreateProgram_1.patchCreateProgram(ts);
exports.default = ts;
