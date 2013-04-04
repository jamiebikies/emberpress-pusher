module Emberpress

  class Game

    LETTERS = %w{ A B C D E F G H I J K L M N O P Q R S T U F W X Y Z }

    attr_reader :id, :player1, :player2, :letters

    def self.find(id)
      @games ||= {}
      @games[id] ||= Game.new(id)
    end

    def initialize(id)
      @id = id
      @letters = []
      @player1 = {}
      @player2 = {}
      25.times { |i| @letters[i] = LETTERS.sample }
    end

    def add_player(user_id)
      @player1[:id] ||= user_id
      if @player2[:id].nil? && @player1[:id] != user_id
        @player2[:id] = user_id
      end
    end

    def pusher_channel_name
      "private-game.#{id}"
    end

    def to_json
      {
        id: id,
        players: {
          player1: @player1,
          player2: @player2
        },
        letters: letters
      }.to_json
    end

  end

end
