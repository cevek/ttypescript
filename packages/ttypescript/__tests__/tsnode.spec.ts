import { execSync, execFileSync, exec, ExecOptions } from 'child_process';
import { normalize, dirname } from 'path';
import { transformers } from './transforms/transformers';

describe('ts-node', () => {
    it('should transform', () => {
        const result = execSync(
            'node ../../../../node_modules/ts-node/dist/bin -C ' + __dirname + '/../lib/typescript tsnode.ts',
            {
                cwd: __dirname + '/assets/',
                maxBuffer: 1e8,
            }
        );
        expect(result.toString()).toBe('{ abc: 1; }\n');
    });
});
