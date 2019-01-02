import { execSync } from 'child_process';
import { configs } from './configs';

describe('ts-node', () => {
    it('should transform', () => {
        const result = execSync('node ' + configs.tsNodePath + ' --no-cache -C ' + configs.typescriptFromLibPath + ' tsnode.ts', {
            cwd: __dirname + '/assets/',
            maxBuffer: 1e8,
        });
        expect(result.toString()).toBe('{ abc: 1; }\n');
    });
});
