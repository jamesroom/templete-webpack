
const webpack = require('webpack');
const configJSON = require('./webpack.config.js');

webpack(configJSON).watch({
  aggregateTimeout: 300,
  poll:true
}, (err, states)=>{
  if (err) {
    console.error(err);
    return;
  }
  console.log(states.toString({
    colors: true,
    hash: false,
    timings: false,
    chunks: false,
    chunkModules: false,
    modules: false,
    children: true,
    version: true,
    cached: false,
    cachedAssets: false,
    reasons: false,
    source: false,
    errorDetails: false
  }));
});