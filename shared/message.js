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

function serializePartialServer(buffer, offset, secure, serverPort, serverNameBuf, modNameBuf) {
	let view = new Uint8Array(buffer, offset),
		dView = new DataView(buffer, offset);

	view[0] = secure ? 1 : 0;

	dView.setUint16(1, serverPort);

	view[3] = serverNameBuf.byteLength;
	view.set(new Uint8Array(serverNameBuf), 4);

	offset = 4 + serverNameBuf.byteLength;
	view[offset] = modNameBuf.byteLength;
	view.set(new Uint8Array(modNameBuf), offset + 1);
}
function deserializePartialServer(buffer, offset) {
	let view = new Uint8Array(buffer, offset),
		dView = new DataView(buffer, offset),
		secure = view[0] === 1 ? true : false,
		serverPort = dView.getUint16(1),
		serverName = convert.bufferToString(buffer.slice(offset += 4, offset += view[3])),
		modName = convert.bufferToString(buffer.slice(offset + 1, offset + 1 + view[offset]));

	return {
		data: {
			secure,
			serverPort,
			serverName,
			modName
		},
		offset: view.byteOffset + 5 + serverName.byteLength + modName.byteLength
	};
}


function serializeServer(buffer, offset, secure, serverPort, serverNameBuf, modNameBuf, ipv6) {
	let view = new Uint8Array(buffer, offset);
	view.set(ipv6.toByteArray(), 0);
	serializePartialServer(buffer, offset + 16, secure, serverPort, serverNameBuf, modNameBuf);
}
/*function deserializeServer(buffer, offset) {
}*/



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
	_serialize(secure, serverPort, serverName, modName) {
		let serverNameBuf = convert.stringToBuffer(serverName),
			modNameBuf = convert.stringToBuffer(modName),
			buffer = new ArrayBuffer(6 + serverNameBuf.byteLength + modNameBuf.byteLength);

		serializePartialServer(buffer, 1, secure, serverPort, serverNameBuf, modNameBuf);

		return buffer;
	}
	deserialize(buffer) {
		return deserializePartialServer(buffer, 1).data;
	}
}

