const ts = require('typescript/lib/typescriptServices.js');
require('./patch')(ts);
module.exports = ts;