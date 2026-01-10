const HtmlWebpackPlugin = require('html-webpack-plugin');
const { ModuleFederationPlugin } = require('webpack').container;
const path = require('path');

module.exports = {
  entry: './src/index.js',
  mode: 'development',
  devServer: {
    port: 3001, // Different port from Shell
    historyApiFallback: true,
    hot: true,
    headers: {
      "Access-Control-Allow-Origin": "*", // Required for MFE loading
    },
  },
  output: {
    publicPath: 'auto',
  },
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        loader: 'babel-loader',
        exclude: /node_modules/,
        options: {
          presets: ['@babel/preset-env', '@babel/preset-react'],
        },
      },
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader', 'postcss-loader'],
      },
    ],
  },
  plugins: [
    new ModuleFederationPlugin({
      name: 'dashboard',
      filename: 'remoteEntry.js', // This is the file the Shell downloads
      exposes: {
        // We expose the Dashboard component
        './Dashboard': './src/Dashboard',
      },
      shared: { 
        react: { singleton: true, requiredVersion: '^18.2.0' }, 
        'react-dom': { singleton: true, requiredVersion: '^18.2.0' } 
      },
    }),
    new HtmlWebpackPlugin({
      template: './public/index.html',
    }),
  ],
  resolve: {
    extensions: ['.js', '.jsx'],
  },
};