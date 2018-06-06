const fs = require('fs')
const EventEmitter = require('events').EventEmitter
const path = require('path')

const pickStreamer = require('butter-stream-selector')

const Server = require('./server')

const debug = require('debug')('butter-stream-server')

const defaultArgs = {
  hostname: 'localhost',
  index: 'file.mp4',
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

    this.output = path.join(args.writeDir, args.index)
    this.outputStream = fs.createWriteStream(this.output)

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
          debug('server created', this.webServer.address())
        })
      })
      .on('progress', progress => {
        // if our buffer is met, we can initialize our web server
        if (progress.downloaded >= args.buffer && !ready) {
          // start web server
          debug('starting web server')

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

    this.close = () => {
      const closeWebServer = () => {
        try {
          this.webServer.close()
        } catch (e) {
          this.emit('error', {
            context: 'closeWebServer',
            error: e
          })
        }
      }

      const closeEngine = () => {
        try {
          this.engine.close()
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
