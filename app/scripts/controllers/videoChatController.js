'use strict';

angular.module('angularPassportApp')
    .controller('RoomCtrl', function ($scope, $http, socket) {
        $scope.publisher;
        $scope.streams;
        $scope.session;
        $scope.sharingMyScreen = false;
        $scope.screenBig = true;
        $scope.shareURL = window.location.href;
        $scope.screenPublisher;
        $scope.screenPublisherProps = {
            name: "screen",
            style:{nameDisplayMode:"off"},
            publishAudio: false,
            constraints: {
                video: {
                    mandatory: {
                        chromeMediaSource: "screen",
                        maxWidth: screen.width,
                        minWidth: screen.width,
                        maxHeight: screen.height,
                        minHeight: screen.height,
                        maxFrameRate: 7,
                        minFrameRate: 7
                    },
                    optional: []
                },
                audio: false
            },
            mirror: false,
            width: screen.width,
            height: screen.height,
            aspectRatio: screen.width / screen.height
        };
        
        $scope.notMine = function(stream) {
            return stream.connection.connectionId != $scope.session.connection.connectionId;
        };
        
        $scope.shareScreen = function() {
            if (!$scope.sharingMyScreen) {
                $scope.sharingMyScreen = true;
            }
        };
        
        $scope.hideScreen = function() {
            if ($scope.sharingMyScreen) {
                $scope.sharingMyScreen = false;
            }
        };
        
        // It's a bit weird to handle changes in size at this level. Really this should be
        // in the Subscriber Directive but I'm trying not to pollute the generic 
        // Subscriber Directive
        $scope.$on("changeSize", function (event) {
            if (event.targetScope.stream.oth_large === undefined) {
                // If we're a screen we default to large otherwise we default to small
                event.targetScope.stream.oth_large = event.targetScope.stream.name !== "screen";
            } else {
                event.targetScope.stream.oth_large = !event.targetScope.stream.oth_large;
            }
            setTimeout(function () {
                event.targetScope.$emit("layout");
            }, 10);
        });
        
        $scope.$on("changeScreenSize", function (event) {
            $scope.screenBig = !$scope.screenBig;
            setTimeout(function () {
                event.targetScope.$emit("layout");
            }, 10);
        });




        //All rooms controller
        $http.get('videochat/rooms').
        success(function(data, status, headers, config) {
          $scope.rooms = data;
        });
        //All rooms controller

        //text chat controller
        socket.on('init', function (data) {
          $scope.name = data.name;
          $scope.users = data.users;
        });

        socket.on('send:message', function (message) {
          $scope.messages.push(message);
        });

        socket.on('change:name', function (data) {
          changeName(data.oldName, data.newName);
        });

        socket.on('user:join', function (data) {
          $scope.messages.push({
            user: 'chatroom',
            text: 'User ' + data.name + ' has joined.'
          });
          $scope.users.push(data.name);
        });

        // add a message to the conversation when a user disconnects or leaves the room
        socket.on('user:left', function (data) {
          $scope.messages.push({
            user: 'chatroom',
            text: 'User ' + data.name + ' has left.'
          });
          var i, user;
          for (i = 0; i < $scope.users.length; i++) {
            user = $scope.users[i];
            if (user === data.name) {
              $scope.users.splice(i, 1);
              break;
            }
          }
        });

        // Private helpers
        // ===============

        var changeName = function (oldName, newName) {
          // rename user in list of users
          var i;
          for (i = 0; i < $scope.users.length; i++) {
            if ($scope.users[i] === oldName) {
              $scope.users[i] = newName;
            }
          }

          $scope.messages.push({
            user: 'chatroom',
            text: 'User ' + oldName + ' is now known as ' + newName + '.'
          });
        }

        // Methods published to the scope
        // ==============================

        $scope.changeName = function () {
          if($scope.name != '') {
            socket.emit('change:name', {
              name: $scope.newName
            }, function (result) {
              if (!result) {
                alert('There was an error changing your name');
              } else {
                
                changeName($scope.name, $scope.newName);

                $scope.name = $scope.newName;
                $scope.newName = '';
              }
            });
          }
        };

        $scope.messages = [];

        $scope.sendMessage = function () {
          if($scope.message != '') {
            socket.emit('send:message', {
              message: $scope.message
            });

            $scope.messages.push({
              user: $scope.name,
              text: $scope.message
            });
          }

          $scope.message = '';
        };
        //text chat controller

    });