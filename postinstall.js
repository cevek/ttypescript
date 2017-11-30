var fs = require('fs');
var path = require('path');

const tsLibDir = path.dirname(require.resolve('typescript/lib/tsc')) + '/';
const libContent = fs.readFileSync(tsLibDir + 'tsserverlibrary.js', 'utf8');
const appendContent = fs.readFileSync(__dirname + '/lib/patch.js', 'utf8') + '(ts)';
fs.writeFileSync(__dirname + '/lib/tsserverlibrary.js', libContent + '\n' + appendContent);
fs.readdirSync(tsLibDir).forEach(file => {
    if (file.match(/\.d\.ts$/)) {
        const content = fs.readFileSync(tsLibDir + file, 'utf8');
        fs.writeFileSync(__dirname + '/lib/' + file, content);
    }
});
console.log('ttypescript: installed TS version: ' + require('typescript').version);
