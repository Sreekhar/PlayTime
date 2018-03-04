$(() => {
  let FADE_TIME = 150; // ms
  let TYPING_TIMER_LENGTH = 400; // ms
  let COLORS = [
    '#e21400', '#91580f', '#f8a700', '#f78b00',
    '#58dc00', '#287b00', '#a8f07a', '#4ae8c4',
    '#3b88eb', '#3824aa', '#a700ff', '#d300e7'
  ];

  // Initialize variables
  let $window = $(window);
  let $usernameInput = $('.usernameInput'); // Input for username
  let $messages = $('.messages'); // Messages area
  let $inputMessage = $('.inputMessage'); // Input message input box

  let $loginPage = $('.login.page'); // The login page
  let $chatPage = $('.chat.page'); // The chatroom page

  // Prompt for setting a username
  let username;
  let connected = false;
  let typing = false;
  let lastTypingTime;
  let $currentInput = $usernameInput.focus();
  let numUsers = 0;

  $(document).ready(() => {
      let usernameInput = document.getElementById('usernameInput');
      usernameInput.onkeyup = () => {
          let inputLength = usernameInput.value.length;
          if(inputLength < 11) {
              if ( $("#walkingGIF").length ) {
                  $("#walkingGIF").remove();
              }
              let imageElement = document.createElement("img");
              imageElement.setAttribute("id", "walkingGIF");
              if(inputLength == 10) {
                  imageElement.setAttribute("src", "images/walking/frame_" + inputLength + "_delay-0.09s.gif");
              } else {
                  imageElement.setAttribute("src", "images/walking/frame_0" + inputLength + "_delay-0.09s.gif");
              }
              $loginPage.append(imageElement);
          } else {
              if ( $("#walkingGIF").length ) {
                  $("#walkingGIF").remove();
              }
          }
      }

  });

  $(document).mousemove((e) => {
      $(".CopCursor").css({left:e.pageX, top:e.pageY});
      socket.emit('share positions', e.pageX, e.pageY);
  });

  let socket = io();

  let addParticipantsMessage = (data) => {
    var message = '';
    numUsers = data.numUsers;
    if (data.numUsers === 1) {
      message += "there's 1 participant";
    } else {
      message += "there are " + data.numUsers + " participants";
    }
    log(message);
  }

  // Sets the client's username
  let setUsername = () => {
    username = cleanInput($usernameInput.val().trim());

    // If the username is valid
    if (username) {
      $loginPage.fadeOut();
      $('.game').show();
      $chatPage.show();
      $loginPage.off('click');
      $currentInput = $inputMessage.focus();

      if(numUsers > 9) {
          numUsers = numUsers % 10;
      }
      $(".CopCursor").attr("src", "images/cops/cops-" + numUsers + ".gif");

      // Tell the server your username
      socket.emit('add user', username);
    }
  }

  // Sends a chat message
  function sendMessage () {
    var message = $inputMessage.val();
    // Prevent markup from being injected into the message
    message = cleanInput(message);
    // if there is a non-empty message and a socket connection
    if (message && connected) {
      $inputMessage.val('');
      // tell server to execute 'new message' and send along one parameter
      socket.emit('new message', message);
    }
  }

  // Log a message
  let log = (message, options) => {
    var $el = $('<div>').addClass('log').text(message);
    addMessageElement($el, options);
  }

  // Adds the visual chat message to the message list
  function addChatMessage (data, options) {
    // Don't fade the message in if there is an 'X was typing'
    var $typingMessages = getTypingMessages(data);
    options = options || {};
    if ($typingMessages.length !== 0) {
      options.fade = false;
      $typingMessages.remove();
    }

    var $usernameDiv = $('<span class="username"/>')
      .text(data.username)
      .css('color', getUsernameColor(data.username));
    var $messageBodyDiv = $('<span class="messageBody">')
      .text(data.message);

    var typingClass = data.typing ? 'typing' : '';
    var $messageDiv = $('<div class="message"/>')
      .data('username', data.username)
      .addClass(typingClass)
      .append($usernameDiv, $messageBodyDiv);

    addMessageElement($messageDiv, options);
  }

  // Adds the visual chat typing message
  function addChatTyping (data) {
    data.typing = true;
    data.message = 'is typing';
    addChatMessage(data);
  }

  // Removes the visual chat typing message
  function removeChatTyping (data) {
    getTypingMessages(data).fadeOut(function () {
      $(this).remove();
    });
  }

  // Adds a message element to the messages and scrolls to the bottom
  // el - The element to add as a message
  // options.fade - If the element should fade-in (default = true)
  // options.prepend - If the element should prepend
  //   all other messages (default = false)
  function addMessageElement (el, options) {
    var $el = $(el);

    // Setup default options
    if (!options) {
      options = {};
    }
    if (typeof options.fade === 'undefined') {
      options.fade = true;
    }
    if (typeof options.prepend === 'undefined') {
      options.prepend = false;
    }

    // Apply options
    if (options.fade) {
      $el.hide().fadeIn(FADE_TIME);
    }
    if (options.prepend) {
      $messages.prepend($el);
    } else {
      $messages.append($el);
    }
    $messages[0].scrollTop = $messages[0].scrollHeight;
  }

  // Prevents input from having injected markup
  // Prevents input from having injected markup
  function cleanInput (input) {
    return $('<div/>').text(input).html();
  }

  // Updates the typing event
  function updateTyping () {
    if (connected) {
      if (!typing) {
        typing = true;
        socket.emit('typing');
      }
      lastTypingTime = (new Date()).getTime();

      setTimeout(function () {
        var typingTimer = (new Date()).getTime();
        var timeDiff = typingTimer - lastTypingTime;
        if (timeDiff >= TYPING_TIMER_LENGTH && typing) {
          socket.emit('stop typing');
          typing = false;
        }
      }, TYPING_TIMER_LENGTH);
    }
  }

  // Gets the 'X is typing' messages of a user
  function getTypingMessages (data) {
    return $('.typing.message').filter(function (i) {
      return $(this).data('username') === data.username;
    });
  }

  // Gets the color of a username through our hash function
  function getUsernameColor (username) {
    // Compute hash code
    var hash = 7;
    for (var i = 0; i < username.length; i++) {
       hash = username.charCodeAt(i) + (hash << 5) - hash;
    }
    // Calculate color
    var index = Math.abs(hash % COLORS.length);
    return COLORS[index];
  }

  // Keyboard events

  $window.keydown(function (event) {
    // Auto-focus the current input when a key is typed
    if (!(event.ctrlKey || event.metaKey || event.altKey)) {
      $currentInput.focus();
    }
    // When the client hits ENTER on their keyboard
    if (event.which === 13) {
      if (username) {
        sendMessage();
        socket.emit('stop typing');
        typing = false;
      } else {
        setUsername();
      }
    }
  });

  $inputMessage.on('input', function() {
    updateTyping();
  });

  // Click events

  // Focus input when clicking anywhere on login page
  $loginPage.click(function () {
    $currentInput.focus();
  });

  // Focus input when clicking on the message input's border
  $inputMessage.click(function () {
    $inputMessage.focus();
  });

  // Socket events

  // Whenever the server emits 'login', log the login message
  socket.on('login', function (data) {
    connected = true;
    // Display the welcome message
    var message = "Welcome to catchcatch.com chat – ";
    log(message, {
      prepend: true
    });

    for(let iCount = 0; iCount <= data.id; iCount++) {
        image_id = iCount;
        if(image_id > 9) {
            image_id = image_id % 10;
        }
        let d = document.createElement('img');
        let gameElement = $('.game');
        d.setAttribute("src", "images/cops/cops-" + image_id + ".gif");
        d.setAttribute("class", "CopCursor" + iCount);
        gameElement.append(d);
        $(".game").mouseover(() => {
            $(".CopCursor" + iCount).show()
        });
    }
    $('.chat').mouseover(() => {
        $(".CopCursor" + iCount).hide()
    });    
    addParticipantsMessage(data);
  });

  // Whenever the server emits 'new message', update the chat body
  socket.on('new message', function (data) {
    addChatMessage(data);
  });

  //Share positions
  socket.on('send positions', (positions) => createCursors(positions))

  let createCursors = positions => {
      for(let iCount = 0; iCount < positions.positionArray.length; iCount++) {
          userCount = iCount;
          if(userCount > 9) {
              userCount = userCount % 10;
          }
          $('.CopCursor' + userCount).css('position', 'absolute');
          $('.CopCursor' + userCount).css('left', positions.positionArray[iCount].positionX + 'px');
          $('.CopCursor' + userCount).css('top', positions.positionArray[iCount].positionY + 'px');
          $('.CopCursor' + userCount).css('height', '75px');
          $('.CopCursor' + userCount).css('width', '75px');
      }
  }

  // Whenever the server emits 'user joined', log it in the chat body
  socket.on('user joined', function (data) {
    log(data.username + ' joined');
    image_id = data.id;
    if(image_id > 9) {
        image_id = image_id % 10;
    }
    let d = document.createElement('img');
    let gameElement = $('.game');
    d.setAttribute("src", "images/cops/cops-" + image_id + ".gif");
    d.setAttribute("class", "CopCursor" + data.id);
    gameElement.append(d);
    $(".game").mouseover(() => {
        $(".CopCursor" + data.id).show()
    });
    $('.chat').mouseover(() => {
        $(".CopCursor" + data.id).hide()
    });
    addParticipantsMessage(data);
  });

  // Whenever the server emits 'user left', log it in the chat body
  socket.on('user left', function (data) {
    log(data.username + ' left');
    addParticipantsMessage(data);
    removeChatTyping(data);
  });

  // Whenever the server emits 'typing', show the typing message
  socket.on('typing', function (data) {
    addChatTyping(data);
  });

  // Whenever the server emits 'stop typing', kill the typing message
  socket.on('stop typing', function (data) {
    removeChatTyping(data);
  });

  socket.on('disconnect', function () {
    log('you have been disconnected');
  });

  socket.on('reconnect', function () {
    log('you have been reconnected');
    if (username) {
      socket.emit('add user', username);
    }
  });

  socket.on('reconnect_error', function () {
    log('attempt to reconnect has failed');
  });

});
