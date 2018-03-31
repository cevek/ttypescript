__filename = require.resolve('typescript/lib/tsserver.js');
__dirname = require('path').dirname(__filename);
const ts = require(__filename);
require('./patch').default(ts, __dirname);
module.exports = ts;