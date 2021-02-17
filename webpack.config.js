const path = require("path");

module.exports = {
  mode: 'production',
  entry: './src/index.tsx',
  module: {
    rules: [
      // Handle TypeScript
      {
        test: /\.ts$/,
        use: "worker-loader",
      },
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
  output: {
    // This is required so workers are known where to be loaded from
    publicPath: "/ekisagasu/",
    filename: "bundle.js",
    path: `${__dirname}/docs`,
  },
};