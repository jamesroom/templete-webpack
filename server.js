const http = require('http');
const https = require('https');
const fs = require('fs');
const koa = require('koa');
const request = require('co-request');
const send = require('koa-send');
const co  = require('co');
var Cache = {};
const app = koa();
const webpack = require('webpack');
const configJSON = require('./webpack.config.js');

const hosts = {
    "assets.daily.taobao.net": "10.101.73.189",
    "a.tbcdn.cn": "115.238.23.251",
    "l.tbcdn.cn": "122.225.111.240",
    'assets.alicdn.com': '115.238.23.240',
    "g.assets.daily.taobao.net": "10.101.73.189",
    "g-assets.daily.taobao.net": "10.101.73.189",
    "g.tbcdn.cn":"10.101.73.189",
    "g.alicdn.com":"10.101.73.189"
};

var getLocalAssets = co.wrap(function *(url, host){
    url = url.replace(/(js|css)\?.+?$/,'$1');
    var src = url.split('??');
    var fileArr = [];

    if (src.length === 1) {
        src.unshift('');
    }
    var s;
    var arrPath = src[1].split(',');
    while(s = arrPath.shift()){
        //有可能combo中也有本地文件也有远程文件
        var filePath = src[0] + s;
        if (/crm\/rate-strategy/.test(filePath)) {
            var filename = 'build/' + filePath.replace(/\/?crm\/rate-strategy\/(\d+.\d+.\d+\/)?/, '');
            fileArr.push(`\n\n/******************local ${s} **********************/\n\n`);
            fileArr.push(fs.readFileSync(filename));
        } else {
            var options = {
                uri: 'http://' + hosts[host] +'/'+ s,
                mothed: 'GET',
                headers: {
                    Host: this.host,
                    "Access-Control-Allow-Origin": "*",
                    "Cache-Control": "no-Cache"
                }
            };
            if(Cache[filePath]){
                fileArr.push(`\n\n/******************cache ${s} **********************/\n\n`);
                fileArr.push(Cache[filePath]);
                continue;
            }

            var response = yield request(options);

            Cache[filePath] = response.body;
            fileArr.push(`\n\n/******************proxy ${s} **********************/\n\n`);
            fileArr.push(response.body);
        }
    }

    return yield Promise.resolve(fileArr.join(''));
});

var getAssets = function(url, host) {

    url = url.replace(/(js|css)\?.+?$/,'$1');
    var src = url.split('??');
    var arrPromise = [];

    if (src.length === 1) {
        src.unshift('');
    }
    var s;
    var arrPath = src[1].split(',');
    while(s = arrPath.shift()){
        //有可能combo中也有本地文件也有远程文件
        var filePath = src[0] + s;
        if (/crm\/rate-strategy/.test(filePath)) {
            arrPromise.push(new Promise((resove)=>{
                    var filename = 'build/' + filePath.replace(/\/?crm\/rate-strategy\/(\d+.\d+.\d+\/)?/, '');
            var fileArr = [];
            fileArr.push(`\n\n/******************local ${s} **********************/\n\n`);
            fs.readFile(filename, (err, data)=>{
                if (err) throw err;
            fileArr.push(data);
            resove(fileArr.join(''));
        });
            fileArr.push(fs.readFileSync(filename));
        }));
        } else {
            arrPromise.push(new Promise((resolve)=>{
                    var fileArr = [];
            if(Cache[url]){
                fileArr.push(`\n\n/******************cache ${url} **********************/\n\n`);
                fileArr.push(Cache[filePath]);
            }
            http.request({
                host: hosts[this.host],
                path: url,
                method: 'GET',
                headers: {
                    Host: this.host,
                    "Access-Control-Allow-Origin": "*",
                    "Cache-Control": "no-Cache"
                }
            }, (res)=>{
                res.setEncoding('utf8');
            res.on('data', (chunk) => {
                fileArr.push(chunk);
        });
            res.on('end', () => {
                Cache[url] =  fileArr.join('');
            fileArr.unshift(`\n\n/******************cache ${url} **********************/\n\n`)
            resolve(fileArr.join());
        })
        });
        }));
        }
    }

    return arrPromise;
};



app.use(function *() {
    var url = this.url;
    var host = this.host;
    if (url.indexOf('crm/rate-strategy') >= 0) {
        this.body = yield getLocalAssets(url, host);
        this.set("content-type", ~url.indexOf('.js')? 'application/x-javascript': 'text/css');
        this.set("Cache-Control", "no-Cache");
    } else {

        var options = {
            uri: 'http://' + hosts[this.host] + url,
            mothed: 'GET',
            headers: {
                Host: this.host,
                "Access-Control-Allow-Origin": "*",
                "Cache-Control": "no-Cache"
            }
        };
        var response = yield request(options);
        this.status = response.statusCode;
        for(var key in response.headers){
            this.set(key, response.headers[key]);
        }
        Cache[url] = response.body;
        this.body = response.body;
    }
});

function getUserHomeDir(){
    return process.env.HOME || process.env.USERPROFILE;
}

const options = {
    key: fs.readFileSync(getUserHomeDir() + '/.tap/cert/server.key'),
    cert: fs.readFileSync(getUserHomeDir() +'/.tap/cert/server.crt')
};
const httpServ = http.createServer(app.callback());
const httpsServ = https.createServer(options, app.callback());

const startHttps = new Promise((resolve)=>{
        httpsServ.listen(443, function () {
        resolve(true);
    });
});

const startHttp = new Promise((resolve)=>{
        httpServ.listen(80 ,function(){
        resolve(true);
    });
});

const  start = ()=>{
    Promise.all([startHttp, startHttps]).then(()=>{
        console.log('server have been start up!!!');
    var env = process.env,
        uid = parseInt(env['SUDO_UID'] || process.getuid(), 10),
        gid = parseInt(env['SUDO_GID'] || process.getgid(), 10);
    process.setgid(gid);
    process.setuid(uid);
    watchAssets();
})
};

const watchAssets = ()=> {
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
};

start();