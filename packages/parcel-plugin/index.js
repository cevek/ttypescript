module.exports = () => {
    const original = module.parent.exports;
    module.parent.exports = function(name, ...args) {
        return original(name === 'typescript' ? 'ttypescript' : name, ...args);
    };
};
