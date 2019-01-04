import Module = require('module')
import resolve = require('resolve');
import path = require('path');
import vm = require('vm');

import { loadTypeScript } from 'ttypescript/lib/loadTypescript';

describe('loadTypeScript', () => {

    const originalResolveSync = resolve.sync;

    beforeEach(() => {
        jest.spyOn(resolve, 'sync').mockImplementation((id: string, opts?: resolve.SyncOpts) => {
            if (opts && opts.basedir === 'mocks') {
                return path.join(__dirname, 'mocks', path.basename(id) + '.js');
            }
            return originalResolveSync(id, opts);
        });
    });

    afterEach(() => {
        jest.restoreAllMocks();
        jest.resetModules();
    });

    it('throws if module does not exists', () => {
        expect(() => {
            loadTypeScript('not_existing', { folder: 'mocks' });
        }).toThrow();
    });

    it('throws if an old version of typescript is used', () => {
        expect(() => {
            loadTypeScript('oldVersion', { folder: 'mocks' });
        }).toThrow();
    });

    it('initializes createProgram and has valid versionMajorMinor', () => {
        const ts: any = loadTypeScript('simple', { folder: 'mocks' });
        expect(ts.versionMajorMinor).toBe('99.0');
        expect(typeof ts.createProgram).toBe('function');
    });

    it('can require itself without stack overflow', () => {
        const ts: any = loadTypeScript('selfRequire', { folder: 'mocks' });
        expect(ts.versionMajorMinor).toBe('99.0');
        expect(ts.selfRequire.versionMajorMinor).toBe('99.0');
        expect(ts.selfRequire.selfRequire).toBe(ts.selfRequire);
    });

    it('should pass correct arguments', () => {
        const ts: any = loadTypeScript('simple', { folder: 'mocks' });
        expect(ts.args.module).toBeInstanceOf(Module);
        expect(typeof ts.args.require).toBe('function');
        expect(ts.args.this).toBe(ts.args.exports);
        expect(ts.args.exports).toBe(ts.args.module.exports);
        expect(ts.args.__filename).toBe(path.join(__dirname, 'mocks', 'simple.js'));
        expect(ts.args.__dirname).toBe(path.join(__dirname, 'mocks'));
    });

    it('returns always a different instance, calling vm.runInThisContext only once', () => {
        const runInThisContextSpy = jest.spyOn(vm, 'runInThisContext');
        const ts1: any = loadTypeScript('runInThisContextOnce', { folder: 'mocks' });
        const ts2: any = loadTypeScript('runInThisContextOnce', { folder: 'mocks' });
        expect(ts1.versionMajorMinor).toBe('100.0');
        expect(ts2.versionMajorMinor).toBe('100.0');
        expect(ts1 !== ts2).toBe(true);
        expect(runInThisContextSpy).toBeCalledTimes(1);
    });

    it('does not alter standard require pristine typescript', () => {
        loadTypeScript('simple', { folder: 'mocks' });
        const required = require(path.join(__dirname, 'mocks', 'simple.js'));
        expect(required.createProgram).toBeUndefined();
    });

    it('registers a pristine lazy module in require.cache, running vm.runInThisContext only once', () => {
        const runInThisContextSpy = jest.spyOn(vm, 'runInThisContext');
        const ts: any = loadTypeScript('requireCache', { folder: 'mocks' });
        const cached = ts.cachedModule;
        expect(cached).toBeInstanceOf(Module);
        expect(cached.loaded).toBe(false);
        expect(cached.exports.versionMajorMinor).toBe('99.0');
        expect(cached.loaded).toBe(true);
        expect(cached.exports).toBe(cached.exports);
        expect(cached.exports.createProgram).toBeUndefined();
        expect(runInThisContextSpy).toBeCalledTimes(1);
    });
});
