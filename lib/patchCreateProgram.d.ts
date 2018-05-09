import * as ts from 'typescript';
export declare function patchCreateProgram(tsm: {
    createProgram(rootNames: ReadonlyArray<string>, options: ts.CompilerOptions, host?: ts.CompilerHost, oldProgram?: ts.Program): ts.Program;
    versionMajorMinor: string;
}): void;
