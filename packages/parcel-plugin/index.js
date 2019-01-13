module.exports = (bundler) => {
    bundler.addAssetType('ts', require.resolve('./TTypescriptAsset'));
    bundler.addAssetType('tsx', require.resolve('./TTypescriptAsset'));
};
