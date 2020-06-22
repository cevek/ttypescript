import * as ts from 'typescript'

interface TestConfig {
    trace: (message: string) => void;
}

export function foo(config: TestConfig): ts.Middleware {
    return {
        createProgram(opts, next) {
            config.trace("foo: before");

            opts.host = opts.host ? opts.host : ts.createCompilerHost(opts.options);
            const host = opts.host;

            const originFileExists = host.fileExists.bind(host);

            let existsCalled = false;
            host.fileExists = (fileName: string): boolean => {
                if (!existsCalled) {
                    existsCalled = true;
                    config.trace("in hook");
                }
                return originFileExists(fileName);
            }

            const result = next(opts);

            config.trace("foo: after");

            return result;
        }
    }
}

export function bar(config: TestConfig): ts.Middleware {
    return {
        createProgram(opts, next) {
            config.trace("bar: before");

            const result = next(opts);

            config.trace("bar: after");

            return result;
        }
    }
}
