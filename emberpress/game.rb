module Emberpress

  class Game

    LETTERS = %w{ A B C D E F G H I J K L M N O P Q R S T U F W X Y Z }

    attr_reader :id, :player1s, :player2s, :letters

    def self.find(id)
      @games ||= {}
      unless @games[id]
        @games[id] = Game.new(id)
        Pusher.trigger(
          Emberpress[:pusher][:app_channel],
          'game-created',
          { game_id: id }
        )
      end
      @games[id] ||= Game.new(id)
    end

    def initialize(id)
      @id = id
      @letters = []
      @player1s = []
      @player2s = []
      25.times { |i| @letters[i] = LETTERS.sample }
    end

    def add_player(user_id)
      return if @player1s.include?(user_id) || @player2s.include?(user_id)
      if @player1s.length > @player2s.length
        @player2s.push(user_id)
      else
        @player1s.push(user_id)
      end
    end

    def pusher_channel_name
      "presence-game.#{id}"
    end

    def to_json
      {
        id: id,
        players: {
          player1s: @player1s,
          player2s: @player2s
        },
        letters: letters
      }.to_json
    end

  end

end
