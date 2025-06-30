const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = {
  entry: './src/ckeditor.js',
  output: {
    path: path.resolve(__dirname, 'build'),
    filename: 'ckeditor.js',
    library: {
      type: 'module',
    },
    clean: true, // limpa a pasta build antes de buildar
  },
  experiments: {
    outputModule: true,
  },
  module: {
    rules: [
      {
        test: /\.css$/i,
        use: [MiniCssExtractPlugin.loader, 'css-loader'],
      },
      {
        test: /\.svg$/i,
        use: ['raw-loader'],
      },
    ],
  },
  resolve: {
    extensions: ['.js'],
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: 'ckeditor.css', // saída do CSS
    }),
  ],
};
