//import audio from './audio.js';
import { cltResPromise as resPromise } from './resource_loader.js';

import shotFactory from '../mods/capture/shot.js';
import weaponFactory from '../mods/capture/weapon.js';
import playerFactory from '../mods/capture/player.js';
import enemyFactory from '../mods/capture/enemy.js';
import engineFactory from '../mods/capture/engine.js';
import * as ui from './ui.js';
import drawFactory from './draw.js';

import Planet from '../mods/capture/planet.js';

resPromise.then((resources) => {
	const Shot = shotFactory(resources),
		weapon = weaponFactory(Shot),
		Player = playerFactory(resources, weapon).CltPlayer,
		Enemy = enemyFactory(resources),
		engine = engineFactory(resources, Player, Planet, Enemy, Shot),
		draw = drawFactory(resources, engine);
});
/*		<script src="https://jumpsuit.space/audio.js"></script>
		<script src="https://jumpsuit.space/resource_loader.js"></script>

		<script src="https://jumpsuit.space/shot.js"></script>
		<script src="https://jumpsuit.space/weapon.js"></script>
		<script src="https://jumpsuit.space/player.js"></script>
		<script src="https://jumpsuit.space/planet.js"></script>
		<script src="https://jumpsuit.space/enemy.js"></script>
		<script src="https://jumpsuit.space/engine.js"></script>

		<script src="https://jumpsuit.space/ui.js"></script>
		<script src="https://jumpsuit.space/draw.js"></script>
		<script src="https://jumpsuit.space/canvas.js"></script>
		<script src="https://jumpsuit.space/message.js"></script>
		<script src="https://jumpsuit.space/websocket_client.js"></script>
		<script src="https://jumpsuit.space/controls.js"></script>*/
