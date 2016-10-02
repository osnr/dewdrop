var webpack = require('webpack');
var path = require('path');

module.exports = {
  entry: {
    app: './app/app.ts'
  },
  devtool: 'cheap-module-eval-source-map',
  output: {
    filename: './dist/bundle.js'
  },
  resolve: {
    extensions: ['', '.ts']
  },
  module: {
    loaders: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        loader: 'ts'
      }
    ]
  }
};
