var Streamer = require('../');
var arg = process.argv;
var fs = require('fs');
var Stream = new Streamer( arg[2] ,
    {
        progressInterval: 200,
        buffer: 100,
        port: 9999,
        writeDir: '',
        index: 'ssss.mp4'
    });

Stream.on('progress', onProgress);
Stream.on('ready', onReady);

function onProgress(progress) {
fs.writeFile("test", JSON.stringify(progress), function(err) {
   if(err) {
        console.log(err);
    } else {
        console.log("The file was saved!");
    }
}); 

}

function onReady(data) {
    console.log("Binding to " + data.streamUrl);
}

