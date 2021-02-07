const path = require("path");

module.exports = {
  module: {
    rules: [
      // Handle TypeScript
      {
        test: /\.ts$/,
        use: "worker-loader",
      }
    ],
  },
  resolve: {
    extensions: [".ts", ".js"],
  },
  output: {
    // This is required so workers are known where to be loaded from
    publicPath: "/build/",
    filename: "bundle.js",
    path: path.resolve(__dirname, "build/"),
  },
};