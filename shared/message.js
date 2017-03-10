import * as bimap from './bimap.js';
import * as convert from './convert.js';

const weaponMap = new bimap.EnumMap(
		'Lmg',
		'Smg',
		'Shotgun',
		'Knife'
	),
	enemyAppearanceMap = new bimap.EnumMap(
		'enemyBlack1',
		'enemyBlack2',
		'enemyBlack3',
		'enemyBlack4',
		'enemyBlack5',
		'enemyBlue1',
		'enemyBlue2',
		'enemyBlue3',
		'enemyBlue4',
		'enemyBlue5',
		'enemyGreen1',
		'enemyGreen2',
		'enemyGreen3',
		'enemyGreen4',
		'enemyGreen5',
		'enemyRed1',
		'enemyRed2',
		'enemyRed3',
		'enemyRed4',
		'enemyRed5'
	),
	teamMap = new bimap.EnumMap(
		'alienBeige',
		'alienBlue',
		'alienGreen',
		'alienPink',
		'alienYellow',
		'neutral' // sometimes not used, doesn't matter since it has the highest value
	),
	teamMaskMap = new bimap.BitmaskMap(
		'alienBeige',
		'alienBlue',
		'alienGreen',
		'alienPink',
		'alienYellow'
	),
	walkFrameMap = new bimap.EnumMap(
		'duck',
		'hurt',
		'jump',
		'stand',
		'walk1',
		'walk2'
	),
	controlsMap = new bimap.BitmaskMap(
		'jump',
		'run',
		'crouch',
		'moveLeft',
		'moveRight',
		'changeWeapon',
		'shoot'
	);

/* Subpayloads */
export class PlanetMut {
	static serialize(buffer, offset, planet) {
		let view = new Uint8Array(buffer, offset);
		view[0] = teamMap.getNbr(planet.team);
		view[1] = planet.progress;

		return 2;
	}
	static deserialize(buffer, offset, id, planetsCbk) {
		let view = new Uint8Array(buffer, offset);

		planetsCbk(
			id,
			teamMap.getStr(view[0]), // ownedBy
			view[1] // progress
		);

		return 2;
	}
}
export class PlanetConst {
	static serialize(buffer, offset, planet) {
		let dView = new DataView(buffer, offset);

		dView.setUint16(0, planet.box.center.x);
		dView.setUint16(2, planet.box.center.y);
		dView.setUint16(4, planet.box.radius);
		dView.setUint8(6, planet.type);

		return 7;
	}
	static deserialize(buffer, offset, planetsCbk) {
		let dView = new DataView(buffer, offset);

		planetsCbk(
			dView.getUint16(0), // x
			dView.getUint16(2), // y
			dView.getUint16(4), // radius
			dView.getUint8(6) // type
		);

		return 7;
	}
}

export class Shot {
	static serialize(buffer, offset, shot) {
		let dView = new DataView(buffer, offset);

		dView.setUint16(0, shot.box.center.x);
		dView.setUint16(2, shot.box.center.y);
		dView.setUint8(4, convert.radToBrad(shot.box.angle, 1));
		dView.setUint8(5, shot.origin);
		dView.setUint8(6, shot.type);

		return 7;
	}
	static deserialize(buffer, offset, shotsCbk) {
		let dView = new DataView(buffer, offset);

		shotsCbk(
			dView.getUint16(0), // x
			dView.getUint16(2), // y
			convert.bradToRad(dView.getUint8(4), 1), // angle
			dView.getUint8(5), // origin
			dView.getUint8(6) // type
		);

		return 7;
	}
}

export class EnemyConst {
	static serialize(buffer, offset, enemy) {
		let dView = new DataView(buffer, offset);

		dView.setUint16(0, enemy.box.center.x);
		dView.setUint16(2, enemy.box.center.y);
		dView.setUint8(4, enemyAppearanceMap.getNbr(enemy.appearance));

		return 5;
	}
	static deserialize(buffer, offset, enemiesCbk) {
		let dView = new DataView(buffer, offset);

		enemiesCbk(
			dView.getUint16(0), // x
			dView.getUint16(2), // y
			enemyAppearanceMap.getStr(dView.getUint8(4)) // appearance
		);

		return 5;
	}
}

