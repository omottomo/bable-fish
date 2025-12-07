const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';
  const shouldAnalyze = process.env.ANALYZE === 'true';

  return {
    entry: {
      background: './src/background.ts',
      content: './src/content.tsx',
      popup: './src/popup.tsx'
    },
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: '[name].js',
      clean: true
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: 'ts-loader',
          exclude: /node_modules/
        },
        {
          test: /\.css$/,
          use: [
            'style-loader',
            'css-loader',
            {
              loader: 'postcss-loader',
              options: {
                postcssOptions: {
                  plugins: [
                    require('tailwindcss'),
                    require('autoprefixer')
                  ]
                }
              }
            }
          ]
        }
      ]
    },
    resolve: {
      extensions: ['.tsx', '.ts', '.js', '.jsx']
    },
    plugins: [
      new CopyWebpackPlugin({
        patterns: [
          { from: 'public/manifest.json', to: 'manifest.json' },
          { from: 'public/icons', to: 'icons' }
        ]
      }),
      new HtmlWebpackPlugin({
        template: './public/popup.html',
        filename: 'popup.html',
        chunks: ['popup']
      }),
      ...(shouldAnalyze ? [new BundleAnalyzerPlugin()] : [])
    ],
    optimization: {
      minimize: isProduction,
      usedExports: true, // Tree shaking
      sideEffects: false
    },
    performance: {
      maxAssetSize: 512000, // 500KB target
      maxEntrypointSize: 512000,
      hints: isProduction ? 'error' : 'warning'
    },
    devtool: isProduction ? false : 'inline-source-map'
  };
};
