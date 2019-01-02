import { readFileSync } from 'fs';
import { loadTypeScript, resolveTypeScriptModule, TypeScriptModule, TypeScriptModuleLoader } from './loadTypescript';

const folder = process.cwd()
const ts = loadTypeScript('typescript', {folder, forceConfigLoad: true});
const tscFileName = resolveTypeScriptModule('tsc', folder);

const loader = new TypeScriptModuleLoader(
    tscFileName,
    readFileSync(tscFileName, 'utf8')
        .replace(/^[\s\S]+(\(function \(ts\) \{\s+function countLines[\s\S]+)$/, '$1')
        .replace('ts.executeCommandLine(ts.sys.args);', ''));

loader.loadToModule(new TypeScriptModule(tscFileName), ts);

(ts as any).executeCommandLine(ts.sys.args);