export class EnemyMut {
	static serialize(buffer, offset, enemy) {
		let view = new Uint8Array(buffer, offset);

		view[0] = convert.radToBrad(enemy.box.angle, 1);

		return 1;
	}
	static deserialize(buffer, offset, id, enemiesCbk) {
		let view = new Uint8Array(buffer, offset);

		enemiesCbk(
			id,
			convert.bradToRad(view[0], 1) // angle
		);

		return 1;
	}
}

export class PlayerConst {
	static serialize(buffer, offset, player, playerNameBuf) {
		let view = new Uint8Array(buffer, offset);

		view[0] = player.pid;
		view[1] = teamMap.getNbr(player.appearance);
		view[2] = player.homographId;
		view[3] = playerNameBuf.byteLength;
		view.set(new Uint8Array(playerNameBuf), 4);

		return 4 + playerNameBuf.byteLength;
	}
	static deserialize(buffer, offset, playersCbk) {
		let view = new Uint8Array(buffer, offset);

		playersCbk(
			view[0], // pid
			teamMap.getStr(view[1]), // appearance
			view[2], // homographId
			convert.bufferToString(buffer.slice(offset + 4, offset + 4 + view[3])) // name
		);

		return 4 + view[3];
	}
}
PlayerConst.MASK = {
	LOOKS_LEFT: 128,
	JETPACK: 64
};

export class PlayerMut {
	static serialize(buffer, offset, player) {
		let dView = new DataView(buffer, offset);

		dView.setUint8(0, player.pid);
		dView.setUint16(1, player.box.center.x);
		dView.setUint16(3, player.box.center.y);
		dView.setUint8(5, player.attachedPlanet);
		dView.setUint8(6, convert.radToBrad(player.box.angle, 1));
		dView.setUint8(7, convert.radToBrad(player.aimAngle, 1));

		let enumByte = walkFrameMap.getNbr(player.walkFrame) << 2; // do not work directly on buffer for efficiency
		if (player.jetpack) enumByte |= this.MASK.JETPACK;
		if (player.looksLeft) enumByte |= this.MASK.LOOKS_LEFT;
		if (player.hurt) enumByte |= this.MASK.HURT;
		dView.setUint8(8, enumByte);

		let weaponByte = weaponMap.getNbr(player.armedWeapon.type) << 2;
		weaponByte += weaponMap.getNbr(player.carriedWeapon.type);
		dView.setUint8(9, weaponByte);

		return 10;
	}
	static deserialize(buffer, offset, playersCbk) {
		let dView = new DataView(buffer, offset),
			enumByte = dView.getUint8(8),
			weaponByte = dView.getUint8(9);

		playersCbk(dView.getUint8(0), // pid
			dView.getUint16(1), // x
			dView.getUint16(3), // y
			dView.getUint8(5), // attachedPlanet
			convert.bradToRad(dView.getUint8(6), 1), // angle

			enumByte & this.MASK.LOOKS_LEFT ? true : false, // looksLeft
			enumByte & this.MASK.JETPACK ? true : false, // jetpack
			enumByte & this.MASK.HURT ? true : false, // hurt
			walkFrameMap.getStr(enumByte << 27 >>> 29), // walkFrame

			weaponMap.getStr(weaponByte >>> 2), // armed weapon
			weaponMap.getStr(weaponByte << 30 >>> 30), // carried weapon

			convert.bradToRad(dView.getUint8(7), 1) // aimAngle
		);

		return 10;
	}
}
PlayerMut.MASK = {
	LOOKS_LEFT: 128,
	JETPACK: 64,
	HURT: 32
};

