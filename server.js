var http = require('http')
  , mime = require('mime')
  , url = require('url')
  , rangeParser = require('range-parser')
  , pump = require('pump');
;

module.exports = function(file, hostname, port) {
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
