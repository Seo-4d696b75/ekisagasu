const path = require("path");

module.exports = {
  mode: 'production',
  entry: './src/index.tsx',
  module: {
    rules: [
      // Handle TypeScript
      {
        loader: 'ts-loader',
        test: /\.tsx?$/,
        exclude: [
          '/node_module/'
        ],
        options: {
          configFile: 'tsconfig.json'
        }
      }
    ],
  },
  resolve: {
    extensions: [".ts", ".js", ".tsx"],
  },
};