export class EnabledTeams {
	static serialize(buffer, offset, scoresObj) {
		let teamByte = 0;

		for (let team of Object.keys(scoresObj).sort()) {
			teamByte |= teamMaskMap.getNbr(team);
		}

		let view = new Uint8Array(buffer, offset);
		view[0] = teamByte;

		return 1;
	}
	static deserialize(buffer, offset) {
		let teamByte = new Uint8Array(buffer, offset)[0],
			scoresObj = {};

		for (let {str: team, nbr: mask} of teamMaskMap) {
			if (teamByte & mask) {
				scoresObj[team] = null;
			}
		}
		return {
			data: scoresObj,
			byteLength: 1
		};
	}
}

export class BootstrapUniverse {
	static serialize(buffer, offset, lobbyId, playerId, univWidth, univHeight, addEntityBuf) {
		let dView = new DataView(buffer, offset),
			view = new Uint8Array(buffer, offset);

		dView.setUint32(0, lobbyId);
		view[4] = playerId;
		dView.setUint16(5, univWidth);
		dView.setUint16(7, univHeight);
		view.set(new Uint8Array(addEntityBuf.slice(1)), 9);
	}
	static deserialize(buffer, offset, constructPlanetsCbk, planetsCbk, constructEnemiesCbk, enemiesCbk, shotsCbk, constructPlayersCbk, playersCbk) {
		let dView = new DataView(buffer, offset);

		return {
			data: {
				lobbyId: dView.getUint32(0),
				playerId: dView.getUint8(4),
				univWidth: dView.getUint16(5),
				univHeight: dView.getUint16(7)
			},
			byteLength: 9 + addEntity.deserialize(buffer.slice(offset + 8), constructPlanetsCbk, planetsCbk, constructEnemiesCbk, enemiesCbk, shotsCbk, constructPlayersCbk, playersCbk)
		};
	}
}


/* Serializators */

let serializators = [];
class Serializator {
	constructor(enumVal) {
		this.enumVal = enumVal;
		serializators[enumVal] = this;
	}
	serialize(...args) {
		let buf = this._serialize.apply(this, args);
		new Uint8Array(buf)[0] = this.enumVal;
		return buf;
	}
	toString() {
		return this.constructor.name;
	}
}

class SetPreferences extends Serializator {
	_serialize(settings) {
		let nameBuffer = convert.stringToBuffer(settings.name),
			view = new Uint8Array(3 + nameBuffer.byteLength);
		view[1] = weaponMap.getNbr(settings.primary);
		view[2] =  weaponMap.getNbr(settings.secondary);
		view.set(new Uint8Array(nameBuffer), 3);
		return view.buffer;
	}
	deserialize(buffer) {
		let view = new Uint8Array(buffer);
		return {
			primary: weaponMap.getStr(view[1]),
			secondary: weaponMap.getStr(view[2]),
			name: convert.bufferToString(buffer.slice(3))
		};
	}
}

class SetNameBroadcast extends Serializator {
	_serialize(id, name, homographId) {
		let nameBuffer = convert.stringToBuffer(name),
			view = new Uint8Array(3 + nameBuffer.byteLength);

		view[1] = id;
		view[2] = homographId;
		view.set(new Uint8Array(nameBuffer), 3);

		return view.buffer;
	}
	deserialize(buffer) {
		let view = new Uint8Array(buffer);
		return {
			id: view[1],
			name: convert.bufferToString(buffer.slice(3)),
			homographId: view[2]
		};
	}
}

class Connect extends Serializator {
	_serialize(lobbyId, settings) {
		let nameBuffer = convert.stringToBuffer(settings.name),
			buffer = new Uint8Array(8 + nameBuffer.byteLength),
			view = new DataView(buffer.buffer);
		view.setUint8(1, lobbyId !== undefined);
		view.setUint32(2, lobbyId || 0);
		view.setUint8(6, weaponMap.getNbr(settings.primary));
		view.setUint8(7, weaponMap.getNbr(settings.secondary));
		buffer.set(new Uint8Array(nameBuffer), 8);
		return buffer.buffer;
	}
	deserialize(buffer) {
		let view = new DataView(buffer);
		return {
			lobbyId: (view.getUint8(1) === 1 ? view.getUint32(2) : undefined),
			primary: weaponMap.getStr(view.getUint8(6)),
			secondary: weaponMap.getStr(view.getUint8(7)),
			name: convert.bufferToString(buffer.slice(8))
		};
	}
}

