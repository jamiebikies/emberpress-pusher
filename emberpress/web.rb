require 'securerandom'

module Emberpress

  class Web < Sinatra::Base

    enable :sessions
    set :public_folder, 'emberpress/assets'
    set :views, 'emberpress'

    get '/' do
      redirect "/#{SecureRandom.hex(2)}"
    end

    post '/pusher/auth' do
      content_type :json
      Pusher[params[:channel_name]].authenticate(params[:socket_id]).to_json
    end

    get '/:id' do
      session[:user_id] ||= SecureRandom.hex(5)
      @game = Emberpress::Game.find(params[:id])
      @game.add_player(session[:user_id])
      erb :index
    end

  end

end
