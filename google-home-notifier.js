var Client = require('castv2-client').Client;
var DefaultMediaReceiver = require('castv2-client').DefaultMediaReceiver;
var mdns = require('mdns-js');
var browser = mdns.createBrowser(mdns.tcp('googlecast'));
var deviceAddress;
var deviceName;
var language;

/**
 * @deprecated
 */
var device = function(name, lang = 'en') {
  deviceName = name;
  language = lang;
  return this;
};

var ip = function(ip, lang = 'en') {
  deviceAddress = ip;
  language = lang;
  return this;
};

var mac = async function (mac, lang = 'en') {
  // var arpTable = await arpTablePromise();
  // deviceAddress = arpTable.find((record) => {
  //   return (record.mac == mac);
  // }).ip;
  language = lang;
  return this;
};

// var arpTablePromise = () => new Promise((resolve) => {
//   arpjs.table(function (err, table) {
//     resolve(table);
//   });
// });

var googletts = require('google-tts-api');
var googlettsaccent = 'us';
var accent = function(accent) {
  googlettsaccent = accent;
  return this;
};

var notify = function(message, callback) {
  if (!deviceAddress){
    browser.on('ready', function () {
      browser.discover();
    });
    browser.on('update', function(service) {
      if (service.txt != undefined && service.txt.includes(`fn=${device.replace(' ', '-')}`)){
        console.log('Device "%s(%s)" at %s:%d', service.fullname, device, service.addresses[0], service.port);
        deviceAddress = service.addresses[0];
        getSpeechUrl(message, deviceAddress, function(res) {
          callback(res);
        });
        browser.stop();
      }
    });
  }else {
    getSpeechUrl(message, deviceAddress, function(res) {
      callback(res);
    });
  }
};

var play = function(mp3_url, callback) {
  if (!deviceAddress){
    browser.on('ready', function () {
      browser.discover();
    });
    browser.on('update', function(service) {
      console.log('Device "%s" at %s:%d', service.fullname, service.addresses[0], service.port);
      if (service.fullname.includes(device.replace(' ', '-'))){
        deviceAddress = service.addresses[0];
        getPlayUrl(mp3_url, deviceAddress, function(res) {
          callback(res);
        });
        browser.stop();
      }
    });
  }else {
    getPlayUrl(mp3_url, deviceAddress, function(res) {
      callback(res);
    });
  }
};

var getSpeechUrl = function(text, host, callback) {
  googletts(text, language, 1).then(function (url) {
    onDeviceUp(host, url, function(res){
      callback(res)
    });
  }).catch(function (err) {
    console.error(err.stack);
  });
};

var getPlayUrl = function(url, host, callback) {
  onDeviceUp(host, url, function(res){
    callback(res)
  });
};

var onDeviceUp = function(host, url, callback) {
  var client = new Client();
  client.connect(host, function() {
    client.launch(DefaultMediaReceiver, function(err, player) {

      var media = {
        contentId: url,
        contentType: 'audio/mp3',
        streamType: 'BUFFERED' // or LIVE
      };
      player.load(media, { autoplay: true }, function(err, status) {
        client.close();
        callback('Device notified');
      });
    });
  });

  client.on('error', function(err) {
    console.log('Error: %s', err.message);
    client.close();
    callback('error');
  });
};

exports.ip = ip;
exports.device = device;
exports.mac = mac;
exports.accent = accent;
exports.notify = notify;
exports.play = play;
