import ipaddr from 'ipaddr.js';
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
		'jetpack',
		'moveLeft',
		'moveRight',
		'changeWeapon',
		'shoot'
	),
	lobbyStateMap = new bimap.EnumMap(
		'warmup',
		'playing',
		'displaying_scores'
	);

/* Subpayloads */
export class PartialServer {
	static serialize(buffer, offset, secure, port, serverNameBuf, modNameBuf) {
		let view = new Uint8Array(buffer, offset),
			dView = new DataView(buffer, offset);

		view[0] = secure ? 1 : 0;

		dView.setUint16(1, port);

		view[3] = serverNameBuf.byteLength;
		view.set(new Uint8Array(serverNameBuf), 4);

		offset = 4 + serverNameBuf.byteLength;
		view[offset] = modNameBuf.byteLength;
		view.set(new Uint8Array(modNameBuf), offset + 1);
	}
	static deserialize(buffer, offset) {
		let view = new Uint8Array(buffer, offset),
			dView = new DataView(buffer, offset),
			secure = view[0] === 1 ? true : false,
			port = dView.getUint16(1),
			serverName = convert.bufferToString(buffer.slice(offset += 4, offset += view[3])),
			modNameLgt = view[offset - view.byteOffset],
			modName = convert.bufferToString(buffer.slice(++offset, offset + modNameLgt));

		return {
			data: {
				secure,
				port,
				serverName,
				modName
			},
			byteLength: 5 + view[3] + modNameLgt
		};
	}
}

export class Server {
	static serialize(buffer, offset, secure, port, serverNameBuf, modNameBuf, ipv6) {
		let view = new Uint8Array(buffer, offset);
		view.set(ipv6.toByteArray(), 0);
		PartialServer.serialize(buffer, offset + 16, secure, port, serverNameBuf, modNameBuf);
	}
	static deserialize(buffer, offset) {
		let retVal = PartialServer.deserialize(buffer, offset + 16);
		retVal.data.ipv6 = ipaddr.fromByteArray(new Uint8Array(buffer.slice(offset, offset + 16)));
		retVal.byteLength += 16;

		return retVal;
	}
}

export class PlanetMut {
	static serialize(buffer, offset, planet) {
		let view = new Uint8Array(buffer, offset);
		view[0] = teamMap.getNbr(planet.progress.team);
		view[1] = planet.progress.value;

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

class RegisterServer extends Serializator {
	_serialize(secure, port, serverName, modName) {
		let serverNameBuf = convert.stringToBuffer(serverName),
			modNameBuf = convert.stringToBuffer(modName),
			buffer = new ArrayBuffer(6 + serverNameBuf.byteLength + modNameBuf.byteLength);

		PartialServer.serialize(buffer, 1, secure, port, serverNameBuf, modNameBuf);

		return buffer;
	}
	deserialize(buffer) {
		return PartialServer.deserialize(buffer, 1).data;
	}
}

class AddServers extends Serializator {
	_serialize(serverList, ipList) {
		let serverNameBufs = [],
			modNameBufs = [],
			bufsLength = 0;

		for (let server of serverList) {
			let serverNameBuf = convert.stringToBuffer(server.serverName),
				modNameBuf = convert.stringToBuffer(server.modName);

			serverNameBufs.push(serverNameBuf);
			modNameBufs.push(modNameBuf);

			bufsLength += serverNameBuf.byteLength + modNameBuf.byteLength;
		}

		let buffer = new ArrayBuffer(1 + serverList.length*21 + bufsLength);

		let offset = 1,
			i = 0;
		for (let server of serverList) {
			Server.serialize(buffer, offset, server.secure, server.port, serverNameBufs[i], modNameBufs[i], ipList[i]);
			offset += serverNameBufs[i].byteLength + modNameBufs[i].byteLength + 21;
			++i;
		}

		return buffer;
	}
	deserialize(buffer) {
		let view = new DataView(buffer),
			offset = 1,
			serverList = [];

		while (offset !== buffer.byteLength) {
			let serverParams = Server.deserialize(buffer, offset);
			serverList.push(serverParams.data);
			offset += serverParams.byteLength;
		}

		return serverList;
	}
}

class RemoveServers extends Serializator {
	_serialize(serverIds) {
		let buffer = new ArrayBuffer(1 + 2*serverIds.length),
			view = new DataView(buffer);

		serverIds.forEach((id, i) => {
			view.setUint16(1 + i*2, id);
		});

		return buffer;
	}
	deserialize(buffer) {
		let view = new DataView(buffer),
			serverIds = [];

		for (let offset = 1; offset !== buffer.byteLength; offset += 2) {
			serverIds.push(view.getUint16(offset));
		}

		return serverIds;
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

class ConnectAccepted extends Serializator {
	_serialize(lobbyId, playerId, univWidth, univHeight) {
		let buffer = new ArrayBuffer(11),
			view = new DataView(buffer);
		view.setUint32(1, lobbyId);
		view.setUint8(5, playerId);
		view.setUint16(6, univWidth);
		view.setUint16(8, univHeight);

		return buffer;
	}
	deserialize(buffer) {
		let view = new DataView(buffer);
		return {
			lobbyId: view.getUint32(1),
			playerId: view.getUint8(5),
			univWidth: view.getUint16(6),
			univHeight: view.getUint16(8)
		};
	}
}

class LobbyState extends Serializator {
	_serialize(state, teams) {
		let view = new Uint8Array(3),
			enabledTeams = 0;
		view[1] = lobbyStateMap.getNbr(state);
		if (teams !== undefined) {
			teams.forEach(team => {
				enabledTeams |= teamMaskMap.getNbr(team);
			}, this);
			view[2] = enabledTeams;
		}
		return view.buffer;
	}
	deserialize(buffer) {
		let view = new Uint8Array(buffer),
			enabledTeams = [];
		for (let {str, nbr} of teamMaskMap) {
			if (view[2] & nbr) enabledTeams.push(str);
		}

		return {
			state: lobbyStateMap.getStr(view[1]), // you _serialize a number... and you get back a string TODO: fix this
			enabledTeams: enabledTeams
		};
	}
}
class AddEntity extends Serializator {
	_serialize(planets, enemies, shots, players) {
		let totalNameSize = 0,
			playerNameBufs = [];
		if (players !== undefined) {
			players.forEach((player, i) => {
				playerNameBufs.push(convert.stringToBuffer(player.name));
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
	deserialize(buffer, enabledTeams) {
		let view = new DataView(buffer, 1),
			val = {};
		enabledTeams.sort().forEach(function(team, i) {
			val[team] = view.getInt32(i*4);
		});

		return val;
	}
}

class ServerRegistered extends Serializator {
	_serialize() {
		return new ArrayBuffer(1);
	}
	//no deserialize needed
}

export let registerServer = new RegisterServer(0),
	addServers = new AddServers(1),
	removeServers = new RemoveServers(2),
	setPreferences = new SetPreferences(3),
	setNameBroadcast = new SetNameBroadcast(4),
	connect = new Connect(5),
	error = new ErrorMsg(6),
	connectAccepted = new ConnectAccepted(7),
	lobbyState = new LobbyState(8),
	addEntity = new AddEntity(9),
	removeEntity = new RemoveEntity(10),
	gameState = new GameState(11),
	playerControls = new PlayerControls(12),
	aimAngle = new AimAngle(13),
	chat = new Chat(14),
	chatBroadcast = new ChatBroadcast(15),
	scores = new Scores(16),
	serverRegistered = new ServerRegistered(17);

export function getSerializator(buffer) {
	let enumVal = new Uint8Array(buffer)[0];

	return serializators[enumVal];
}
