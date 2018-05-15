import { execSync, execFileSync, exec, ExecOptions } from 'child_process';
import { normalize } from 'path';

describe('ts-node', () => {
    it('run without errors',  () => {
        execSync('node ../../node_modules/ts-node/dist/bin -C ../../../lib/typescript src/test.ts', {
            cwd: __dirname + '/../../ttypescript-examples',
            maxBuffer: 1e8,
        });
    });
});
