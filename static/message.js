"use strict";

var isNode = typeof module !== "undefined" && typeof module.exports !== "undefined";

if (isNode) var ipaddr = require("ipaddr.js");

function stringToBuffer(string) {
	if (isNode) {
		let buf = new Buffer(string, "utf8");
		return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
	} else {
		let encoder = new TextEncoder("utf8");
		return encoder.encode(string);
	}
}
function bufferToString(arrayBuffer) {
	if (isNode) {
		let StringDecoder = require("string_decoder").StringDecoder,
			decoder = new StringDecoder("utf8"),
			tmpBuf = new Buffer(arrayBuffer);
		return decoder.write(tmpBuf);
	} else {
		let decoder = new TextDecoder("utf8");
		return decoder.decode(arrayBuffer);
	}
}

function radToBrad(rad, precision) {
	return Math.round(rad/(2*Math.PI) * ((1 << precision*8) - 1));
}
function bradToRad(brad, precision) {
	return brad/((1 << precision*8) - 1) * (2*Math.PI);
}

var pChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~!$&'()*+,;=:@";// https://tools.ietf.org/html/rfc3986#section-3.3
function encodeLobbyNumber(lobbyNb) {
	var upperDigit = Math.trunc(lobbyNb/pChars.length),
		lobbyCode = pChars.charAt(lobbyNb%pChars.length);

	if (upperDigit === 0) return lobbyCode;
	else return encodeLobbyNumber(upperDigit) + lobbyCode;
}
function decodeLobbyNumber(lobbyCode) {
	var lobbyNb = 0;

	for (let i = 0; i !== lobbyCode.length; ++i) lobbyNb += Math.pow(pChars.length, lobbyCode.length - i -1) * pChars.indexOf(lobbyCode.charAt(i));

	return lobbyNb;
}

/* Note: TypedArrays are faster than Dataviews. Therefore, when possible, they should be used.
   But beware of endianness! */
