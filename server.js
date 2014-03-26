'use strict';

// Module dependencies.
var express = require('express'),
    http = require('http'),
    passport = require('passport'),
    path = require('path'),
    fs = require('fs'),
    mongoStore = require('connect-mongo')(express),
    config = require('./lib/config/config');

//Opentok
var opentok = require("opentok"),
    moniker = require("moniker"),
    https = require("https"),
    socket = require('./lib/controllers/socket.js');

var rooms = {},
    roomsName = [];

var ot = new opentok.OpenTokSDK("8911642", "b36521541e88f77d5dd6168c57426222f6dd8799");
//Opentok

var app = express(),
    server = http.createServer(app),
    io = require('socket.io').listen(server);




// Connect to database
var db = require('./lib/db/mongo').db;

// Bootstrap models
var modelsPath = path.join(__dirname, 'lib/models');
fs.readdirSync(modelsPath).forEach(function (file) {
  require(modelsPath + '/' + file);
});

var pass = require('./lib/config/pass');

// App Configuration
app.configure('development', function(){
  app.use(express.static(path.join(__dirname, '.tmp')));
  app.use(express.static(path.join(__dirname, 'app')));
  app.use(express.errorHandler());
  app.set('views', __dirname + '/app/views');
});

app.configure('production', function(){
  app.use(express.favicon(path.join(__dirname, 'public', 'favicon.ico')));
  app.use(express.static(path.join(__dirname, 'public')));
  app.set('views', __dirname + '/views');
});

app.engine('html', require('ejs').renderFile);
app.set('view engine', 'ejs');
app.use(express.logger('dev'));
app.use(express.cookieParser());
app.use(express.bodyParser());
app.use(express.methodOverride());

// express/mongo session storage
app.use(express.session({
  secret: 'MEAN',
  store: new mongoStore({
    url: config.db,
    collection: 'sessions'
  })
}));

app.use(passport.initialize());
app.use(passport.session());


//Opentok routes

// app.get('*', function(req,res,next) {
//     if (req.headers.host.indexOf('localhost') > -1) next();
//     else if(req.headers['x-forwarded-proto'] != 'https') {
//         res.redirect('https://opentok-hangout.herokuapp.com'+req.url);
//     } else {
//         next();
//     }
// });

app.get('/videochat/rooms', function(req, res) {
    res.json(roomsName);
});

app.get('/videochat/:room', function(req, res) {
    var room = req.param('room'),
        goToRoom = function(sessionId) {            
            if (!rooms[room]) {
                rooms[room] = sessionId;
            } else {
                // Someone else beat us to it, we should connect to the same session
                sessionId = rooms[room];
            }
            res.render('room', {
                room: room,
                apiKey: "8911642",
                sessionId: rooms[room],
                token: ot.generateToken({sessionId: rooms[room],role: "publisher"})
            });
        };

    if (!rooms[room]) {
        var props = {'p2p.preference': 'enabled'};
        if (["false", "disabled", "0"].indexOf(req.param('p2p')) >= 0) {
            props['p2p.preference'] = 'disabled';
        }
        ot.createSession('', props, goToRoom);
    } else {
        goToRoom(rooms[room]);
    }
});

var usernames = {};
var allRooms = {};

var generator = moniker.generator([moniker.noun]);

app.get('/videochat', function(req, res) {
    var room = generator.choose();
    roomsName.push(room);

    io.sockets.on('connection', function(socket) {
        socket.on('newRoom', function(room) {
            socket.room = room;
            allRooms[room] = room;
            io.sockets.emit('updateRooms', 'new room ' + room + 'was created');
        });
    });
    res.redirect('/videochat/'  + room + (req.param('p2p') ? ("?p2p=" + req.param('p2p')) : ""));
});

io.sockets.on('connection', socket);
//Opentok routes

app.use(app.router);

//Bootstrap routes
require('./lib/config/routes')(app);

// Start server
var port = process.env.PORT || 3000;
server.listen(port, function () {
  console.log('Express server listening on port %d in %s mode', port, app.get('env'));
});