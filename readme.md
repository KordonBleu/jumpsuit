# JumpSuit

A sweet 2D canvas game.
With your awesome suit, you can jump from planet to planet to conquer them!

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

## Supported environnements

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
master | The master server your server registers to. If your host your own master server it should look like "ws://localhost:8080" | `"wss://jumpsuit.space"` | string
monitor | Displays a neat view of the lobbys in real-time | `false` | boolean
port | Set the game server's port | `7483` | integer
secure | Set this to true if your server is behind ssl. If you don't know, stick to the default value | `false` | boolean
server_name | The name the master associates your server with | `"JumpSuit server"` | string


### Master server configuration

The master server's configuration works the same way as the game server's, all parameters are saved in a file. Its default filename is `master_server.json`, but you can also choose another one:
```sh
$ node master_server.js path/to/your/config.json
```

In this file you can set the following parameters:

Parameter | Explanation | Default | Variable type
--------- | ----------- | ------- | -------------
dev | Enable debug messages. Enable automatic reload of modified files (if you add a new file, you'll have to restart the server). Get resources from local files instead of jumpsuit.space<sup>[1](#http2)</sup> | `true` | boolean
ipv4_provider | The URL of a web service which should return an IPv4 as plain text. You can also set your IP directly | `"https://ipv4.icanhazip.com/"` | string
ipv6_provider | The URL of a web service which should return an IPv6 as plain text. You can also set your IP directly | `"https://ipv6.icanhazip.com/"` | string
monitor | Displays a neat view of the connected game servers in real-time | `false` | boolean
port | Set the game server's port | `80` | integer


## Build configuration
Parameter | Explanation | Default | Variable type
--------- | ----------- | ------- | -------------
dev | Get resources from local files instead of jumpsuit.space<sup>[1](#http2)</sup>. Append a source map to the bundle | `true` | boolean
mod | Choose the server's gamemode | `"capture"` | string


## Footnotes

<a name="http2">1</a>: Since a lot of tiny assets must be served, (which is inefficent with HTTP/1.0 and HTTP/1.1), on [jumpsuit.space](http://jumpsuit.space/), http2 is used.
However, browsers do not accept HTTP/2 without SSL. We cannot make [jumpsuit.space](http://jumpsuit.space/) SSL-only, because it brings more latency (which is not okay for game websockets) and because that would mean third-party developpers wanting to register a game server on the master server at [jumpsuit.space](http://jumpsuit.space/) would have to get a SSL certificate. So; everything but game server sockets and the index.html is encrypted, and thus, we cannot use protocol relative URLs to access ressources.
The problem is that a developper on localhost would get assets and scripts from jumpsuit.space. To prevent this, the dev option rewrites files to replace URLs pointing to jumpsuit.space with protocol relative URLs.
