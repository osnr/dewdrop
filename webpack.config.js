var webpack = require('webpack');
var path = require('path');

module.exports = {
  entry: {
    test: './test/entry.js',
    executive: './executive/index.ts'
  },
  devtool: 'cheap-module-eval-source-map',
  output: {
    filename: './dist/[name].entry.js'
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