class ErrorMsg extends Serializator {
	_serialize(errorCode) {
		let view = new Uint8Array(2);
		view[1] = errorCode;

		return view.buffer;
	}
	deserialize(buffer) {
		return new Uint8Array(buffer)[1];
	}
}
ErrorMsg.prototype.NO_LOBBY = 0;
ErrorMsg.prototype.NO_SLOT = 1;

class AddEntity extends Serializator {
	_serialize(planets, enemies, shots, players) {
		let totalNameSize = 0,
			playerNameBufs = [];
		if (players !== undefined) {
			players.forEach((player, i) => {
				playerNameBufs[i] = convert.stringToBuffer(player.name);
				totalNameSize += playerNameBufs[i].byteLength;
			});
		}
		let buffer = new ArrayBuffer(4 + (planets !== undefined ? planets.length*9 : 0) + (enemies !== undefined ? enemies.length*6 : 0) + (shots !== undefined ? shots.length*7 : 0) + (players !== undefined ? players.actualLength()*14 + totalNameSize : 0)),
			view = new DataView(buffer);

		let offset = 2;
		if (planets !== undefined) {
			view.setUint8(1, planets.length);
			for (let planet of planets) {
				offset += PlanetConst.serialize(buffer, offset, planet);
				offset += PlanetMut.serialize(buffer, offset, planet);
			}
		} else {
			view.setUint8(1, 0);
		}

		if (enemies !== undefined) {
			view.setUint8(offset++, enemies.length);
			for (let enemy of enemies) {
				offset += EnemyConst.serialize(buffer, offset, enemy);
				offset += EnemyMut.serialize(buffer, offset, enemy);
			}
		} else {
			view.setUint8(offset++, 0);
		}

		if (shots !== undefined) {
			view.setUint8(offset++, shots.length);
			shots.forEach(shot => {
				offset += Shot.serialize(buffer, offset, shot);
			});
		} else {
			view.setUint8(offset++, 0);
		}

		if (players !== undefined) {
			players.forEach(function(player, i) {
				offset += PlayerConst.serialize(buffer, offset, player, playerNameBufs[i]);
				offset += PlayerMut.serialize(buffer, offset, player);
			});
		}

		return buffer;
	}
	deserialize(buffer, constructPlanetsCbk, planetsCbk, constructEnemiesCbk, enemiesCbk, shotsCbk, constructPlayersCbk, playersCbk) {
		let view = new DataView(buffer),
			offset = 2;

		for (let id = 0; offset !== 9*view.getUint8(1) + 2; ++id) {
			offset += PlanetConst.deserialize(buffer, offset, constructPlanetsCbk);
			offset += PlanetMut.deserialize(buffer, offset, id, planetsCbk);
		}

		let lim = 6*view.getUint8(offset) + ++offset;
		for (let id = 0; offset !== lim; ++id) {
			offset += EnemyConst.deserialize(buffer, offset, constructEnemiesCbk);
			offset += EnemyMut.deserialize(buffer, offset, id, enemiesCbk);
		}

		lim = 7*view.getUint8(offset) + ++offset;
		while (offset !== lim) offset += Shot.deserialize(buffer, offset, shotsCbk);

		while (offset !== buffer.byteLength) {
			offset += PlayerConst.deserialize(buffer, offset, constructPlayersCbk);
			offset += PlayerMut.deserialize(buffer, offset, playersCbk);
		}

		return offset;
	}
}

