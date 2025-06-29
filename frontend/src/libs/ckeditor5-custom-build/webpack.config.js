const path = require('path');

module.exports = {
  entry: './src/ckeditor.js',
  output: {
    path: path.resolve(__dirname, 'build'),
    filename: 'ckeditor.js',
    library: 'ClassicEditor',
    libraryTarget: 'umd',
    libraryExport: 'default'
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      },
      {
        test: /\.svg$/,
        use: ['raw-loader']
      }
    ]
  },
  resolve: {
    extensions: ['.js']
  }
};
