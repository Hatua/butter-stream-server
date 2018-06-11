const fs = require('fs')
const EventEmitter = require('events').EventEmitter
const path = require('path')

const pickStreamer = require('butter-stream-selector')

const Server = require('./server')

const debug = require('debug')('butter-stream-server')

const defaultArgs = {
  hostname: 'localhost',
  writeDir: '',
  progressInterval: 200,
  buffer: 10 * 1024 * 1024,
  port: parseInt(Math.random() * (8000 - 6000) + 6000), // between 6000 & 8000
  timeout: 1000
}

class StreamServer extends EventEmitter {
  constructor (url, args) {
    super()

    let ready = false

    // populate with default args
    args = Object.assign({}, defaultArgs, args)

    // Initialize streaming engine
    this.engine = pickStreamer(url, args)
    this.webServer = new Server(this.engine)

    this.engine
      .on('ready', files => {
        // we have our temp readStream so we can generate our webserver
        debug('spawning web server')
        this.webServer.listen({
          port: args.port,
          hostname: args.hostname
        }, () => {
          debug('server ready', this.webServer.address())

          // emit the streamUrl
          this.emit('ready', {
            streamUrl: 'http://' + args.hostname + ':' + args.port
          })
        })
      })
      .on('progress', progress => {
        // if our buffer is met, we can initialize our web server
        if (progress.downloaded >= args.buffer && !ready) {
          // start web server
          debug('you can start playing')
        }

        this.emit('progress', progress)
      })

    this.close = () => {
      const closeWebServer = () => {
        try {
          this.webServer.destroy()
        } catch (e) {
          this.emit('error', {
            context: 'closeWebServer',
            error: e
          })
        }
      }

      const closeEngine = () => {
        try {
          this.engine.destroy()
        } catch (e) {
          this.emit('error', {
            context: 'closeEngine',
            error: e
          })
        }
      }

      const doClose = () => {
        if (this.webServer) {
          closeWebServer()
        }

        if (this.engine) {
          closeEngine()
        }

        this.emit('close', true)
      }

      // we use a 1sec delay
      // to make sure our webserver is
      // initialized correctly
      setTimeout(doClose, args.timeout)
    }
  }
}

module.exports = StreamServer
