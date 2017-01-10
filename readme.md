# JumpSuit

A sweet 2D canvas game.
With your awesome suit, jump from planet to planet to conquer them!

Try it [here](http://jumpsuit.space/)!

![screenshot](http://kordonbl.eu/images/jumpsuit.png)

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

## Supported environments

Currently, we only support Firefox and Chrome, because we use many recent additions to JavaScript.
The server requires Node.js 6.0.0 or above.

## Program architecture

JumpSuit works in a decentralised way: anyone can create a game server. After registering (automatically) to the master server, your game server will be listed on [jumpsuit.space](http://jumpsuit.space/) for players, who will be able to play directly on it. For **security reasons** however, the assets and scripts are **served by the master server**.

## How to build

```
$ npm install
$ node build/bundler.js
```

If you plan to host your own master server, **don't forget to set the `dev` option**.

## How to run
Once the project is built, if you want to create a public game server, here is what you need to do:
```sh
$ node game_server_bundle.js
```

But if you are developing or running a LAN, you need to **also** make your own master server. **Don't forget to set the `dev` option** (see below). Yes, that means you have to set it in two different config files.
```sh
$ node master_server.js
```
Then you can access your master server at [http://localhost](http://localhost) in your browser.

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
dev | Enable debug messages | `false` | boolean
master | The master server your server registers to. If your host your own master server it should look like `"ws://localhost:8080"` | `"wss://jumpsuit.space"` | string
monitor | Displays a neat view of the lobbies in real-time | `false` | boolean
server_name | The name the master associates your server with | `"JumpSuit server"` | string


### Master server configuration

The master server's configuration works the same way as the game server's, all parameters are saved in a file. Its default filename is `master_server.json`, but you can also choose another one:
```sh
$ node master_server.js path/to/your/config.json
```

In this file you can set the following parameters:

Parameter | Explanation | Default | Variable type
--------- | ----------- | ------- | -------------
dev | Enable debug messages. Enable automatic reload of modified files (if you add a new file, you'll have to restart the server) | `true` | boolean
monitor | Displays a neat view of the connected game servers in real-time | `false` | boolean
port | Set the game server's port | `80` | integer


## Build configuration
Parameter | Explanation | Default | Variable type
--------- | ----------- | ------- | -------------
dev | Append a source map to the bundle | `true` | boolean
mod | Choose the server's gamemode | `"capture"` | string
