## Emberpress pusher
Here in lies a fork of eviltrout's emberpress, whose original manuscripts
have been archived [here](https://github.com/eviltrout/emberpress). The main goal
of this fork is to provide a non-trivial pusher integration. This integration
was demoed April 4th, 2013 at [Ember Toronto Meetup](http://torontoemberjs.com/).

## About
This is a realtime multiplayer version of Emberpress. There is a blue team and a
red team and anyone on the team whose turn it is can play. This makes it very
chaotic (and hilarious).  
  
There is no game state saved. All players must be in the room when the game starts or
they *will* get out of sync. I didn't feel like spending much time on that part of
the application because this was more meant as a pusher ember demo.  
  
The application uses a pusher [presence channel](http://pusher.com/docs/client_api_guide/client_presence_channels)
and [client events](http://pusher.com/docs/client_api_guide/client_events#trigger-events). Most
importantly, it uses my ember-pusher libraries for the integration.

## Running it
1.  Create an app on [pusher.com](http://pusher.com)  
2.  Make sure you've enabled client events in your app on pusher.com!
3.  Create a `config.yml` in the form of `config.yml.tmpl`  
4.  `bundle`  
5.  `bundle exec rackup -s puma`  


