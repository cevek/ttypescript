import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { configs } from './configs';

const expectCode = `
function type() {
    return '';
}
var x = "{ abc: 1; }";
console.log(x);
`;
describe('ttsc', () => {
    it('should transform code', () => {
        execSync('node ' + configs.tscFromLibPath, {
            cwd: __dirname + '/assets/',
            maxBuffer: 1e8,
        });
        expect(readFileSync(__dirname + '/assets/tsnode.js', 'utf8').trim()).toBe(expectCode.trim());
    });
});