class AddServers extends Serializator {
	_serialize(serverList, ipList) {
		let serverNameBufs = [],
			modNameBufs = [],
			bufsLength = 0;

		for (let server of serverList) {
			let serverNameBuf = convert.stringToBuffer(server.name),
				modNameBuf = convert.stringToBuffer(server.mod);

			serverNameBufs.push(serverNameBuf);
			modNameBufs.push(modNameBuf);

			bufsLength += serverNameBuf.byteLength + modNameBuf.byteLength;
		}

		let buffer = new ArrayBuffer(1 + serverList.length*21 + bufsLength);

		let offset = 1,
			i = 0;
		for (let server of serverList) {
			serializeServer(buffer, offset, server.secure, server.port, serverNameBufs[i], modNameBufs[i], ipList[i]);
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
			let ipv6 = ipaddr.fromByteArray(new Uint8Array(buffer.slice(offset, offset += 16)));

			let secure = view.getUint8(offset++) !== 0;
			let port = view.getUint16(offset);
			offset += 2;

			let serverNameBuf = buffer.slice(offset + 1, offset + 1 + view.getUint8(offset));
			offset += serverNameBuf.byteLength + 1;

			let modNameBuf = buffer.slice(offset + 1, offset + 1 + view.getUint8(offset));
			offset += modNameBuf.byteLength + 1;

			serverList.push({
				name: convert.bufferToString(serverNameBuf),
				mod: convert.bufferToString(modNameBuf),
				secure,
				ipv6,
				port
			});
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
		let buffer = new ArrayBuffer(4 + (planets !== undefined ? planets.length*7 : 0) + (enemies !== undefined ? enemies.length*5 : 0) + (shots !== undefined ? shots.length*7 : 0) + (players !== undefined ? players.actualLength()*11 + totalNameSize : 0)),
			view = new DataView(buffer);

		let offset = 2;
		if (planets !== undefined) {
			view.setUint8(1, planets.length);
			for (let planet of planets) {
				view.setUint16(offset, planet.box.center.x);
				view.setUint16(2 + offset, planet.box.center.y);
				view.setUint16(4 + offset, planet.box.radius);
				view.setUint8(6 + offset, planet.type);
				offset += 7;
			}
		} else {
			view.setUint8(1, 0);
		}

		if (enemies !== undefined) {
			view.setUint8(offset++, enemies.length);
			for (let enemy of enemies) {
				view.setUint16(offset, enemy.box.center.x);
				view.setUint16(2 + offset, enemy.box.center.y);
				view.setUint8(4 + offset, enemyAppearanceMap.getNbr(enemy.appearance));
				offset += 5;
			}
		} else {
			view.setUint8(offset++, 0);
		}

		if (shots !== undefined) {
			view.setUint8(offset++, shots.length);
			shots.forEach(shot => {
				view.setUint16(offset, shot.box.center.x);
				view.setUint16(2 + offset, shot.box.center.y);
				view.setUint8(4 + offset, convert.radToBrad(shot.box.angle, 1));
				view.setUint8(5 + offset, shot.origin);
				view.setUint8(6 + offset, shot.type);
				offset += 7;
			});
		} else {
			view.setUint8(offset++, 0);
		}

		if (players !== undefined) {
			players.forEach(function(player, i) {
				view.setUint8(offset, player.pid);
				view.setUint16(1 + offset, player.box.center.x);
				view.setUint16(3 + offset, player.box.center.y);
				view.setUint8(5 + offset, player.attachedPlanet);
				view.setUint8(6 + offset, convert.radToBrad(player.box.angle, 1));
				let enumByte = walkFrameMap.getNbr(player.walkFrame);
				enumByte <<= 3;
				enumByte += teamMap.getNbr(player.appearance);
				if (player.jetpack) enumByte |= this.MASK.JETPACK;
				if (player.looksLeft) enumByte |= this.MASK.LOOKS_LEFT;
				view.setUint8(7 + offset, enumByte);
				let weaponByte = weaponMap.getNbr(player.armedWeapon.type);
				weaponByte <<= 2;
				weaponByte += weaponMap.getNbr(player.carriedWeapon.type);
				view.setUint8(8 + offset, weaponByte);
				view.setUint8(9 + offset, player.homographId);
				view.setUint8(10 + offset, playerNameBufs[i].byteLength);
				new Uint8Array(buffer).set(new Uint8Array(playerNameBufs[i]), 11 + offset);
				offset += 11 + playerNameBufs[i].byteLength;
			}, this);
		}

		return buffer;
	}
	deserialize(buffer, planetsCbk, enemiesCbk, shotsCbk, playersCbk) {
		let view = new DataView(buffer);

		for (var i = 2; i !== 7*view.getUint8(1) + 2; i += 7) {
			planetsCbk(
				view.getUint16(i),//x
				view.getUint16(i + 2),//y
				view.getUint16(i + 4),//radius
				view.getUint8(i + 6)//type
			);
		}

		let lim = 5*view.getUint8(i) + ++i;
		for (; i !== lim; i += 5) {
			enemiesCbk(
				view.getUint16(i),//x
				view.getUint16(i + 2),//y
				enemyAppearanceMap.getStr(view.getUint8(i + 4)) //appearance
			);
		}

		lim = 7*view.getUint8(i) + ++i;
		for (; i !== lim; i += 7) {
			shotsCbk(
				view.getUint16(i),//x
				view.getUint16(i + 2),//y
				convert.bradToRad(view.getUint8(i + 4), 1),//angle
				view.getUint8(i + 5),//origin
				view.getUint8(i + 6)//type
			);

		}
		while (i !== buffer.byteLength) {
			let nameLgt = view.getUint8(i + 10),
				enumByte = view.getUint8(i + 7),
				weaponByte = view.getUint8(i + 8);
			playersCbk(
				view.getUint8(i),//pid
				view.getUint16(i + 1),//x
				view.getUint16(i + 3),//y
				view.getUint8(i + 5),//attached planet
				convert.bradToRad(view.getUint8(i + 6), 1),//angle
				enumByte & this.MASK.LOOKS_LEFT ? true : false,//looksLeft
				enumByte & this.MASK.JETPACK ? true : false,//jetpack
				teamMap.getStr(enumByte << 29 >>> 29),//appearance
				walkFrameMap.getStr(enumByte << 26 >>> 29),//walk frame
				convert.bufferToString(buffer.slice(i + 11, i + 11 + nameLgt)),//name
				view.getUint8(i + 9),//homographId
				weaponMap.getStr(weaponByte << 28 >>> 30),//armedWeapon
				weaponMap.getStr(weaponByte << 30 >>> 30)//carriedWeapon
			);
			i += nameLgt + 11;
		}
	}
}
AddEntity.prototype.MASK = {
	LOOKS_LEFT: 128,
	JETPACK: 64
};

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
		for (let planet of planets) {
			view.setUint8(offset++, teamMap.getNbr(planet.progress.team));
			view.setUint8(offset++, planet.progress.value);
		}

