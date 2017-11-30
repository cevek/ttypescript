const ts = require('typescript/lib/tsserver.js');
require('./patch')(ts);
module.exports = ts;