class RemoveEntity extends Serializator {
	_serialize(planetIds, enemyIds, shotIds, playerIds) {
		let view = new Uint8Array(4 + planetIds.length + enemyIds.length + shotIds.length + playerIds.length);


		if (planetIds !== undefined) {
			view[1] = planetIds.length;
			planetIds.forEach((id, i) => {
				view[2 + i] = id;
			});
		} else {
			view[1] = 0;
		}

		let offset = 2 + planetIds.length;
		if (enemyIds !== undefined) {
			view[offset++] = enemyIds.length;
			enemyIds.forEach((id, i) => {
				view[offset + i] = id;
			});
		} else {
			view[offset++] = 0;
		}

		offset += enemyIds.length;
		if (shotIds !== undefined) {
			view[offset++] = shotIds.length;
			shotIds.forEach((id, i) => {
				view[offset + i] = id;
			});
		} else {
			view[offset++] = 0;
		}

		playerIds.forEach((id, i) => {
			view[offset + i] = id;
		});

		return view.buffer;
	}
	deserialize(buffer, planetsCbk, enemiesCbk, shotsCbk, playersCbk) {
		let view = new Uint8Array(buffer);
		for (var i = 2; i !== view[1] + 2; ++i) {
			planetsCbk(view[i]);
		}
		let limit = view[i] + ++i;
		for (; i !== limit; ++i) {
			enemiesCbk(view[i]);
		}
		limit = view[i] + ++i;
		for (; i !== limit; ++i) {
			shotsCbk(view[i]);
		}
		for (; i !== buffer.byteLength; ++i) {
			playersCbk(view[i]);
		}
	}
}

class GameState extends Serializator {
	_serialize(yourHealth, yourFuel, planets, enemies, players) {
		let buffer = new ArrayBuffer(4 + planets.length*2 + enemies.length + players.actualLength()*10),
			view = new DataView(buffer);

		view.setUint8(1, yourHealth);
		view.setUint16(2, yourFuel);

		let offset = 4;
		for (let planet of planets) offset += PlanetMut.serialize(buffer, offset, planet);

		for (let enemy of enemies) offset += EnemyMut.serialize(buffer, offset, enemy);

		for (let player of players) {
			if (player === undefined) continue;
			offset += PlayerMut.serialize(buffer, offset, player);
		}

		return buffer;
	}
	deserialize(buffer, planetAmount, enemyAmount, planetsCbk, enemiesCbk, playersCbk) {
		let view = new DataView(buffer),
			offset = 4;

		for (let id = 0; offset !== 4 + planetAmount*2; ++id) offset += PlanetMut.deserialize(buffer, offset, id, planetsCbk);

		let limit = offset + enemyAmount;
		for (let id = 0; offset !== limit; ++id) offset += EnemyMut.deserialize(buffer, offset, id, enemiesCbk);

		while (offset !== view.byteLength) offset += PlayerMut.deserialize(buffer, offset, playersCbk);

		return {
			yourHealth: view.getUint8(1),
			yourFuel: view.getUint16(2)
		};
	}
}

class PlayerControls extends Serializator {
	_serialize(controls) {
		let view = new Uint8Array(2),
			enumByte = 0;

		for (let key in controls) {
			if (controls[key]) enumByte |= controlsMap.getNbr(key);
		}
		view[1] = enumByte;

		return view.buffer;
	}
	deserialize(buffer) {
		let enumByte = new Uint8Array(buffer)[1],
			controls = {};

		let rightShift = 0;
		for (let {str, nbr} of controlsMap) {
			controls[str] = (enumByte & nbr) >>> rightShift;
			++rightShift; // so that controls[`str`] is worth 1 if enabled, and no more
		}

		return controls;
	}
}

class AimAngle extends Serializator {
	_serialize(angle) {
		let view = new Uint8Array(2);
		view[1] = convert.radToBrad(angle, 1);
		return view.buffer;
	}
	deserialize(buffer) {
		let angle = new Uint8Array(buffer)[1];
		return convert.bradToRad(angle, 1);
	}
}

