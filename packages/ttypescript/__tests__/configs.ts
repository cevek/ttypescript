import { normalize } from "path";

export const configs = {
    tsNodePath: normalize(__dirname + '/../../../node_modules/ts-node/dist/bin.js'),
    typescriptFromLibPath: normalize(__dirname + '/../lib/typescript.js')
}