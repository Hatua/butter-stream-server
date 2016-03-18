var http = require('http');
var util = require('util');
var mime = require('mime');
var Streamer = require('popcorn-streamer');
var StreamerServer = {};
var rangeParser = require('range-parser');
var mime = require('mime');
var pump = require('pump');
var url = require('url');
var fs = require('fs');
var _ = require('underscore');
var EventEmitter = require("events").EventEmitter;
var path = require('path');

StreamerServer = function(url, args) {

    var self = this;
    var ready = false;
    var stoping = false;

    // populate with default args
    args = _.defaults(args, {
        hostname: 'localhost',
        index: 'file.mp4',
        writeDir: '',
        progressInterval: 200,
        buffer: 10*1024*1024,
        port: parseInt(Math.random() * (8000 - 6000) + 6000), // between 6000 & 8000

    });

    this.output = path.join(args.writeDir , args.index);

    // Initialize streaming engine
    this.engine = Streamer(url, args)
        .on('ready', function(file) {

            // we have our temp readStream so we can generate our webserver
            self.webServer = createWebServer(file, args.hostname, args.port);

        })
        .on('progress', function(progress) {

            // if our buffer is met, we can initialize our web server
            if (progress.downloaded >= args.buffer && !ready) {

                // start web server
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

        }, 1000);

    };
}
createWebServer = function(file, hostname, port) {
    var server = http.createServer();
    var getType = mime.lookup.bind(mime);

    server.on('request', function(request, response) {
        var u = url.parse(request.url);
        var host = request.headers.host || 'localhost';

        if (request.method === 'OPTIONS' && request.headers['access-control-request-headers']) {
			response.setHeader('Access-Control-Allow-Origin', request.headers.origin);
			response.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
			response.setHeader(
					'Access-Control-Allow-Headers',
					request.headers['access-control-request-headers']);
			response.setHeader('Access-Control-Max-Age', '1728000');

			response.end();
			return;
		}

        if (request.headers.origin) {
            response.setHeader('Access-Control-Allow-Origin', request.headers.origin);
        }

        // map to our file
        if (u.pathname === '/') {
            u.pathname = '/'+file.name;
        }

        // Prevent crash
		if (u.pathname === '/favicon.ico') {
			response.statusCode = 404;
			response.end();
			return;
		}

        var range = request.headers.range;
		range = range && rangeParser(file.length, range)[0];

		response.setHeader('Accept-Ranges', 'bytes');
		response.setHeader('Content-Type', getType(file.name));

        if (!range) {
			response.setHeader('Content-Length', file.length);
			if (request.method === 'HEAD') return response.end();
			pump(file.createReadStream(), response);
			return;
		}

        response.statusCode = 206;
		response.setHeader('Content-Length', range.end - range.start + 1);
		response.setHeader('Content-Range', 'bytes '+range.start+'-'+range.end+'/'+file.length);

        if (request.method === 'HEAD') {
            return response.end();
        }

        pump(file.createReadStream(range), response);
    });

    server.on('connection', function(socket) {
        socket.setTimeout(36000000);
    });

    return server;
}

util.inherits(StreamerServer, EventEmitter);
module.exports = StreamerServer;
