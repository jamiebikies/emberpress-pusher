require 'rubygems'
require 'bundler'

Bundler.require

require './emberpress'

run Emberpress.new

Pusher.key = Emberpress[:pusher][:key]
Pusher.app_id = Emberpress[:pusher][:app_id]
Pusher.secret = Emberpress[:pusher][:secret]
