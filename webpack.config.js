var path = require('path');
var webpack = require('webpack');
var autoprefixer = require('autoprefixer');
var precss = require('precss');
module.exports = {
    entry:  {
        app: "./src/index.js"
    },
    output: {
        path: "build",
        filename: "[name].js"
    },
    resolve: {
        extensions: ['', '.js', '.jsx']
    },

    externals: {
        // 'jQuery': 'jQuery',
        // 'react': 'React',
        // 'react-dom': 'ReactDOM',
        // 'echarts': 'echarts'
    },
    plugins: [
        new webpack.optimize.OccurenceOrderPlugin()
    ],
    module: {
        loaders: [
            { test: /\.jsx?$/, loaders: ['babel'] },
            { test: /\.(css|less)$/, loader: 'style-loader!css-loader!postcss-loader!less-loader' },
            { test: /\.(png|jpg|jpeg|gif)$/, loader: 'url-loader?limit=10000&name=./images/[name].[ext]' }
        ]
    },
    postcss: function(){
        return [autoprefixer, precss];
    }
}
