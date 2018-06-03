var tmpFile = 'testFile-youtube.mp4'
var port = 2012
var url = 'https://www.youtube.com/watch?v=bAyaXyYM3Eo'

require('./lib/generic')('YouTube', url, port, tmpFile)
