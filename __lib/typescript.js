const ts = require('typescript/lib/typescript.js');
require('./patch')(ts);
module.exports = ts;