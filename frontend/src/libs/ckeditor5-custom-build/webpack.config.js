const path = require('path');

module.exports = {
  entry: './src/ckeditor.js',
  output: {
    path: path.resolve(__dirname, 'build'),
    filename: 'ckeditor.js',
    library: {
      type: 'module',
    },
  },
  experiments: {
    outputModule: true,
  },
  module: {
    rules: [
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
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
};
