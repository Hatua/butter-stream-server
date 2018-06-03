var tmpFile = 'testFile-torrent.mp4'
var port = 2010
var url = 'http://www.frostclick.com/torrents/video/animation/Big_Buck_Bunny_1080p_surround_frostclick.com_frostwire.com.torrent'

require('./lib/generic')('Torrent', url, port, tmpFile)
