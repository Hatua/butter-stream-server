const http = require('http')
const assert = require('assert')
const StreamServer = require('../../')
const fs = require('fs')

module.exports = function (
  name,
  url = 'http://www.frostclick.com/torrents/video/animation/Big_Buck_Bunny_1080p_surround_frostclick.com_frostwire.com.torrent',
  port = 2011,
  tmpFile = 'testFile.mp4'
) {
  return describe(`${name} - Streaming Server`, function () {
    let server = new StreamServer(url, {
      progressInterval: 50,
      buffer: 1000,
      port: port,
      writeDir: '',
      index: tmpFile
    })

    it('should return 200', function (done) {
      this.timeout(100000)

      server.on('ready', data => (
        http.get(data.streamUrl, function (res) {
          assert.equal(200, res.statusCode)
          done()
        })))
    })

    it('should return progress', done => {
      this.timeout(100000)
      let progressed = false
      server.on('progress', function (data) {
        if (!progressed) {
          progressed = true
          assert(true)
          done()
        }
      })
    })

    it('should create a video file', done => {
      fs.access(tmpFile, fs.constants.F_OK, err => {
        assert.equal(err, undefined)
        done()
      })
    })

    it('we can close the process', done => {
      server.close()
      done()
    })

    it('we can re-bind on the same port within 3 second', done => {
      this.timeout(100000)
      setTimeout(() => {
        server = new StreamServer(url, {
          progressInterval: 200,
          buffer: 1000,
          port: port,
          writeDir: '',
          index: tmpFile
        })

        server.on('ready', function (data) {
          http.get(data.streamUrl, function (res) {
            assert.equal(200, res.statusCode)
            done()
          })
        })
      }, 3000)
    })

    it('we finalize the sequence', done => {
      // close the stream
      server.close()

      // delete tmpFile
      fs.unlinkSync(tmpFile)

      // we are done
      done()
    })
  })
}
