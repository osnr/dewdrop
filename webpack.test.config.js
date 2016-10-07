var webpack = require('webpack');
var path = require('path');

module.exports = {
  entry: {
    app: './test/entry.js'
  },
  devtool: 'cheap-module-eval-source-map',
  output: {
    filename: './dist/test-bundle.js'
  },
  resolve: {
    extensions: ['', '.js', '.ts']
  },
  module: {
    loaders: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        loader: 'ts'
      },
      {
        test: /\.ps$/,
        loader: 'raw'
      }
    ]
  },
  node: {
    fs: 'empty'
  }
};
