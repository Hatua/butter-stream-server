var Streamer = require('../')
var Stream = new Streamer('https://www.youtube.com/watch?v=9FaOKNpAiIM', {
  progressInterval: 200,
  buffer: 100,
  port: 9999,
  writeDir: '',
  index: 'ssss.mp4'
})

Stream.on('progress', onProgress)
Stream.on('ready', onReady)

function onProgress (progress) {
  console.log(progress)
}

function onReady (data) {
  console.log('Binding to ' + data.streamUrl)
}
