const path = require('path');

module.exports = {
  mode: 'production',
  entry: './src/novelMain.tsx',
  output: {
    path: path.resolve(__dirname, '../'),
    filename: 'novel-notes-integration.js',
    library: 'NovelNotesIntegration',
    libraryTarget: 'umd',
    globalObject: 'this'
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js', '.jsx']
  },
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/,
        use: {
          loader: 'ts-loader',
          options: {
            configFile: 'tsconfig.webpack.json'
          }
        },
        exclude: [/node_modules/, /\.test\.(ts|tsx)$/, /__tests__/]
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader', 'postcss-loader']
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif)$/i,
        type: 'asset/resource'
      }
    ]
  },
  externals: {
    react: 'React',
    'react-dom': 'ReactDOM'
  }
};