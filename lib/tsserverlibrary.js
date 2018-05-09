"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
var tssl = __importStar(require("typescript/lib/tsserverlibrary"));
var patchCreateProgram_1 = require("./patchCreateProgram");
patchCreateProgram_1.patchCreateProgram(tssl);
exports.default = tssl;
