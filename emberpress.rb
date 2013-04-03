require 'securerandom'

class Emberpress < Sinatra::Base

  register Sinatra::Reloader

  get '/' do
    redirect "/new"
  end

  get '/new' do
    redirect "/#{SecureRandom.hex(2)}"
  end

  get '/:game_id' do
    send_file File.join(settings.public_folder, 'index.html')
  end

end
