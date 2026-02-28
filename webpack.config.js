const path = require('path');
const fs = require('fs');

module.exports = {
  entry: './src/Entry.ts',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
    fallback: {
      fs: false,
      crypto: false,
    }
  },
  output: {
    filename: 'index.js',
    path: path.resolve(__dirname, 'public'),
  },
  mode: 'development',
  target: ['es6', 'web'],

  devServer: {
    historyApiFallback: true,
    port: 8008,
    allowedHosts: 'all',               // или 'stairs.live' — чтобы не ругался на Host header
   // client: {
   //   webSocketURL: 'auto://0.0.0.0:0/ws',  // или 'wss://stairs.live/ws' — если хочешь явно
  //  },
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
      "Access-Control-Allow-Headers": "X-Requested-With, content-type, Authorization"
    },
    // ← Добавь это
    hot: false,  // если используешь HMR
    liveReload: false
    // proxy: { ... } если нужно, но сейчас не обязательно
  }
}