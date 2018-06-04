var util = require('util')
var debug = require('debug')('butter-stream-server')
var StreamerServer = {}
var fs = require('fs')
var _ = require('lodash')
var EventEmitter = require('events').EventEmitter
var path = require('path')
var createWebServer = require('./server')
var pickStreamer = require('butter-stream-selector')

StreamerServer = function (url, args) {
  var ready = false
  var stoping = false

  // populate with default args
  args = _.defaults(args, {
    hostname: 'localhost',
    index: 'file.mp4',
    writeDir: '',
    progressInterval: 200,
    buffer: 10 * 1024 * 1024,
    port: parseInt(Math.random() * (8000 - 6000) + 6000), // between 6000 & 8000
    timeout: 1000
  })

  this.output = path.join(args.writeDir, args.index)

  // Initialize streaming engine
  //    this.engine = Streamer(url, args)
  this.engine = pickStreamer(url, args)
    .on('ready', file => {
      // we have our temp readStream so we can generate our webserver
      debug('spawning web server')
      this.webServer = createWebServer(file, this.output, args.hostname, args.port)
    })
    .on('progress', progress => {
      // if our buffer is met, we can initialize our web server
      if (progress.downloaded >= args.buffer && !ready) {
        // start web server
        debug('starting web server')
        this.webServer.listen(args.port, args.hostname)

        // emit the streamUrl
        this.emit('ready', {
          streamUrl: 'http://' + args.hostname + ':' + args.port
        })

        // ok so we are ready :)
        // will prevent webserver to start again
        ready = true
      }

      this.emit('progress', progress)
    })
    .pipe(fs.createWriteStream(this.output))

  this.close = () => {
    // we use a 1sec delay
    // to make sure our webserver is
    // initialized correctly

    setTimeout(() => {
      if (this.webServer) {
        try {
          this.webServer.close()
        } catch (e) {
          this.emit('error', {
            context: 'closeWebServer',
            error: e
          })
        }
      };

      if (this.engine) {
        try {
          this.engine.close()
          this.engine.destroy()
        } catch (e) {
          this.emit('error', {
            context: 'closeEngine',
            error: e
          })
        }
      };

      this.emit('close', true)
    }, args.timeout)
  }
}

util.inherits(StreamerServer, EventEmitter)
module.exports = StreamerServer
