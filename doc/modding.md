# The modding API

## Getting started

A mod is contained in a single directory under static/mods, that way it is easy to manage it (for example as a git repository).

If you want your server to run a mod called "MyMod" for example, you must create a directory `MyMod`. Then in `config.json`, you must set the value `mod` to `"MyMod"` (the default mod is "capture").
Your directory must contain a file `engine.js`, or a file `on_message.js`, or both. These files contain function and object constructors, which if set, override the default ones (defined for the default mod capture). Which functions and constructors, along with the structure your mod must follow is explained below.
It is advised you take a look at the default mod (in addition to reading this) to understand better how modding is done.

A mod may replace functions defined in `engine.js`, but the client uses the default version of `engine.js` for prediction. This can lead to predictions wrongly assumed on the client, which is visible on-screen. (note: it actually doesn't use it yet)

All functions *may* return an object containing the removed entities. This object looks like this:

```JavaScript
{
	addedEnemies: [/* enemy ids */],
	removedEnemies: [/* instances of Enemy */],

	addedPlanet: [/* planet ids */],
	removedPlanet: [/* instances of Planet */],

	addedPlayer: [/* player ids */],
	removedPlayer: [/* instances of Player */],

	addedShots: [/* shot ids */],
	removedShots: [/* instances of Shot */]
}
```

All the properties this object holds are **optional**.


## `engine.js`

You can implement the following functions and constructors:

* Enemy
* Planet
* Player
* Shot
* doPhysics

Then export them as you would do in any node.js module.
When a function or constructor is uniplemented, the default one, as defined in `mods/capture/engine.js` is used.

## `on_message.js`

This file must export a function, which can optionally accept a parameter `engine`. `engine` is the engine your mod uses.
The function must return an object with the functions you choose to implement.
Like modded engines, when a function is uniplemented, the default one is used.

The first parameter of every function defined by `on_message.js` is the player from which the message comes. Often, you will want to acces the lobby this player is in. This can be done by accesing `player.lobby`.

You can implement the following functions and constructors:

* onActionOne(player, angle)
* onActionTwo(player, angle)
* onControls(player, controlsObj)
