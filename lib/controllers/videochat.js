'use strict';




// var opentok = require("opentok"),
//     moniker = require("moniker"),
//     socket = require('./socket.js'),
//     io = require('socket.io');
    
// var ot = new opentok.OpenTokSDK("8911642", "b36521541e88f77d5dd6168c57426222f6dd8799");

// io.sockets.on('connection', socket);
var moniker = require("moniker");
// var io = require('socket.io');
// var socket = require('./socket.js');
// io.sockets.on('connection', socket);

var rooms = {},
    roomsName = [];

var usernames = {};
var allRooms = {};

var generator = moniker.generator([moniker.noun]);




exports.videochat = function(req, res) {
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
};


exports.videochatRoom = function(req, res) {
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
};

exports.videochatRooms = function(req, res) {
	res.json(roomsName);
};