# The modding API

## Getting started

A mod is contained in a single directory under `server/mods/`, which makes it easy to manage (for example as a git repository).

If you want your server to run a mod called "MyMod" for example, you must create a directory `MyMod`. Then in `build_config.json`, you must set the value `mod` to `"MyMod"` (the default mod is `"capture"`).
Your mod must contain the files `enemy.js`, `engine.js`, `knife.js`, `lmg.js`, `on_message.js`, `planet.js`, `player.js`, `rapid_fire_weapon.js`, `shotgun.js`, `shot.js`, `smg.js` and `weapon.js`.
Your files must export at least the same things as the default mod *capture*, and your own version of classes must have the same signatures and return types as *capture*'s.

It is advised you copy the example mod *example*, then modify it to make it into whatever you want it to be!
To do so, you can have a look at how the default mod *capture* is made.

Note that when you modify something, it only applies to the server. We will never serve client code from your mod for obvious **security reasons**.


## Requests

Feedback from modders is appreciated.
Besides, this API is yet quite new, might lacks features, etc. If you think it could be improved, you are welcome to open an [issue](https://github.com/KordonBleu/jumpsuit/issues) or a [pull request](https://github.com/KordonBleu/jumpsuit/pulls).
