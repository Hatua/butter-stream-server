var util = require('util');
var debug = require('debug')('butter-streamer');
var StreamerServer = {};
var fs = require('fs');
var _ = require('lodash');
var EventEmitter = require("events").EventEmitter;
var path = require('path');
var loadPackageJSON = require('load-package-json');
var URI = require('urijs');
var createWebServer = require('./server');

function loadFromNPM(name) {
    return require(name);
}

function loadFromPackageJSON(regex) {
    var npm = loadPackageJSON();

    var packages = Object.keys(npm.dependencies).filter(function (p) {
        return p.match(regex);
    });

    return packages.map(function (name) {
        debug('loading npm', regex, name);
        return loadFromNPM(name);
    });
}

function loadStreamersFromPackageJSON () {
    return loadFromPackageJSON(/butter-streamer-/);
}

function loadStreamers(streamerNames) {
    return streamerNames.map(function (name) {
        name = name.match(/^butter-streamer-/)?name:'butter-streamer-' + name;
        return loadFromNPM(name);
    })
}

function spawnStreamer(o, url, args) {
    debug ('returning', o.name, url, args)
    return new o(url, args);
}

function pickStreamer(url, args) {
    var streamers =
        _.orderBy(loadStreamers(args.streamers)
                  .concat(loadStreamersFromPackageJSON()), 'prototype.config.priority')

    var uri = URI(url);
    var fails = [];

    for (var i = 0; i< streamers.length; i++) {
        var s = streamers[i]
        var c = s.prototype.config;

        if (c.type && c.type === args.type) {
            debug ('found streamer of type', s.type)
            return spawnStreamer(s, url, args);
        }

        for (var k in c) {
            if (uri[k] && uri[k]().match(c[k])) {
                debug ('streamer matched', k, uri[k](), c[k])
                debug ('tried', fails)
                return spawnStreamer(s, url, args);
            }
        }

        fails.push(c.type);
    }

    debug ('returning nothing')
    return new Error("couldn't locate streamer")
}

StreamerServer = function(url, args) {
    var self = this;
    var ready = false;
    var stoping = false;

    // populate with default args
    args = _.defaults(args, {
        streamers: ['torrent', 'http', 'youtube'],
        hostname: 'localhost',
        index: 'file.mp4',
        writeDir: '',
        progressInterval: 200,
        buffer: 10*1024*1024,
        port: parseInt(Math.random() * (8000 - 6000) + 6000), // between 6000 & 8000
        timeout: 1000
    });


    this.output = path.join(args.writeDir , args.index);

    // Initialize streaming engine
    //    this.engine = Streamer(url, args)
    this.engine = pickStreamer(url, args)
        .on('ready', function(file) {

            // we have our temp readStream so we can generate our webserver
            debug('spawning web server');
            self.webServer = createWebServer(file, args.hostname, args.port);

        })
        .on('progress', function(progress) {
            // if our buffer is met, we can initialize our web server
            if (progress.downloaded >= args.buffer && !ready) {

                // start web server
                debug('starting web server');
                self.webServer.listen(args.port, args.hostname);

                // emit the streamUrl
                self.emit('ready', {
                    streamUrl: 'http://'+args.hostname+':'+args.port
                });

                // ok so we are ready :)
                // will prevent webserver to start again
                ready = true;

            }

            self.emit('progress', progress);

        })
        .pipe(fs.createWriteStream(self.output));

    this.close = function () {
        // we use a 1sec delay
        // to make sure our webserver is
        // initialized correctly

        setTimeout(function(){

            if (self.webServer) {
                try {
                    self.webServer.close();
                } catch (e) {
                    self.emit('error', {
                        context: 'closeWebServer',
                        error: e
                    });
                }
            };

            if (self.engine) {
                try {
                    self.engine.close();
                    self.engine.destroy();
                } catch (e) {
                    self.emit('error', {
                        context: 'closeEngine',
                        error: e
                    })
                }
            };

            self.emit('close', true);

        }, args.timeout);

    };
}

util.inherits(StreamerServer, EventEmitter);
module.exports = StreamerServer;
