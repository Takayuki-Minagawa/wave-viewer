const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

/** Load the browser scripts in an isolated global for each test. */
function loadScripts(...names) {
    const context = vm.createContext({ console });
    context.window = context;
    context.self = context;
    for (const name of names) {
        const filename = path.join(__dirname, '../../js', `${name}.js`);
        vm.runInContext(fs.readFileSync(filename, 'utf8'), context, { filename });
    }
    return context;
}

module.exports = { loadScripts };
