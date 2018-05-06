import Module from 'module';
export function customRequireResolve(dir: string, module: string) {
    const m = new Module('');
    m.filename = dir + '/index.js';
    m.paths = (Module as any)._nodeModulePaths(dir);
    return (Module as any)._resolveFilename(module, m);
}
export function customRequire(dir: string, module: string) {
    const m = new Module(dir + '/index.js');
    m.filename = dir + '/index.js';
    m.paths = (Module as any)._nodeModulePaths(dir);
    return (Module as any)._load(module, m);
}