const MESSAGE = {
	REGISTER_SERVER: {
		value: 0,
		serialize: function(secure, serverPort, serverName, modName) {
			var serverNameBuf = stringToBuffer(serverName),
				modNameBuf = stringToBuffer(modName),
				buffer = new ArrayBuffer(6 + serverNameBuf.byteLength + modNameBuf.byteLength),
				view = new Uint8Array(buffer),
				dView = new DataView(buffer);

			view[0] = this.value;
			view[1] = secure ? 1 : 0;

			dView.setUint16(2, serverPort);

			view[4] = serverNameBuf.byteLength;
			view.set(new Uint8Array(serverNameBuf), 5);

			var offset = 5 + serverNameBuf.byteLength;
			view[offset++] = modNameBuf.byteLength;
			view.set(new Uint8Array(modNameBuf), offset);
			offset += modNameBuf.byteLength;

			return buffer;
		},
		deserialize: function(buffer) {
			var view = new DataView(buffer),
				offset = 5 + view.getUint8(4),
				serverName = bufferToString(buffer.slice(5, offset));

			return {
				secure: view.getUint8(1) === 1 ? true : false,
				serverPort: view.getUint16(2),
				serverName,
				modName: bufferToString(buffer.slice(offset + 1, offset + 1 + view.getUint8(offset)))
			};
		}
	},
	ADD_SERVERS: {
		value: 1,
		serialize: function(serverList, clientIp) {
			var partialServerBufs = [],
				partialServerBufsLength = 0;

			console.log(serverList);
			for (let server of serverList) {
				var partialServerBuf = MESSAGE.REGISTER_SERVER.serialize(server.secure, server.port, server.name, server.mod).slice(1);
				partialServerBufs.push(partialServerBuf);
				partialServerBufsLength += partialServerBuf.byteLength;
			}

			var buffer = new ArrayBuffer(1 + serverList.length*16 + partialServerBufsLength),
				view = new Uint8Array(buffer),
				offset = 1,
				promises = [];

			view[0] = this.value;

			partialServerBufs.forEach((partialServerBuf, i) => {
				var offseti = offset;//a copy of offset local to this scope
				//because by the moment the promise will be resolved, `offset` will be modified

				var currentPromise = serverList[i].effectiveIp(clientIp);
				currentPromise.then(function(ip) {
					view.set(ip.toByteArray(), offseti);
				});
				promises.push(currentPromise);

				offset += 16;
				view.set(new Uint8Array(partialServerBuf), offset);
				offset += partialServerBuf.byteLength;

			});

			return new Promise((resolve, reject) => {
				Promise.all(promises).then(function() {
					resolve(buffer);
				}).catch(function() {
					reject();
				});
			});
		},
		deserialize: function(buffer) {
			var view = new DataView(buffer),
				offset = 1,
				serverList = [];

			while (offset !== buffer.byteLength) {
				let ip = ipaddr.fromByteArray(new Uint8Array(buffer.slice(offset, offset += 16)));

				if (ip.isIPv4MappedAddress()) ip = ip.toIPv4Address().toString();
				else ip = "[" + ip.toString() + "]";

				let url = (view.getUint8(offset++) === 0 ? "ws://" : "wss://") + ip + ":" + view.getUint16(offset);
				offset += 2;

				let serverNameBuf = buffer.slice(offset + 1, offset + 1 + view.getUint8(offset));
				offset += serverNameBuf.byteLength + 1;

				let modNameBuf = buffer.slice(offset + 1, offset + 1 + view.getUint8(offset));
				offset += modNameBuf.byteLength + 1;

				serverList.push({
					name: bufferToString(serverNameBuf),
					mod: bufferToString(modNameBuf),
					url
				});
			}

			return serverList;
		}
	},
	REMOVE_SERVERS: {
		value: 2,
		serialize: function(serverIds) {
			var buffer = new ArrayBuffer(1 + 2*serverIds.length),
				view = new DataView(buffer);

			view.setUint8(0, this.value);
			serverIds.forEach((id, i) => {
				view.setUint16(1 + i*2, id);
			});

			return buffer;
		},
		deserialize: function(buffer) {
			var view = new DataView(buffer),
				serverIds = [];

			for (let offset = 1; offset !== buffer.byteLength; offset += 2) {
				serverIds.push(view.getUint16(offset));
			}

			return serverIds;
		}
	},
	SET_PREFERENCES: {
		value: 3,
		WEAPON: {
			lmg: 0,
			smg: 1,
			shotgun: 2,
			knife: 3
		},
		serialize: function(settings) {
			let nameBuffer = stringToBuffer(settings.name),
				view = new Uint8Array(3 + nameBuffer.byteLength);
			view[0] = this.value;
			view[1] = this.WEAPON[settings.primary];
			view[2] =  this.WEAPON[settings.secondary];
			view.set(new Uint8Array(nameBuffer), 3);
			return view.buffer;
		},
		deserialize: function(buffer) {
			var view = new Uint8Array(buffer);
			return {
				primary: view[1],
				secondary: view[2],
				name: bufferToString(buffer.slice(3))
			};
		}
	},
	SET_NAME_BROADCAST: {
		value: 4,
		serialize: function(id, name, homographId) {
			var nameBuffer = stringToBuffer(name),
				view = new Uint8Array(3 + nameBuffer.byteLength);

			view[0] = this.value;
			view[1] = id;
			view[2] = homographId;
			view.set(new Uint8Array(nameBuffer), 3);

			return view.buffer;
		},
		deserialize: function(buffer) {
			var view = new Uint8Array(buffer);
			return {
				id: view[1],
				name: bufferToString(buffer.slice(3)),
				homographId: view[2]
			};
		}
	},
	CONNECT: {
		value: 5,
		WEAPON: {
			lmg: 0,
			smg: 1,
			shotgun: 2,
			knife: 3
		},
		serialize: function(lobbyId, settings) {
			let nameBuffer = stringToBuffer(settings.name),
				buffer = new Uint8Array(8 + nameBuffer.byteLength),
				view = new DataView(buffer.buffer);
			view.setUint8(0, this.value);
			view.setUint8(1, lobbyId !== undefined);
			view.setUint32(2, lobbyId || 0);
			view.setUint8(6, this.WEAPON[settings.primary]);
			view.setUint8(7, this.WEAPON[settings.secondary]);
			buffer.set(new Uint8Array(nameBuffer), 8);
			return buffer.buffer;
		},
		deserialize: function(buffer) {
			var view = new DataView(buffer);
			return {
				lobbyId: (view.getUint8(1) === 1 ? view.getUint32(2) : undefined),
				primary: Object.keys(this.WEAPON)[view.getUint8(6)],
				secondary: Object.keys(this.WEAPON)[view.getUint8(7)],
				name: bufferToString(buffer.slice(8))
			};
		}
	},
	ERROR: {
		value: 6,
		NO_LOBBY: 0,
		NO_SLOT: 1,
		serialize: function(errorCode) {
			return new Uint8Array([this.value, errorCode]).buffer;
		},
		deserialize: function(buffer) {
			return new Uint8Array(buffer)[1];
		}
	},
	CONNECT_ACCEPTED: {
		value: 7,
		serialize: function(lobbyId, playerId, univWidth, univHeight) {
			var buffer = new ArrayBuffer(11),
				view = new DataView(buffer),
				enabledTeams = 0;
			view.setUint8(0, this.value);
			view.setUint32(1, lobbyId);
			view.setUint8(5, playerId);
			view.setUint16(6, univWidth);
			view.setUint16(8, univHeight);

			return buffer;
		},
		deserialize: function(buffer) {
			var view = new DataView(buffer);
			return {
				lobbyId: view.getUint32(1),
				playerId: view.getUint8(5),
				univWidth: view.getUint16(6),
				univHeight: view.getUint16(8),
			};
		}
	},
	LOBBY_STATE: {
		value: 8,
		LOBBY_STATES: {
			NOT_ENOUGH_PLAYERS: 0,
			TRANSMITTING_DATA: 1,
			PLAYING: 2,
			DISPLAYING_SCORES: 3
		},
		TEAM_MASK: {
			alienBeige: 16,
			alienBlue: 8,
			alienGreen: 4,
			alienPink: 2,
			alienYellow: 1
		},
		serialize: function(state, teams) {
			var view = new Uint8Array(3),
				enabledTeams = 0;
			view[0] =  this.value;
			view[1] = state;
			if (teams !== undefined) {
				teams.forEach(team => {
					enabledTeams |= this.TEAM_MASK[team];
				}, this);
				view[2] = enabledTeams;
			}
			return view.buffer;
		},
		deserialize: function(buffer) {
			var view = new Uint8Array(buffer),
				enabledTeams = [];
			for (var team in this.TEAM_MASK) {
				if (view[2] & this.TEAM_MASK[team]) enabledTeams.push(team);
			}

			return {
				state: Object.keys(this.LOBBY_STATES)[view[1]],
				enabledTeams: enabledTeams
			};
		}
	},	
	ADD_ENTITY: {
		value: 9,
		ENEMY_APPEARANCE: {
			enemyBlack1: 0,
			enemyBlack2: 1,
			enemyBlack3: 2,
			enemyBlack4: 3,
			enemyBlack5: 4,
			enemyBlue1: 5,
			enemyBlue2: 6,
			enemyBlue3: 7,
			enemyBlue4: 8,
			enemyBlue5: 9,
			enemyGreen1: 10,
			enemyGreen2: 11,
			enemyGreen3: 12,
			enemyGreen4: 13,
			enemyGreen5: 14,
			enemyRed1: 15,
			enemyRed2: 16,
			enemyRed3: 17,
			enemyRed4: 18,
			enemyRed5: 19
		},
		PLAYER_APPEARANCE: {
			alienBlue: 0,
			alienBeige: 1,
			alienGreen: 2,
			alienPink: 3,
			alienYellow: 4
		},
		WALK_FRAME: {
			duck: 0,
			hurt: 1,
			jump: 2,
			stand: 3,
			walk1: 4,
			walk2: 5
		},
		MASK: {
			LOOKS_LEFT: 128,
			JETPACK: 64
		},
		WEAPON: {
			lmg: 0,
			smg: 1,
			shotgun: 2,
			knife: 3
		},
		serialize: function(planets, enemies, shots, players) {
			var totalNameSize = 0,
				playerNameBufs = [];
			if (players !== undefined) {
				players.forEach((player, i) => {
					playerNameBufs.push(stringToBuffer(player.name));
					totalNameSize += playerNameBufs[i].byteLength;
				});
			}
			var buffer = new ArrayBuffer(4 + (planets !== undefined ? planets.length*7 : 0) + (enemies !== undefined ? enemies.length*5 : 0) + (shots !== undefined ? shots.length*7 : 0) + (players !== undefined ? players.length*11 + totalNameSize : 0)),
				view = new DataView(buffer);
			view.setUint8(0, this.value);

			var offset = 2;
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
					view.setUint8(4 + offset, this.ENEMY_APPEARANCE[enemy.appearance]);
					offset += 5;
				}
			} else {
				view.setUint8(offset++, 0);
			}

			if (shots !== undefined) {
				view.setUint8(offset++, shots.length);
				shots.forEach((shot, i) => {
					view.setUint16(offset, shot.box.center.x);
					view.setUint16(2 + offset, shot.box.center.y);
					view.setUint8(4 + offset, radToBrad(shot.box.angle, 1));
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
					view.setUint8(6 + offset, radToBrad(player.box.angle, 1));
					var enumByte = this.WALK_FRAME[player.walkFrame.slice(1)];
					enumByte <<= 3;
					enumByte += this.PLAYER_APPEARANCE[player.appearance];
					if (player.jetpack) enumByte |= this.MASK.JETPACK;
					if (player.looksLeft) enumByte |= this.MASK.LOOKS_LEFT;
					view.setUint8(7 + offset, enumByte);
					var weaponByte = this.WEAPON[player.weaponry.armed];
					weaponByte <<= 2;
					weaponByte += this.WEAPON[player.weaponry.carrying];
					view.setUint8(8 + offset, weaponByte);
					view.setUint8(9 + offset, player.homographId);
					view.setUint8(10 + offset, playerNameBufs[i].byteLength);
					new Uint8Array(buffer).set(new Uint8Array(playerNameBufs[i]), 11 + offset);
					offset += 11 + playerNameBufs[i].byteLength;
				}, this);
			}

			return buffer;
		},
		deserialize: function(buffer, planetsCbk, enemiesCbk, shotsCbk, playersCbk) {
			var view = new DataView(buffer);

			for (var i = 2; i !== 7*view.getUint8(1) + 2; i += 7) {
				planetsCbk(
					view.getUint16(i),//x
					view.getUint16(i + 2),//y
					view.getUint16(i + 4),//radius
					view.getUint8(i + 6)//type
				);
			}

			var lim = 5*view.getUint8(i) + ++i;
			for (; i !== lim; i += 5) {
				enemiesCbk(
					view.getUint16(i),//x
					view.getUint16(i + 2),//y
					Object.keys(this.ENEMY_APPEARANCE)[view.getUint8(i + 4)]//appearance
				);
			}

			lim = 7*view.getUint8(i) + ++i;
			for (; i !== lim; i += 7) {
				shotsCbk(
					view.getUint16(i),//x
					view.getUint16(i + 2),//y
					bradToRad(view.getUint8(i + 4), 1),//angle
					view.getUint8(i + 5),//origin
					view.getUint8(i + 6)//type
				);

			}

			while (i !== buffer.byteLength) {
				var nameLgt = view.getUint8(i + 10),
					enumByte = view.getUint8(i + 7),
					weaponByte = view.getUint8(i + 8);
				playersCbk(
					view.getUint8(i),//pid
					view.getUint16(i + 1),//x
					view.getUint16(i + 3),//y
					view.getUint8(i + 5),//attached planet
					radToBrad(view.getUint8(i + 6), 1),//angle
					enumByte & this.MASK.LOOKS_LEFT ? true : false,//looksLeft
					enumByte & this.MASK.JETPACK ? true : false,//jetpack
					Object.keys(this.PLAYER_APPEARANCE)[enumByte << 29 >>> 29],//appearance
					Object.keys(this.WALK_FRAME)[enumByte << 26 >>> 29],//walk frame
					bufferToString(buffer.slice(i + 11, i + 11 + nameLgt)),//name
					view.getUint8(i + 9),//homographId
					Object.keys(this.WEAPON)[weaponByte << 30 >> 30],//armedWeapon
					Object.keys(this.WEAPON)[weaponByte << 28 >> 30]//carriedWeapon
				);
				i += nameLgt + 11;
			}
		}
	},
	REMOVE_ENTITY: {
		value: 10,
		serialize: function(planetIds, enemyIds, shotIds, playerIds) {
			var view = new Uint8Array(4 + planetIds.length + enemyIds.length + shotIds.length + playerIds.length);

			view[0] = this.value;

			if (planetIds !== undefined) {
				view[1] = planetIds.length;
				planetIds.forEach((id, i) => {
					view[2 + i] = id;
				});
			} else {
				view[1] = 0;
			}

			var offset = 2 + planetIds.length;
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
		},
		deserialize: function(buffer, planetsCbk, enemiesCbk, shotsCbk, playersCbk) {
			var view = new Uint8Array(buffer);
			for (var i = 2; i !== view[1] + 2; ++i) {
				planetsCbk(view[i]);
			}
			var limit = view[i] + ++i;
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
	},
	GAME_STATE: {
		value: 11,
		OWNED_BY: {
			neutral: 0,
			alienBlue: 1,
			alienBeige: 2,
			alienGreen: 3,
			alienPink: 4,
			alienYellow: 5
		},
		WALK_FRAME: {
			duck: 0,
			jump: 1,
			stand: 2,
			walk1: 3,
			walk2: 4
		},
		MASK: {
			LOOKS_LEFT: 128,
			JETPACK: 64,
			HURT: 32
		},
		WEAPON: {
			lmg: 0,
			smg: 1,
			shotgun: 2,
			knife: 3
		},
		serialize: function(yourHealth, yourFuel, planets, enemies, players) {
			var buffer = new ArrayBuffer(4 + planets.length*2 + enemies.length + players.actualLength*10),
				view = new DataView(buffer);

			view.setUint8(0, this.value);
			view.setUint8(1, yourHealth);
			view.setUint16(2, yourFuel);

			var offset = 4;
			for (let planet of planets) {
				view.setUint8(offset++, this.OWNED_BY[planet.progress.team]);
				view.setUint8(offset++, planet.progress.value);
			}

			for (let enemy of enemies) {
				view.setUint8(offset++, radToBrad(enemy.box.angle, 1));
			}

			for (let player of players) {
				view.setUint8(offset, player.pid);
				view.setUint16(1 + offset, player.box.center.x);
				view.setUint16(3 + offset, player.box.center.y);
				view.setUint8(5 + offset, player.attachedPlanet);
				view.setUint8(6 + offset, radToBrad(player.box.angle, 1));
				view.setUint8(7 + offset, radToBrad(player.aimAngle, 1));
				var enumByte = this.WALK_FRAME[player.walkFrame.slice(1)] << 2;//doesn't work directly on buffer for efficiency
				if (player.jetpack) enumByte |= this.MASK.JETPACK;
				if (player.looksLeft) enumByte |= this.MASK.LOOKS_LEFT;
				if (player.hurt) enumByte |= this.MASK.HURT;
				view.setUint8(8 + offset, enumByte);
				var weaponByte = this.WEAPON[player.weaponry.armed] << 2;
				weaponByte += this.WEAPON[player.weaponry.carrying];
				view.setUint8(9 + offset, weaponByte);
				offset += 10;
			}

			return buffer;
		},
		deserialize: function(buffer, planetAmount, enemyAmount, playerAmount, planetsCbk, enemiesCbk, playersCbk) {
			var view = new DataView(buffer);
			var i = 4;
			for (let id = 0; i !== 4 + planetAmount*2; i += 2, ++id) {
				planetsCbk(id,
					Object.keys(this.OWNED_BY)[view.getUint8(i)],//ownedBy
					view.getUint8(i + 1)//progress
				);
			}

			var limit = i + enemyAmount;
			for (let id = 0; i !== limit; ++i, ++id) {
				enemiesCbk(id, bradToRad(view.getUint8(i), 1));//angle
			}

			limit += playerAmount*10;
			for (; i !== limit; i += 10) {
				let enumByte = view.getUint8(8 + i),
					weaponByte = view.getUint8(9 + i);
				playersCbk(view.getUint8(i), //pid
					view.getUint16(1 + i),//x
					view.getUint16(3 + i),//y
					view.getUint8(5 + i),//attachedPlanet
					bradToRad(view.getUint8(6 + i), 1),//angle
					enumByte & this.MASK.LOOKS_LEFT ? true : false,//looksLeft
					enumByte & this.MASK.JETPACK ? true : false,//jetpack
					enumByte & this.MASK.HURT ? true : false,//hurt
					Object.keys(this.WALK_FRAME)[enumByte << 27 >>> 29],//walkFrame
					Object.keys(this.WEAPON)[weaponByte >>> 2],//armed weapon
					Object.keys(this.WEAPON)[weaponByte << 30 >>> 30],//carrying weapon
					bradToRad(view.getUint8(7 + i), 1)
				);
			}

			return {
				yourHealth: view.getUint8(1),
				yourFuel: view.getUint16(2)
			};
		}
	},
	PLAYER_CONTROLS: {
		value: 12,
		MASK: {
			JUMP: 1,
			RUN: 2,
			CROUCH: 4,
			JETPACK: 8,
			MOVE_LEFT: 16,
			MOVE_RIGHT: 32,
			CHANGE_WEAPON: 64,
			SHOOT: 128
		},
		serialize: function(controls) {
			var view = new Uint8Array(2),
				enumByte = 0;

			if (controls.jump) enumByte |= this.MASK.JUMP;
			if (controls.run) enumByte |= this.MASK.RUN;
			if (controls.crouch) enumByte |= this.MASK.CROUCH;
			if (controls.jetpack) enumByte |= this.MASK.JETPACK;
			if (controls.moveLeft) enumByte |= this.MASK.MOVE_LEFT;
			if (controls.moveRight) enumByte |= this.MASK.MOVE_RIGHT;
			if (controls.changeWeapon) enumByte |= this.MASK.CHANGE_WEAPON;
			if (controls.shoot) enumByte |= this.MASK.SHOOT;
			view[0] = this.value;
			view[1] = enumByte;

			return view.buffer;
		},
		deserialize: function(buffer) {
			var enumByte = new Uint8Array(buffer)[1],
				controls = {};

			controls.jump = enumByte & this.MASK.JUMP;
			controls.run = (enumByte & this.MASK.RUN) >>> 1;
			controls.crouch = (enumByte & this.MASK.CROUCH) >>> 2;
			controls.jetpack = (enumByte & this.MASK.JETPACK) >>> 3;
			controls.moveLeft = (enumByte & this.MASK.MOVE_LEFT) >>> 4;
			controls.moveRight = (enumByte & this.MASK.MOVE_RIGHT) >>> 5;
			controls.changeWeapon = (enumByte & this.MASK.CHANGE_WEAPON) >>> 6;
			controls.shoot = (enumByte & this.MASK.SHOOT) >>> 7;

			return controls;
		}
	},
	AIM_ANGLE: {
		value: 13,
		serialize: function(angle) {
			var view = new Uint8Array(2);
			view[0] = this.value;
			view[1] = radToBrad(angle, 1);
			return view.buffer;
		},
		deserialize: function(buffer) {
			var angle = new Uint8Array(buffer)[1];
			return bradToRad(angle, 1);
		}
	},
	CHAT: {//CHAT and SET_NAME are coincidentally serialized the same way
		value: 14,
		serialize: function(message) {
			let nameBuffer = stringToBuffer(message),
				view = new Uint8Array(1 + nameBuffer.byteLength);
			view[0] = this.value;
			view.set(new Uint8Array(nameBuffer), 1);
			return view.buffer;
		},
		deserialize: function(buffer) {
			return bufferToString(buffer.slice(1));
		}
	},
	CHAT_BROADCAST: {
		value: 15,
		serialize: function(id, message) {
			var bufMessage = stringToBuffer(message),
				view = new Uint8Array(bufMessage.byteLength + 2);

			view[0] = this.value;
			view[1] = id;
			view.set(new Uint8Array(bufMessage), 2);

			return view.buffer;
		},
		deserialize: function(buffer) {
			return {
				id: new Uint8Array(buffer)[1],
				message: bufferToString(buffer.slice(2))
			};
		}
	},
	SCORES: {
		value: 16,
		PLAYER_APPEARANCE: {
			alienBlue: 0,
			alienBeige: 1,
			alienGreen: 2,
			alienPink: 3,
			alienYellow: 4
		},
		serialize: function(scoresObj) {
			var teams = Object.keys(scoresObj),
				buffer = new ArrayBuffer(1 + teams.length*5),
				view = new DataView(buffer);
			view.setUint8(0, this.value);
			teams.forEach((team, i) => {
				view.setUint8(1 + i*5, this.PLAYER_APPEARANCE[team]);
				view.setInt32(2 + i*5, scoresObj[team]);
			});
			return buffer;
		},
		deserialize: function(buffer) {
			var view = new DataView(buffer, 1), val = {};
			for (var i = 0; i !== view.byteLength; i+=5) val[Object.keys(this.PLAYER_APPEARANCE)[view.getUint8(i)]] = view.getInt32(i+1);
			return val;
		}
	},
	SERVER_REGISTERED: {
		value: 17,
		serialize: function() {
			var view = new Uint8Array(1);
			view[0] = this.value;
			return view.buffer;
		}
		//no deserialize needed
	}
};
Object.defineProperty(MESSAGE, "toString", {
	value: function(val) {
		var res = Object.keys(this);
		return res !== undefined && res[val] !== undefined ? res[val] : "UNKNOWN";
	},
	enumerable: false
});

if (isNode) module.exports = MESSAGE;
