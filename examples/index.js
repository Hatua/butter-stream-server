var Streamer = require('../');

var torrent = new Streamer('https://yts.re/download/start/EECFABCCD27127B1F4139965A21563F401E17C71.torrent',
	{
		progressInterval: 200,
		buffer: 10 * 1024 * 1024,
		port: 9999,
		writeDir: '',
		index: 'THIS_ONE.mp4'
	});

torrent.on('progress', function (progress) {
	console.log(progress);
});

torrent.on('ready', function (data) {
	console.log('binding to ' + data.streamUrl);
	//torrent.close();
});

torrent.on('close', function () {
	console.log('im closed');
});

torrent.on('error', function (e) {
	console.log(e);
});
