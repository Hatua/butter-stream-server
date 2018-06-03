var tmpFile = 'testFile.mp4'
var port = 2011
var url = 'http://download.blender.org/peach/bigbuckbunny_movies/big_buck_bunny_480p_surround-fix.avi'

require('./lib/generic')('HTTP', url, port, tmpFile)
