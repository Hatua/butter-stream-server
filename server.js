const http = require('http')
const fs = require('fs')
const mime = require('mime')
const url = require('url')
const rangeParser = require('range-parser')
const pump = require('pump')
const debug = require('debug')('butter-streamer-server:server')

module.exports = function (file, output, hostname, port) {
  debug('creating server for', file, output, hostname, port)
  const server = http.createServer()
  const getType = mime.getType.bind(mime)

  server.on('request', function (request, response) {
    const u = url.parse(request.url)
    const host = request.headers.host || 'localhost'

    if (request.method === 'OPTIONS' &&
        request.headers['access-control-request-headers']) {
      response.setHeader('Access-Control-Allow-Origin', request.headers.origin)
      response.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
      response.setHeader(
        'Access-Control-Allow-Headers',
        request.headers['access-control-request-headers'])
      response.setHeader('Access-Control-Max-Age', '1728000')

      response.end()
      return
    }

    if (request.headers.origin) {
      response.setHeader('Access-Control-Allow-Origin', request.headers.origin)
    }

    // map to our file
    if (u.pathname === '/') {
      u.pathname = '/' + file.name
    }

    // Prevent crash
    if (u.pathname === '/favicon.ico') {
      response.statusCode = 404
      response.end()
      return
    }

    const requestRange = request.headers.range
    const contentType = file.type || getType(file.name)

    const range = requestRange && rangeParser(file.length, requestRange)[0]

    response.setHeader('Accept-Ranges', 'bytes')
    response.setHeader('Content-Type', contentType)

    debug('engine', output)
    if (!range) {
      response.setHeader('Content-Length', file.length)
      if (request.method === 'HEAD') return response.end()
      pump(fs.createReadStream(output), response)
      return
    }

    response.statusCode = 206
    response.setHeader('Content-Length', range.end - range.start + 1)
    response.setHeader('Content-Range', 'bytes ' + range.start + '-' + range.end + '/' + file.length)

    if (request.method === 'HEAD') {
      return response.end()
    }

    pump(fs.createReadStream(output, range), response)
  })

  server.on('connection', function (socket) {
    socket.setTimeout(36000000)
  })

  return server
}
