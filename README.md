# Emberpress pusher

Here in lies a fork of eviltrout's emberpress, whose original manuscripts
have been archived [here](https://github.com/eviltrout/emberpress). The main goal
of this fork is to provide a non-trivial pusher integration. This integration
was demoed April 4th, 2013 at [Ember Toronto Meetup](http://torontoemberjs.com/).

## Running it

Your pusher settings are needed, after all, so go ahead and create an app on
[pusher.com](http://pusher.com). Create a `config.yml` in the form 
of `config.yml.tmpl`, then `bundle` and finish up with:

`bundle exec rackup -s puma`  
  
