require('dotenv').config()

let oldCl = console.log;

console.log = function (msg) {
    oldCl('[' + new Date().toISOString() + '] ' + msg);
}

function sendPusher(station, data) {
    var push = new pusher({
        appId: process.env.PUSHER_APPID,
        key: process.env.PUSHER_KEY,
        secret: process.env.PUSHER_SECRET,
        cluster: process.env.PUSHER_CLUSTER,
        useTLS: true
    });

    push.trigger('radio', station, data);
}

const http = require('http');
const i2b64 = require('image-to-base64');
const pusher = require('pusher');
const storage = require('azure-storage');

const blobService = storage.createBlobService(process.env.AZURE_BLOB);
const storageOptions = { contentSettings: { contentType: 'application/json' } };

console.log('Starting Radio Tools...');

let currentSongId = [];

function processNowPlaying() {
    http.get(process.env.AZURA_SERVER_NP_URL, (resp) => {
        let dataBuffer = '';

        resp.on('data', (chunk) => {
            dataBuffer += chunk;
        });

        resp.on('end', () => {
            const stationData = JSON.parse(dataBuffer);
            stationData.forEach((data) => {
                const perfStartTime = Date.now();
                const sData = data.station;
                const npData = data.now_playing.song;
                const stationName = data.station.name.padStart(17);

                if (currentSongId[sData.id] === npData.id) {
                    return;
                }

                currentSongId[sData.id] = npData.id

                i2b64(npData.art).then((resp) => {
                    npData.timestamp = Math.floor(Date.now() / 1000);
                    delete npData.art;
                    npData.art = 'data:image/jpeg;base64,' + resp;
                    delete npData.custom_fields;
                    delete npData.lyrics;
                    delete npData.id;
                    const stationCode = data.station.shortcode;
                    blobService.createBlockBlobFromText('radio', stationCode + '.json', JSON.stringify(npData), storageOptions, function (error, result, response) {
                        if (error) {
                            console.log(stationName + 'Couldn\'t upload nowplaying!');
                            console.error(error);
                        } else {
                            console.log(stationName + ': ' + npData.text + ' [' + (Date.now() - perfStartTime).toString() + 'ms]');
                            delete npData.art;
                            sendPusher(stationCode, npData);
                        }
                    });
                });
            });
        });
    }).on('error', (err) => {
        console.error('Error: ' + err.message);
    });
}

setInterval(function () {
    processNowPlaying();
}, 1000 * 10); // Ten Seconds

processNowPlaying();