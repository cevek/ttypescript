import { execSync, execFileSync, exec, ExecOptions } from 'child_process';
import { normalize, dirname } from 'path';
import { readFileSync } from 'fs';

const expectCode = `
function type() {
    return '';
}
var x = "{ abc: 1; }";
console.log(x);
`;
describe('ttsc', () => {
    it('should transform code', () => {
        execSync('node ../../lib/tsc', {
            cwd: __dirname + '/assets/',
            maxBuffer: 1e8,
        });
        expect(readFileSync(__dirname + '/assets/tsnode.js', 'utf8').trim()).toBe(expectCode.trim());
    });
});
