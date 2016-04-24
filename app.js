var http = require('http');
var fs = require('fs');
var serialport = require('serialport');
var SerialPort = serialport.SerialPort;
var ssdp = require('peer-ssdp');
var request = require('request');
var Cylon = require('cylon');
var moment = require('moment');
var robot;

var KWH_RATE = 0.13;

var ConversionUtil = require('./conversion');
var conversionUtil = new ConversionUtil();

fs.readFile('./index.html', function(err, html) {

    // create HTTP server
    var app = http.createServer(function(req, res) {
        console.log(req.url);
        if (req.url === '/') {
            res.writeHead(200, {"Content-Type": "text/html"});
            res.end(html);
        } else if (req.url === '/relay') {
            if (robot) {
                console.log('toggling relay');
                robot.toggle();
                res.writeHead(204, null);
                res.end();
            }
        }
    });

    // start listening on port 8080
    app.listen(8080, function() {
        console.log('Web server listening on *:8080');

        // set up cylon
        robot = Cylon.robot({
           connections: {
               edison: {
                   adaptor: 'intel-iot'
               }
           },
            devices: {
                relay: {
                    driver: 'relay',
                    pin: 2,
                    type: 'closed'
                },
                led: {
                    driver: 'led',
                    pin: 3
                }
            },
            toggle: function() {
                var that = this;
                that.relay.toggle();
            },
            turnOn: function() {
                console.log('turn LED on');
                var that = this;
                that.led.turnOn();
            },
            turnOff: function() {
                console.log('turn LED off');
                var that = this;
                that.led.turnOff();
            }
        }).start();

        // set up socket.io
        var io = require('socket.io').listen(app);
        io.on('connection', function(socket) {
            console.log('a web client connected');
        });

        // set up serial port
        var port = new SerialPort('/dev/ttyMFD1', {
            baudRate: 19200
        }, function(err) {
            if (err) {
                console.log('failed to initialize serial port: ', err);
            } else {
                console.log('serial port is initialized');
                // listen for updates from serial port
                port.on('data', function (data) {
                    var kws = (conversionUtil.convertHardwareValue(data)).toFixed(2);
                    console.log('current kw:', kws);
                    publishValue(io, kws);
                });
            }
        });

        // set up SSDP server
        startSSDP();
    });
});

function publishValue(io, v) {
    var now = moment();

    if (Number(v) > 0) {
        robot.turnOn();
    } else {
        robot.turnOff();
    }

    var payload = {
        kwh: v,
        monthToDateCost: conversionUtil.calculateMonthToDateCost(now, KWH_RATE),
        remainingMonthCost: conversionUtil.calculateRemainingMonthCost(now, v, KWH_RATE)
    };

    // send to web client
    io.emit('analogUpdate', payload);

    // send to sparkfun
    request.post({
        url: 'https://data.sparkfun.com/input/4JYgz7raWKul66ZEzYb1',
        headers: {
            'Phant-Private-Key': 'b5GrDMKnX7FPnnEedXW4'
        },
        form: payload
    }, function(err, httpResponse, body) {
        if (err) {
            console.log('error sending spark data', err);
        }
    });
}

function startSSDP() {
    var peer = ssdp.createPeer();
    peer.on("ready", function() {
        console.log('Starting SSDP server');
        var interval = setInterval(function() {
            peer.alive({
                ST: 'upnp:rootdevice',
                USN: 'urn:EnergyOracle:1',
                LOCATION: 'http://{{networkInterfaceAddress}}/index.html'
            });
        }, 5000);
        peer.on("search", function(headers, address) {
            peer.reply({
                ST: 'upnp:rootdevice',
                USN: 'urn:EnergyOracle:1'
            }, address);
        });
    });
    peer.start();
}
