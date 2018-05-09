import * as ts from 'typescript';
export declare type TransformerPlugin = {
    before?: ts.TransformerFactory<ts.SourceFile>;
    after?: ts.TransformerFactory<ts.SourceFile>;
    afterDeclaration?: ts.TransformerFactory<ts.SourceFile>;
} | ts.TransformerFactory<ts.SourceFile>;
export declare type FactoryType = 'ls' | 'program' | 'opts' | 'checker';
export declare type PluginConfig = {
    transform: string;
    type?: FactoryType;
    after?: boolean;
    before?: boolean;
    afterDeclaration?: boolean;
    [options: string]: any;
} | (ts.PluginImport & {
    [options: string]: any;
});
export declare type PluginFactory = {
    type: 'ls';
    (ls: ts.LanguageService, options?: PluginConfig): TransformerPlugin;
} | {
    type?: 'program';
    (program: ts.Program, options?: PluginConfig): TransformerPlugin;
} | {
    type: 'opts';
    (opts: ts.CompilerOptions, options?: PluginConfig): TransformerPlugin;
} | {
    type: 'checker';
    (opts: ts.TypeChecker, options?: PluginConfig): TransformerPlugin;
};
export declare type TransformerHost = ts.LanguageService | ts.Program | ts.CompilerOptions | ts.TypeChecker;
/**
 * @example
 *
 * new PluginCreator([
 *   {transform: '@zerollup/ts-transform-paths', someOption: '123'},
 *   {transform: '@zerollup/ts-transform-paths', type: 'ls', someOption: '123'},
 *   {transform: '@zerollup/ts-transform-paths', type: 'ls', after: true, someOption: '123'}
 * ]).createTransformers(program)
 */
export declare class PluginCreator {
    private configs;
    private basedir;
    private isOldVersion;
    constructor(configs: PluginConfig[], versionMajorMinor?: string | void, basedir?: string);
    private resolveFactory(transform);
    createTransformers: (main: TransformerHost) => ts.CustomTransformers;
    private _createTransformers(main);
}
