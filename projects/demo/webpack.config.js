const ExtensionReloader = require('webpack-extension-reloader');

module.exports = {
  entry: { background: './src/background.ts' },
  plugins: [
    new ExtensionReloader()
  ]
};
