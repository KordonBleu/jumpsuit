# JumpSuit
A sweet 2D canvas game.
With your awesome suit, you can jump from planet to planet to the exit!

Try it [here](http://getkey.eu:8000/)!

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
Another suggestion was "DontLookAtIt" - DLAI (pronounced Delay), but we thought this might be not the proper name to publish it.

## How to run
```sh
$ npm install
$ git submodules init
$ git submodules update
$ node server.js
```
Now you can access it at `http://localhost:8080` in your browser.

### Configuration
The server needs a configuration file. The default file is `config.json`, but it is also possible to choose which to use:
```sh
$ node server.js path/to/your/config.json
```
In any case, if it doesn't exists, it will be created.
You can modify settings without having to restart the server.

In this file you can set the following parameters:

Parameter | Explanation | Default | Value
--------- | ----------- | ------- | -----
dev | Enable debug messages and the automatic reload of modified files (under `static/`). You'll have to restart the server if you create a new file | false | boolean
interactive | Make it possible to enter Javascript commands while the server runs | false | boolean
monitor | Displays a neat view of the lobbys in real-time | false | boolean
port | Set the server's port | 8080 | integer