		for (let enemy of enemies) {
			view.setUint8(offset++, convert.radToBrad(enemy.box.angle, 1));
		}

		for (let player of players) {
			if (player === undefined) continue;
			view.setUint8(offset, player.pid);
			view.setUint16(1 + offset, player.box.center.x);
			view.setUint16(3 + offset, player.box.center.y);
			view.setUint8(5 + offset, player.attachedPlanet);
			view.setUint8(6 + offset, convert.radToBrad(player.box.angle, 1));
			view.setUint8(7 + offset, convert.radToBrad(player.aimAngle, 1));
			let enumByte = walkFrameMap.getNbr(player.walkFrame) << 2; // do not work directly on buffer for efficiency
			if (player.jetpack) enumByte |= this.MASK.JETPACK;
			if (player.looksLeft) enumByte |= this.MASK.LOOKS_LEFT;
			if (player.hurt) enumByte |= this.MASK.HURT;
			view.setUint8(8 + offset, enumByte);
			let weaponByte = weaponMap.getNbr(player.armedWeapon.type) << 2;
			weaponByte += weaponMap.getNbr(player.carriedWeapon.type);
			view.setUint8(9 + offset, weaponByte);
			offset += 10;
		}

		return buffer;
	}
	deserialize(buffer, planetAmount, enemyAmount, planetsCbk, enemiesCbk, playersCbk) {
		let view = new DataView(buffer);
		let i = 4;
		for (let id = 0; i !== 4 + planetAmount*2; i += 2, ++id) {
			planetsCbk(
				id,
				teamMap.getStr(view.getUint8(i)),//ownedBy
				view.getUint8(i + 1)//progress
			);
		}

		let limit = i + enemyAmount;
		for (let id = 0; i !== limit; ++i, ++id) {
			enemiesCbk(id, convert.bradToRad(view.getUint8(i), 1));//angle
		}

		for (; i !== view.byteLength; i += 10) {
			let enumByte = view.getUint8(8 + i),
				weaponByte = view.getUint8(9 + i);
			playersCbk(view.getUint8(i), //pid
				view.getUint16(1 + i),//x
				view.getUint16(3 + i),//y
				view.getUint8(5 + i),//attachedPlanet
				convert.bradToRad(view.getUint8(6 + i), 1),//angle
				enumByte & this.MASK.LOOKS_LEFT ? true : false,//looksLeft
				enumByte & this.MASK.JETPACK ? true : false,//jetpack
				enumByte & this.MASK.HURT ? true : false,//hurt
				walkFrameMap.getStr(enumByte << 27 >>> 29),//walkFrame
				weaponMap.getStr(weaponByte >>> 2),//armed weapon
				weaponMap.getStr(weaponByte << 30 >>> 30),//carried weapon
				convert.bradToRad(view.getUint8(7 + i), 1)
			);
		}

		return {
			yourHealth: view.getUint8(1),
			yourFuel: view.getUint16(2)
		};
	}
}
GameState.prototype.MASK = {
	LOOKS_LEFT: 128,
	JETPACK: 64,
	HURT: 32
};

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
