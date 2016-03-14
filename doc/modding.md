# Modding

## Getting started

A mod is contained in a single directory under static/mods, that way it is easy to manage it (for example as a git repository).

If you want your server to run a mod called "MyMod" for example, you must create a directory `MyMod`. Then in `config.json`, you must set the value `mod` to `"MyMod"` (the default mod is "capture").
Your directory must contain a file `engine.js`, or a file `on_message.js`, or both. These files contain function and object constructors, which if set, override the default ones (defined for the default mod capture). Which functions and constructors is explained below.

A mod may replace functions defined in `engine.js`, but the client uses the default version of `engine.js` for prediction. This can lead to predictions wrongly assumed on the client, which is visible on-screen. (note: it actually doesn't use it yet)

## `engine.js`

## `on_message.js`
