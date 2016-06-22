var webpack = require('webpack');

module.exports = {
  entry: ['babel-polyfill', './src/main.ts'],
  output: {
    filename: 'dist/bundle/bundle.js'
  },
  devtool: 'source-map',
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx', '']
  },
  plugins: [
      new webpack.ProvidePlugin({
        'fetch': 'imports?this=>global!exports?global.fetch!isomorphic-fetch'
      }),
      new webpack.optimize.UglifyJsPlugin({
        sourceMap: true,
        mangle: false
      }),
  ],
  module: {
    loaders: [
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        loader: 'babel-loader!ts-loader'
      }
    ]
  }
}



// module.exports = {
//   entry: './src/main.ts',
//   output: {
//     filename: 'bundle.js'
//   },
//   resolve: {
//     // Add `.ts` and `.tsx` as a resolvable extension.
//     extensions: ['', '.webpack.js', '.web.js', '.ts', '.tsx', '.js']
//   },
//   module: {
//     loaders: [
//       // all files with a `.ts` or `.tsx` extension will be handled by `ts-loader`
//       { test: /\.tsx?$/, loader: 'ts-loader' }
//     ]
//   }
// }