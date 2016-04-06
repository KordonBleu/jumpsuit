# JumpSuit
A sweet 2D canvas game.
With your awesome suit, you can jump from planet to planet to conquer them!

Try it [here](http://jumpsuit.space/)!

## Why the name?
```
Getkey: What about "jumpsuit"
Flowi: #agreed
Getkey: The story would be
Getkey: I am the hero
Getkey: Oh, a chest
Getkey: What is that
Getkey: A suit
Getkey: TADADAM
* Getkey wears suit
Flowi: :O
* Getkey jumps
Flowi: :OOO
Getkey: #OMG
Flowi: #epic
```

## How to run

```sh
$ npm install
$ git submodule init
$ git submodule update
$ node game_server.js
```
Now you can access it at `http://localhost:8080` in your browser.

## Configuration

### Game server configuration

The game server needs a configuration file. The default file is `game_config.json`, but it is also possible to choose which to use:
```sh
$ node game_server.js path/to/your/config.json
```

In any case, if it doesn't exists, it will be created.
You can modify settings without having to restart the server.

In this file you can set the following parameters:

Parameter | Explanation | Default | Variable type
--------- | ----------- | ------- | -------------
dev | Disable the countdown before joining a lobby and enable debug messages. You'll have to restart the server if you create a new file | false | boolean
interactive | Make it possible to enter JavaScript commands while the server runs | false | boolean
master | The master server your server registers to. If your host your own master server it should look like "ws://localhost:8080" | "ws://jumpsuit.space" | string
mod | Choose the server's gamemode | "capture" | string
monitor | Displays a neat view of the lobbys in real-time | false | boolean
port | Set the game server's port | 7483 | integer
server_name | The name the master associates your server with | "JumpSuit server" | string


### Master server configuration

If you want to host a LAN or participate in JumpSuit's development, you will need to configure a master server.
The master serever's configuration works the same way as the game server's, all parameters are saved in a file. Its default filename is `master_server.json`, but you can also choose another one:
```sh
$ node game_server.js path/to/your/config.json
```

In this file you can set the following parameters:

Parameter | Explanation | Default | Variable type
--------- | ----------- | ------- | -------------
dev | Enable debug messages and the automatic reload of modified files (under `static/`) | false | boolean
interactive | Make it possible to enter JavaScript commands while the server runs | false | boolean
monitor | Displays a neat view of the connected game servers in real-time | false| boolean
port | Set the game server's port | 80 | integer
