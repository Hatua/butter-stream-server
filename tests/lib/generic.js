var http = require('http');
var assert = require('assert');
var Streamer = require('../../');
var fs = require('fs');

module.exports = function (url, port, tmpFile) {
    tmpFile = tmpFile || 'testFile.mp4'
    port = port || 2011;
    url = url || 'http://vodo.net/media/torrents/Pioneer.One.SEASON1.720p.x264-VODO.torrent';

    return describe('Streaming Server', function() {

	var stream = new Streamer(url,
		{
		progressInterval: 50,
		buffer: 1000,
		port: port,
		writeDir: '',
		index: tmpFile
	});

	it('should return 200', function(done){
		this.timeout(100000);

		stream.on('ready',function(data){
			http.get(data.streamUrl, function (res) {
				assert.equal(200, res.statusCode);
				done();
			});
		});

	});

	it('should return progress', function(done){
		this.timeout(100000);
		var progressed = false;
		stream.on('progress',function(data){
			if (!progressed) {
				progressed = true;
				assert(true);
				done();
			}
		});
	});

	it('should create a video file', function(done){
		fs.exists(tmpFile, function(exists) {
			assert.equal(true, exists);
			done();
		});
	});

	it('we can close the process', function(done){
		stream.close();
		done();
	});

	it('we can re-bind on the same port within 3 second', function(done){
		this.timeout(100000);
		setTimeout(function(){

			stream = new Streamer(url,
				{
				progressInterval: 200,
				buffer: 1000,
				port: port,
				writeDir: '',
				index: tmpFile
			});

			stream.on('ready',function(data){
				http.get(data.streamUrl, function (res) {
					assert.equal(200, res.statusCode);
					done();
				});
			});

		}, 3000);

	});

	it('we finalize the sequence', function(done){

		// close the stream
		stream.close();

		// delete tmpFile
		fs.unlinkSync(tmpFile);

		// we are done
		done();
	});

    })
}

