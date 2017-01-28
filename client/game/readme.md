This directory contains files that cannot be fit into the MVC, or files that would slow down a refactor process if they were to be integrated.

The problem with these file is that they fall both into the model (positional data for example) and into the view (draw() method), but because of inheritance it is impossible to split them. Using the [ECS pattern](https://en.wikipedia.org/wiki/Entity%E2%80%93component%E2%80%93system) and thus composition would fix this.
