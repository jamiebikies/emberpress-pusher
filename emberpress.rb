require 'securerandom'

class Emberpress < Sinatra::Base

  enable :sessions

  LETTERS = %w{ A B C D E F G H I J K L M N O P Q R S T U F W X Y Z }

  def self.[](value)
    begin
      @config ||= YAML.load_file('./config.yml')
    rescue
      raise "You probably want to create a config.yml based on config.yml.tmpl"
    end
    @config[value]
  end

  def self.game(id)
    @games ||= {}
    unless @games[id]
      @games[id] = { id: id }
      @games[id][:letters] = []
      @games[id][:players] = { player1: {}, player2: {} }
      25.times { |i|
        @games[id][:letters][i] = LETTERS.sample
      }
    end
    @games[id]
  end

  def self.add_player(game_id, user_id)
    players = game(game_id)[:players]
    players[:player1][:id] ||= user_id
    if players[:player2][:id].nil? && players[:player1][:id] != user_id
      players[:player2][:id] = user_id
    end
  end

  register Sinatra::Reloader

  set :views, File.expand_path(File.dirname(__FILE__))

  get '/' do
    redirect "/new"
  end

  get '/new' do
    redirect "/#{SecureRandom.hex(2)}"
  end

  post '/pusher/auth' do
    content_type :json
    Pusher[params[:channel_name]].authenticate(params[:socket_id]).to_json
  end

  get '/:id' do
    session[:user_id] ||= SecureRandom.hex(5)
    @game = Emberpress.game(params[:id])
    ap @game
    Emberpress.add_player(params[:id], session[:user_id])
    erb :index
  end

end
