var tmpFile = 'testFile.mp4'
var port = 2011;
var url = 'http://vodo.net/media/torrents/Pioneer.One.SEASON1.720p.x264-VODO.torrent';

require('./lib/generic')(url, port, tmpFile);
