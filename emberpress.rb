require './emberpress/web'
require './emberpress/game'

module Emberpress

  def self.[](value)
    begin
      @config ||= YAML.load_file('./config.yml')
    rescue
      raise "You probably want to create a config.yml based on config.yml.tmpl"
    end
    @config[value]
  end

end