class Chat extends Serializator {
	_serialize(message) {
		let nameBuffer = convert.stringToBuffer(message),
			view = new Uint8Array(1 + nameBuffer.byteLength);
		view.set(new Uint8Array(nameBuffer), 1);
		return view.buffer;
	}
	deserialize(buffer) {
		return convert.bufferToString(buffer.slice(1));
	}
}

class ChatBroadcast extends Serializator {
	_serialize(id, message) {
		let bufMessage = convert.stringToBuffer(message),
			view = new Uint8Array(bufMessage.byteLength + 2);

		view[1] = id;
		view.set(new Uint8Array(bufMessage), 2);

		return view.buffer;
	}
	deserialize(buffer) {
		return {
			id: new Uint8Array(buffer)[1],
			message: convert.bufferToString(buffer.slice(2))
		};
	}
}

class Scores extends Serializator {
	_serialize(scoresObj) {
		let teams = Object.keys(scoresObj).sort(),
			buffer = new ArrayBuffer(1 + teams.length*4),
			view = new DataView(buffer);
		teams.forEach(function(team, i) {
			view.setInt32(1 + i*4, scoresObj[team]);
		});

		return buffer;
	}
	deserialize(buffer, scoresObj) {
		let view = new DataView(buffer, 1),
			val = {};
		Object.keys(scoresObj).sort().forEach(function(team, i) {
			val[team] = view.getInt32(i*4);
		});

		return val;
	}
}

class DisplayScores extends Serializator {
	_serialize(scoresObj) {
		let scoresBuf = scores._serialize(scoresObj).slice(1),
			buffer = new ArrayBuffer(scoresBuf.byteLength + 2),
			view = new Uint8Array(buffer);

		EnabledTeams.serialize(buffer, 1, scoresObj);
		view.set(new Uint8Array(scoresBuf), 2);

		return buffer;
	}
	deserialize(buffer) {
		let scoresObj = EnabledTeams.deserialize(buffer, 1).data;

		return scores.deserialize(buffer.slice(1), scoresObj);
	}
}

class Warmup extends Serializator {
	_serialize(scoresObj, lobbyId, playerId, univWidth, univHeight, planets, enemies, shots, players) {
		let addEntityBuf = addEntity._serialize(planets, enemies, shots, players).slice(1),
			buffer = new ArrayBuffer(addEntityBuf.byteLength + 11),
			view = new Uint8Array(buffer),
			dView = new DataView(buffer);
		EnabledTeams.serialize(buffer, 1, scoresObj);
		dView.setUint32(2, lobbyId);
		view[6] = playerId;
		dView.setUint16(7, univWidth);
		dView.setUint16(9, univHeight);

		view.set(new Uint8Array(addEntityBuf), 11);

		return buffer;
	}
	deserialize(buffer, constructPlanetsCbk, planetsCbk, constructEnemiesCbk, enemiesCbk, shotsCbk, constructPlayersCbk, playersCbk) {
		let dView = new DataView(buffer);

		addEntity.deserialize(buffer.slice(10), constructPlanetsCbk, planetsCbk, constructEnemiesCbk, enemiesCbk, shotsCbk, constructPlayersCbk, playersCbk);

		return {
			scoresObj: EnabledTeams.deserialize(buffer, 1).data,
			lobbyId: dView.getUint32(2),
			playerId: dView.getUint8(6),
			univWidth: dView.getUint16(7),
			univHeight: dView.getUint16(9)
		};
	}
}

export let setPreferences = new SetPreferences(0),
	setNameBroadcast = new SetNameBroadcast(1),
	connect = new Connect(2),
	error = new ErrorMsg(3),
	warmup = new Warmup(4),
	addEntity = new AddEntity(5),
	removeEntity = new RemoveEntity(6),
	gameState = new GameState(7),
	playerControls = new PlayerControls(8),
	aimAngle = new AimAngle(9),
	chat = new Chat(10),
	chatBroadcast = new ChatBroadcast(11),
	scores = new Scores(12),
	displayScores = new DisplayScores(14);

export function getSerializator(buffer) {
	let enumVal = new Uint8Array(buffer)[0];

	return serializators[enumVal];
}
