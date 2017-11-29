const ts = require('typescript/lib/tsserverlibrary.js');
require('./patch')(ts);
module.exports = ts;