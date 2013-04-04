// ## EmberPress
//
// This is a clone of the popular [Letterpress](https://itunes.apple.com/ca/app/letterpress-word-game/id526619424?mt=8)
// game. It is meant to show off the client side powers of the [EmberJS](http://emberjs.org)
// framework and was originally created for [Toronto EmberJS](http://torontoemberjs.com)
// meetup by [Evil Trout](http://eviltrout.com).
//
// Mucho thanks go out Loren Brichter for the inspiration. Thanks to the EmberJS
// team for making an awesome framework that makes client side development fun.
// The dictionary was imported from [EOWL](http://dreamsteep.com/projects/the-english-open-word-list.html).
// The icons are from [Font Awesome](http://fortawesome.github.com/Font-Awesome).
//
// The complete source code can be found on [Github](https://github.com/eviltrout/emberpress).

// ## EmberPress source code

/*global window, Ember, $, EmberPressDictionary, alert*/
(function () {
  'use strict';

  // All Ember applications need to be an instance of `Ember.Application`.
  // We'll create this first so that we can use it as a namespace for all
  // our models, controllers and views.
  var EmberPress = window.EmberPress = Ember.Application.create({
    rootElement: $('body')
  });

  // ## Libraries
  EmberPress.PusherController = Em.Controller.extend({

    LOG_ALL_EVENTS: false,
    _channels: [],
    _pusher: null,

    // pusherKey
    //  your application's pusher key
    //
    // channels
    //   is a hash containing key value pairs where the:
    //   key is the name by which you will refer to this channel
    //   value is the name of the pusher channel to subscribe to
    connect: function(pusherKey, channels, options) {
      this.set('_pusher', new Pusher(pusherKey, options));
      for(var name in channels) {
        var channel = this.get('_pusher').subscribe(channels[name]);

        // Keep track of all of our channels
        this.get('_channels').pushObject({
          name: name,
          channel: channel
        });

        // Spit out a bunch of logging if asked
        if(this.LOG_ALL_EVENTS) {
          channel.bind_all(function(eventName, data) {
            console.log("Pusher event received", eventName, data);
          });
        }
      }
    },

    channelFor: function(name) {
      var channelObject = this.get('_channels').findProperty('name', name);
      if(channelObject) {
        return channelObject.channel;
      }
      else {
        console.warn("Could not find a channel by the name of '" + name + "'");
      }
    }

  });

  // This mixin is intended to be mixed into a controller in order
  // to allow that controller to hook into pusher events.
  EmberPress.PusherListener = Em.Mixin.create({

    needs: 'pusher',

    _pusherBindings: [],

    // Implement the handlers in the controller or somewhere
    // up the chain (ie. in the router)
    //
    // The event name coming in from pusher is going to be camelized
    // ie: users_added pusher event will bubble the usersAdded event
    pusherListenTo: function(channelName, eventName) {
      var channel = this.get('controllers.pusher').channelFor(channelName);
      if(channel) {
        var _this = this;
        var handler = function(data) {
          _this.send(Em.String.camelize(eventName), data);
        };
        this.get('_pusherBindings').pushObject({
          channelName: channelName,
          eventName: eventName,
          handler: handler
        });
        channel.bind(eventName, handler);
      }
      else {
        console.warn("The channel '" + channelName + "' does not exist");
      }
    },

    // Unbind a specific event from being propagated
    pusherUnlistenTo: function(channelName, eventName) {
      var binding = this.get('_pusherBindings').find(function(b) {
        return b.channelName === channelName && b.eventName === eventName;
      });
      var channel = this.get('controllers.pusher').channelFor(channelName);
      if(binding && channel) {
        channel.unbind(binding.eventName, binding.handler);
        this.get('_pusherBindings').removeObject(binding);
      }
      else {
        console.warn("It doesn't look like have '" + eventName +
          "' bound to the '" + channelName + "' channel");
      }
    },

    // Hook into the object lifecycle to tear down any bindings
    destroy: function() {
      var _this = this;
      this.get('_pusherBindings').forEach(function(binding) {
        _this.pusherUnlistenTo(binding.channelName, binding.eventName);
      });
      this._super()
    }

  });

  // Allows you to trigger events on your controllers
  EmberPress.PusherTrigger = Em.Mixin.create({

    needs: 'pusher',

    // Fire an event programmatically
    pusherTrigger: function(channelName, eventName, data) {
      var channel = this.get('controllers.pusher').channelFor(channelName)
      channel.trigger(eventName, data);
    }

  });

  // ## Models
  //
  // Our models are delcared as extensions of `Ember.Object`. We use models
  // to organize our data.


  // **Letter:** A simple object to represent a letter on the board.
  EmberPress.Letter = Ember.Object.extend({});

  // **Word:** A word that has been played in the game.
  EmberPress.Word = Ember.Object.extend({});


  // **Player:** A player of the game. There will be two instances
  // of this, for p1 and p2.
  EmberPress.Player = Ember.Object.extend({

    // Players start with a score of 0.
    score: 0,

    // During a turn, all scores are automatically updated to show
    // how they will be affected should the player finished their
    // turn. We consider this the `possibleScore`. After their turn
    // is made, it will be saved in `score`.
    possibleScore: function() {

      // If it's a player's turn, their `possibleScore` is their
      // previous score plus the sum of the letters they've chosen.
      // If it's not a player's turn, their `possibleScore` is their
      // previous score minus the letters the current player has
      // stolen from them.
      var result = this.get('score');
      if (this.get('isTurn')) {
        result += this.get('board.score');
      } else {
        result -= this.get('board.stolenScore');
      }
      return result;
    }.property('board.score', 'board.stolenScore', 'isTurn'),

    // Is it this player's turn?
    isTurn: function() {
      return this.get('board.currentPlayer') === this;
    }.property('board.currentPlayer'),

    // When a turn finishes, `updateScore()` is called to make
    // the `possibleScore` permanent.
    updateScore: function() {
      this.set('score', this.get('possibleScore'));
    }

  });

  // **Board:** The current game board and all associated data.
  EmberPress.Board = Ember.Object.extend({

    // The dimensions of the board. It's always square so we just need
    // one size.
    SIZE: 5,

    // Start a new game on the board.
    restart: function() {

      // When a game begins, there is no winner.
      this.set('winner', null);

      // There are two players. We'll identify them as *p1* and *p2*
      this.set('player1', EmberPress.Player.create({
        id: 'p1',
        board: this,
        user_id: PRELOAD.game.players.player1.id
      }));

      // The first turn always goes to *p1*
      this.set('currentPlayer', this.get('player1'));

      // Clear the current word being built by the players.
      this.clearWord();

      // `played` is a list of all previously played words.
      this.set('played', Ember.A());

      // `rows` is the collection of rows that make up the board.
      this.set('rows', Ember.A());

      // Assemble a board of random `letter`s. Each `letter` is given a random
      // uppercase ascii character and an id to identify it.
      var letterId = 0;
      for(var j=0; j< this.SIZE; j += 1) {
        var row = Ember.A();
        for(var i=0; i<this.SIZE; i += 1) {
          var letter = EmberPress.Letter.create({
            id: letterId,
            letter: PRELOAD.game.letters[letterId]
          });
          row.pushObject(letter);
          letterId += 1;
        }
        this.rows.pushObject(row);
      }
    },

    // The game has history once at least one word has been played. We use this
    // to determine whether to show the list of previous words at the bottom of
    // the interface.
    hasHistory: function() {
      return this.get('played').length > 0;
    }.property('played.@each'),

    // Add a letter to the word being built.
    addLetter: function(letter) {
      this.get('word').pushObject(letter);
    },

    // Remove a letter from the word being built.
    removeLetter: function(letter) {
      this.get('word').removeObject(letter);
    },

    // Remove all letters from the word.
    clearWord: function() {
      this.set('word', Ember.A());
    },

    // Switch to the next player's turn and clear the current word in progress.
    nextTurn: function() {
      this.clearWord();
      this.set('currentPlayer', this.get('otherPlayer'));
    },

    // Our current word is a collection of `Letter` instances. This property
    // returns the word as a string.
    wordAsString: function() {
      var result = "";
      this.get('word').forEach(function (letter) {
        result += letter.get('letter');
      });
      return result;
    }.property('word.@each'),

    // `otherPlayer` is a reference to the `Player` who currently isn't taking
    // their turn.
    otherPlayer: function() {
      if (this.get('currentPlayer') === this.get('player1')) return this.get('player2');
      return this.get('player1');
    }.property('currentPlayer'),

    // If the current word is being made up of letters belonging to the other player,
    // we consider them stolen. To correctly display the other player's possible score
    // we need to calculate how many points have been stolen.
    // fortified letters cannot be stolen.
    stolenScore: function() {
      var result = 0,
          otherPlayer = this.get('otherPlayer');
      this.get('word').forEach(function (letter) {
        if (letter.get('owner') === otherPlayer && !letter.get('fortified')) {
          result += 1;
        }
      });
      return result;
    }.property('word.@each'),

    // The score of the current word. Each `Letter` is worth one point if it doesn't belong
    // to the player making the movie and it hasn't been foritifed.
    score: function() {
      var result = 0,
          currentPlayer = this.get('currentPlayer');
      this.get('word').forEach(function (letter) {
        if ((letter.get('owner') !== currentPlayer) && (!letter.get('fortified'))) {
          result += 1;
        }
      });
      return result;
    }.property('word.@each'),

    // Finish the current game.
    finishGame: function(resigned) {

      // If a player resigned, the other player automatically wins.
      if (resigned) {
        this.set('winner', this.get('otherPlayer'));
      } else {

        // Otherwise, the winner is simply the player with the larger score.
        var diff = this.get('player1.score') - this.get('player2.score');
        if (diff > 0) {
          this.set('winner', this.get('player1'));
        } else if (diff < 0) {
          this.set('winner', this.get('player2'));
        }
      }
    },

    // Submit the current word in play.
    submitWord: function() {

      // We call `updateScore` on both players to make their `possibleScore`s
      // permanent.
      var currentPlayer = this.get('currentPlayer');
      currentPlayer.updateScore();
      this.get('otherPlayer').updateScore();

      // Give ownership of each `Letter` in the word to the current player unless the
      // `Letter` is fortitied.
      this.get('word').forEach(function (letter) {
        // Change the color unless it's fortified
        if (!letter.get('fortified')) {
          letter.set('owner', currentPlayer);
        }
      });

      // We need to iterate through every `Letter` on the board to determine if they
      // are fortified. During this iteration, we also determine whether every `Letter`
      // has a colour. If so, the game is over.
      var boardFull = true;
      for(var y=0; y<this.SIZE; y++) {
        for (var x=0; x<this.SIZE; x++) {
          var letter = this.rows[y][x];
          var owner = letter.get('owner.id');

          // By default we remove fortification (it will be applied again if still valid.)
          letter.set('fortified', false);

          if (owner) {
            // Check the NESW neighbors of the tile
            if ((y > 0) && (this.rows[y-1][x].get('owner.id') != owner)) continue;
            if ((y < this.SIZE-1) && (this.rows[y+1][x].get('owner.id') != owner)) continue;
            if ((x > 0) && (this.rows[y][x-1].get('owner.id') != owner)) continue;
            if ((x < this.SIZE-1) && (this.rows[y][x+1].get('owner.id') != owner)) continue;

            // If all neighbours are the same colour, fortify it.
            letter.set('fortified', true);
          } else {
            // If a single tile has no owner, we don't consider the board full.
            boardFull = false;
          }
        }
      }

      // Add the word to the played list
      this.get('played').addObject(EmberPress.Word.create({
        value: this.get('wordAsString'),
        playedBy: this.get('currentPlayer')
      }));

      // If the board is full, finish the game.
      if (boardFull) {
        this.finishGame(false);
      } else {
        // Otherwise, skip to the next player's turn.
        this.nextTurn();
      }
    }

  });

  // ## Controllers

  // **ApplicationController**: Handles controls at the application level.
  EmberPress.ApplicationController = Ember.Controller.extend(
    EmberPress.PusherListener,
    {
      isLoading: true,

      // Whether the instructions are being displayed.
      instructionsVisible: false,

      // Toggle displaying the instructions.
      toggleInstructions: function() {
        this.toggleProperty('instructionsVisible');
      }
    }
  );

  EmberPress.WaitingController = Ember.Controller.extend({
    needs: 'board',

    player2Binding: 'controllers.board.content.player2',

    isWaiting: function() {
      return !this.get('player2');
    }.property('player2'),
  });

  // **BoardController**: handles all interaction with the game board.
  EmberPress.BoardController = Ember.ObjectController.extend(
    EmberPress.PusherTrigger,
    EmberPress.PusherListener,
    {

    // By default, there is no game in progress.
    inProgress: true,

    // Set the curren't users id as provided by the server
    currentUserId: PRELOAD.user_id,

    // Do we want to show 'CLEAR' button?
    showClearWord: function() {
      // The word needs to have at least one letter to be cleared.
      return this.get('content.word').length > 0;
    }.property('content.word.@each'),

    // Do we want to show the 'SUBMIT' button?
    showSubmitWord: function() {
      // Word needs to be at least 2 letters long
      return (this.get('content.word').length > 1);
    }.property('content.word.@each'),

    // `resign` is called when a player clicks the resign button.
    clientResign: function(data) {
      this.get('content').finishGame(true);
      if(!data || !data.remote)
        this.pusherTrigger('game', 'client-resign', { remote: true });
    },

    // If we have a winner, the game is over
    winnerChanged: function() {
      if (this.get('content.winner')) {
        this.set('inProgress', false);
      }
    }.observes('content.winner'),

    // `submitWord` is called when the player clicks submit.
    clientSubmitWord: function(data) {
      var data = data || {};
      if(!data.remote && this.notUsersTurn()) return;
      var w = this.get('content.wordAsString').toLowerCase();

      // First, we need to see if the word is in our game's dictionary.
      // We use jQuery's handy $.inArray for this.
      if ($.inArray(w, EmberPressDictionary) == -1) {
        alert("Sorry, that word isn't in the dictionary");
        return;
      }

      // Secondly, we need to consider whether that word has already
      // been played. We unfortunately have to use a `forEach` for this,
      // as we do not allow roots of existing words either.
      var unplayedWord = true;
      this.get('content.played').forEach(function (word) {
        if (word.get('value').toLowerCase().indexOf(w) === 0) {
          alert("That word can't be played.");
          unplayedWord = false;
          return false;
        }
      });
      if (!unplayedWord) return;

      // Note that this turn wasn't skipped.
      this.set('skipped', false);

      // Finally, submit the word to the `Board` model.
      this.get('content').submitWord();

      if(!data.remote)
        this.pusherTrigger('game', 'client-submit-word', { remote: true });
    },

    // When a user chooses to skip their turn.
    clientSkipTurn: function(data) {
      var data = data || {};
      if(!data.remote && this.notUsersTurn()) return;
      if (this.get('skipped')) {
        // If the previous player also skipped their turn, the game is now over.
        this.get('content').finishGame();
      } else {
        // Otherwise, skip to the next turn.
        this.set('skipped', true);
        this.get('content').nextTurn();
      }
      if(!data.remote)
        this.pusherTrigger('game', 'client-skip-turn', { remote: true });
    },

    // When we want to start a new game on this board.
    reset: function() {
      window.location = '/'
    },

    clientJoined: function(data) {
      this.set('player2', EmberPress.Player.create({
        id: 'p2',
        board: this,
        user_id: data.user_id
      }));
    },

    clientClearWord: function(data) {
      var data = data || {};
      if(!data.remote && this.notUsersTurn()) return;
      this.get('content').clearWord();
      if(!data || !data.remote)
        this.pusherTrigger('game', 'client-clear-word', { remote: true });
    },

    clientAddLetter: function(data) {
      var letter = this.findLetter(data.id);
      if(!data.remote) {
        this.pusherTrigger('game', 'client-add-letter',
          { id: data.id, remote: true }
        );
      }
      this.get('content').addLetter(letter);
    },

    clientRemoveLetter: function(data) {
      var data = data || {};
      if(!data.remote && this.notUsersTurn()) return;
      var letter = this.findLetter(data.id);
      if(!data.remote) {
        this.pusherTrigger('game', 'client-remove-letter',
          { id: data.id, remote: true }
        );
      }
      this.get('content').removeLetter(letter);
    },

    'pusher:subscriptionSucceeded': function() {
      this.pusherTrigger('game', 'client-joined', { remote: true });
    },

    notUsersTurn: function() {
      if(this.get('currentUserId') != this.get('content.currentPlayer.user_id')) {
        alert("It's not your turn!");
        return true;
      }
    },

    findLetter: function(id) {
      var letter = null;
      this.get('content.rows').find(function(row) {
        letter = row.findProperty('id', id);
        return letter;
      });
      return letter
    }

  });

  // ## Views

  EmberPress.WaitingView = Ember.View.extend({
    templateName: 'waiting',
    classNameBindings: ['controller.isWaiting', ':waiting-for-opponent']
  });

  // **BoardView**: Used to render the board from a template.
  EmberPress.BoardView = Ember.View.extend({templateName: 'board'});

  // **LetterView**: Represents a `Letter` either on the board, or in the current
  // word being assembled.
  EmberPress.LetterView = Ember.View.extend({
    classNameBindings: [':letter', 'chosen', 'ownerClass', 'content.fortified'],
    boardBinding: 'controller.content',

    // Set the CSS class to be the id of the current `Letter`, if present.
    ownerClass: function() {
      var owner = this.get('content.owner');
      if (!owner) { return null; }
      return owner.get('id');
    }.property('content.owner'),

    // No need for a template for one letter!
    render: function(buffer) {
      buffer.push(this.get('content.letter'));
    }
  });

  // **WordLetterView**: is the word being assembled.
  EmberPress.WordLetterView = EmberPress.LetterView.extend({

    // If the player clicks a letter in the word, we remove it.
    click: function() {
      this.get('controller').send('clientRemoveLetter', { id: this.get('content.id') });
    }

  });

  // **BoardLetterView**: A `LetterView` that is displayed on the board.
  EmberPress.BoardLetterView = EmberPress.LetterView.extend({

    // Has this letter been chosen?
    chosen: function() {
      return this.get('board.word').findProperty('id', this.get('content.id')) ? true : false;
    }.property('board.word.@each.id'),

    // The player clicked on a letter, so we want to add it to our word.
    click: function() {
      if(this.get('controller').notUsersTurn() || this.get('chosen')) return;
      this.get('controller').send(
        'clientAddLetter',
        { id: this.get('content.id') }
      );
    }
  });

  // **PlayerView**: Render a player with their scores.
  EmberPress.PlayerView = Ember.View.extend({
    classNameBindings: [':player', 'content.id', 'content.isTurn'],
    templateName: 'player'
  });

  EmberPress.ApplicationRoute = Ember.Route.extend({
    setupController: function(controller) {
      var pusher = this.controllerFor('pusher');
      pusher.connect(PRELOAD.pusher.key, {
        app: PRELOAD.pusher.app_channel,
        game: PRELOAD.pusher.game_channel
      });
    }
  });

  // Boilerplate below initializes the game. Routers make more sense
  // when there is more than one URL :)
  EmberPress.IndexRoute = Ember.Route.extend({
    setupController: function(controller) {
      var board = EmberPress.Board.create();
      var boardController = this.controllerFor('board');
      var waitingController = this.controllerFor('waiting');
      board.restart();
      boardController.set('content', board);

      // Bind to the relevant pusher events that will arrive
      boardController.pusherListenTo('game', 'client-add-letter');
      boardController.pusherListenTo('game', 'client-remove-letter');
      boardController.pusherListenTo('game', 'client-joined');
      boardController.pusherListenTo('game', 'client-clear-word');
      boardController.pusherListenTo('game', 'client-submit-word');
      boardController.pusherListenTo('game', 'client-skip-turn');
      boardController.pusherListenTo('game', 'client-resign');

      // If the current user is player 2, set them up
      if(PRELOAD.game.players.player2.id === PRELOAD.user_id) {
        boardController.send('clientJoined', { user_id: PRELOAD.user_id });
        boardController.pusherListenTo('game', 'pusher:subscription_succeeded');
      }
    },

    renderTemplate: function() {
      this.render('board');
    }
  });

}());