"use strict";

var isNode = typeof module !== "undefined" && typeof module.exports !== "undefined";

function stringToBuffer(string) {
	if (isNode) {
		return new Uint8Array(new Buffer(string, "utf8"));
	} else {
		var encoder = new TextEncoder("utf8");
		return encoder.encode(string);
	}
}
function bufferToString(arrayBuffer) {
	if (isNode) {
		var StringDecoder = require('string_decoder').StringDecoder,
			decoder = new StringDecoder("utf8"),
			tmpBuf = new Buffer(arrayBuffer);
		return decoder.write(tmpBuf);
	} else {
		var decoder = new TextDecoder("utf8");
		return decoder.decode(arrayBuffer);
	}
}
function filter(value) {
	return value !== undefined;
}

const MESSAGE = {
	GET_LOBBIES: {
		value: 0,
		serialize: function() {
			return new Uint8Array([this.value]).buffer;
		}
	},
	LOBBY_LIST: {
		value: 1,
		serialize: function(lobbyList) {
			var totalNameSize = 0,
				lobbyNameBufs = [];
			lobbyList.forEach(function(lobby, i) {
				lobbyNameBufs.push(stringToBuffer(lobby.name));
				totalNameSize += lobbyNameBufs[i].byteLength;
			});
			var buffer = new ArrayBuffer(lobbyList.length*7 + totalNameSize + 1),
				view = new DataView(buffer),
				bufIndex = 1;
			view.setUint8(0, this.value);

			lobbyList.forEach(function(lobby, i) {
				view.setUint32(bufIndex, lobby.uid);
				view.setUint8(bufIndex + 4, lobby.players);
				view.setUint8(bufIndex + 5, lobby.maxPlayers);
				view.setUint8(bufIndex + 6, lobbyNameBufs[i].length);
				new Uint8Array(lobbyNameBufs[i]).forEach(function(val, i) {
					view.setUint8(bufIndex + 7 + i, val);
				});
				bufIndex += 7 + lobbyNameBufs[i].length;
			});

			return buffer;
		},
		deserialize: function(buffer) {
			var view = new DataView(buffer, 1),
				lobbyList = [],
				lobby,
				i = 0,
				lobbyIndex = 0;
			while (lobbyIndex !== buffer.byteLength - 1) {
				switch (i) {
					case 0:
						lobby = {
							uid: view.getUint32(i + lobbyIndex)
						};
						i += 4;
						break;
					case 4:
						lobby.players = view.getUint8(i + lobbyIndex);
						i += 1;
						break;
					case 5:
						lobby.maxPlayers = view.getUint8(i + lobbyIndex);
						i += 1;
						break;
					case 6:
						var strLen = view.getUint8(i + lobbyIndex),
							strStart = i + lobbyIndex + 2;//1 byte after the "length byte" + 1 byte because view starts with the second byte
						lobby.name = bufferToString(buffer.slice(strStart, strStart + strLen));

						lobbyList.push(lobby);

						i = 0;
						lobbyIndex += strLen + 7;
				}
			}

			return lobbyList;
		}
	},
	CREATE_LOBBY: {
		value: 2,
		serialize: function(name, playerAmount) {
			var bufdStr = stringToBuffer(name),
				buffer = new ArrayBuffer(2 + bufdStr.length),
				viewOne = new Uint8ClampedArray(buffer, 0, 2),
				viewName = new Uint8Array(buffer, 2);
			viewOne[0] = this.value;
			viewOne[1] = playerAmount;
			bufdStr.forEach(function(elem, i) {
				viewName[i] = elem;
			});

			return buffer;
		},
		deserialize: function(buffer) {
			return {
				playerAmount: new Uint8ClampedArray(buffer, 1)[0],
				name: bufferToString(new Uint8Array(buffer.slice(2)))
			};
		}
	},
	SET_NAME: {
		value: 3,
		serialize: function(name) {
			var bufMsg = stringToBuffer(name),
				buffer = new ArrayBuffer(bufMsg.length + 1),
				view = new DataView(buffer);

			view.setUint8(0, this.value);
			new Uint8Array(bufMsg).forEach(function(val, i) {
				view.setUint8(i + 1, val);
			});

			return buffer;
		},
		deserialize: function(buffer) {
			return bufferToString(buffer.slice(1));
		}
	},
	SET_NAME_BROADCAST: {
		value: 4,
		serialize: function(id, name) {
			var bufMsg = stringToBuffer(name),
				buffer = new ArrayBuffer(bufMsg.length + 2),
				view = new DataView(buffer);

			view.setUint8(0, this.value);
			view.setUint8(1, id);
			new Uint8Array(bufMsg).forEach(function(val, i) {
				view.setUint8(i + 2, val);
			});

			return buffer;
		},
		deserialize: function(buffer) {
			return {
				id: new Uint8Array(buffer)[1],
				name: bufferToString(buffer.slice(2))
			};
		}
	},
	CONNECT: {
		value: 5,
		serialize: function(lobbyId) {
			var buffer = new ArrayBuffer(5),
				view = new DataView(buffer);
			view.setUint8(0, this.value);
			view.setUint32(1, lobbyId);

			return buffer;
		},
		deserialize: function(buffer) {
			return new DataView(buffer).getUint32(1);
		}
	},
	CONNECT_ACCEPTED: {
		value: 6,
		TEAM_MASK: {
			alienBeige: 16,
			alienBlue: 8,
			alienGreen: 4,
			alienPink: 2,
			alienYellow: 1
		},
		serialize: function(playerId, univWidth, univHeight, planets, enemies, shots, players, teams) {//teams is an object with team names as keys. The values do not matter
			var entityBuf = MESSAGE.ADD_ENTITY.serialize(planets, enemies, shots, players),
				buffer = new ArrayBuffer(10 + entityBuf.byteLength),//11 + entityBuf.byteLength - 1 because the packet id is removed
				view = new DataView(buffer),
				enabledTeams = 0;
			view.setUint8(0, this.value);
			view.setUint8(1, playerId);
			view.setUint32(2, univWidth);
			view.setUint32(6, univHeight);

			teams.forEach(function(team) {
				enabledTeams |= this.TEAM_MASK[team];
			}, this);
			view.setInt8(10, enabledTeams);

			new Uint8Array(buffer).set(new Uint8Array(entityBuf.slice(1)), 11);

			return buffer;
		},
		deserialize: function(buffer) {
			var view = new DataView(buffer),
				enabledTeamsByte = view.getUint8(10),
				enabledTeams = [];
			for (let team in this.TEAM_MASK) {
				if (enabledTeamsByte & this.TEAM_MASK[team]) enabledTeams.push(team);
			}
			return {
				playerId: view.getUint8(1),
				univWidth: view.getUint32(2),
				univHeight: view.getUint32(6),
				enabledTeams: enabledTeams,
				world: MESSAGE.ADD_ENTITY.deserialize(buffer.slice(10))//lil' hack: 10 because the packet id is removed
			};
		}
	},
	ERROR: {
		NO_LOBBY: 0,
		NO_SLOT: 1,
		NAME_TAKEN: 2,
		NAME_UNKNOWN: 3,

		value: 7,
		serialize: function(errorCode) {
			return new Uint8Array([this.value, errorCode]).buffer;
		},
		deserialize: function(buffer) {
			return new Uint8Array(buffer)[1];
		}
	},
	LEAVE_LOBBY: {
		value: 8,
		serialize: function() {
			return new Uint8Array([this.value]).buffer;
		}
	},
	LOBBY_STATE: {
		value: 9,
		serialize: function(state, timer) {
			var data = new Uint8ClampedArray(timer === undefined ? 2 : 3);
			data[0] = MESSAGE.LOBBY_STATE.value;
			data[1] = state;
			if (timer !== undefined) data[2] = timer;

			return data.buffer;
		},
		deserialize: function(data) {
			var view = new Uint8ClampedArray(data),
				val = {
					state: view[1],
				};
			if (data.length === 3) val.timer = view[2];

			return val;
		}
	},
	ADD_ENTITY: {
		value: 10,
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
		serialize: function(planets, enemies, shots, players) {
			var totalNameSize = 0,
				playerNameBufs = [];
			players.forEach(function(player, i) {
				playerNameBufs.push(stringToBuffer(player.name));
				totalNameSize += playerNameBufs[i].byteLength;
			})
			var buffer = new ArrayBuffer(4 + planets.filter(filter).length*6 + enemies.filter(filter).length*5 + shots.filter(filter).length*9 + players.filter(filter).length*11 + totalNameSize),//actual length, not what .length says
				view = new DataView(buffer);
			view.setUint8(0, this.value);

			view.setUint8(1, planets.length);
			planets.forEach(function(planet, i) {
				view.setUint16(2 + i*6, planet.box.center.x);
				view.setUint16(4 + i*6, planet.box.center.y);
				view.setUint16(6 + i*6, planet.box.radius);
			});

			var offset = 2 + 6*planets.length;
			view.setUint8(offset, enemies.length);
			enemies.forEach(function(enemy, i) {
				view.setUint16(1 + offset + i*5, enemy.box.center.x);
				view.setUint16(3 + offset + i*5, enemy.box.center.y);
				view.setUint8(5 + offset + i*5, this.ENEMY_APPEARANCE[enemy.appearance]);
			}, this);

			offset += 1 + 5*enemies.length;
			view.setUint8(offset, shots.length);
			shots.forEach(function(shot, i) {
				view.setUint16(1 + offset + i*9, shot.box.center.x);
				view.setUint16(3 + offset + i*9, shot.box.center.y);
				view.setFloat32(5 + offset + i*9, shot.box.angle);
				view.setUint8(9 + offset + i*9, shot.lt);
			});

			offset += 1 + 9*shots.length;
			players.forEach(function(player, i) {
				view.setUint16(offset, player.box.center.x);

				view.setUint16(2 + offset, player.box.center.y);
				view.setUint8(4 + offset, player.attachedPlanet);
				view.setFloat32(5 + offset, player.box.angle);
				var enumByte = this.PLAYER_APPEARANCE[player.appearance];
				enumByte <<= 3;
				enumByte += this.WALK_FRAME[player.walkFrame.slice(1)];
				if (player.jetpack) enumByte |= this.MASK.JETPACK;
				if (player.looksLeft) enumByte |= this.MASK.LOOKS_LEFT;
				view.setUint8(9 + offset, enumByte);
				view.setUint8(10 + offset, playerNameBufs[i].length);
				var name = new Uint8Array(playerNameBufs[i]);
				for (let i = 0; i != name.length; i++) {
					view.setUint8(11 + offset + i, name[i]);
				}
				offset += 11 + name.length;
			}, this);

			return buffer;
		},
		deserialize: function(buffer) {
			var view = new DataView(buffer),
				planets = [],
				enemies = [],
				shots = [],
				players = [];

			for (var i = 2; i !== 6*view.getUint8(1) + 2; i += 6) {
				planets.push({
					x: view.getUint16(i),
					y: view.getUint16(i + 2),
					radius: view.getUint16(i + 4)
				});
			}

			var lim = i + 1 + 5*view.getUint8(i);
			for (++i; i !== lim; i += 5) {
				enemies.push({
					x: view.getUint16(i),
					y: view.getUint16(i + 2),
					appearance: Object.keys(this.ENEMY_APPEARANCE)[view.getUint8(i + 4)]
				});
			}

			lim = i + 1 + 9*view.getUint8(i);
			for (++i; i !== lim; i+= 9) {
				shots.push({
					x: view.getUint16(i),
					y: view.getUint16(i + 2),
					angle: view.getFloat32(i + 4),
					lt: view.getUint8(i + 8)
				});
			}

			while (i !== buffer.byteLength) {
				var nameLgt = view.getUint8(i + 10),
					enumByte = view.getUint8(i + 9);
				players.push({
					x: view.getUint16(i),
					y: view.getUint16(i + 2),
					attachedPlanet: view.getUint8(i + 4),
					angle: view.getFloat32(i + 5),
					looksLeft: enumByte & this.MASK.LOOKS_LEFT ? true : false,
					jetpack: enumByte & this.MASK.JETPACK ? true : false,
					appearance: Object.keys(this.PLAYER_APPEARANCE)[enumByte << 26 >>> 29],
					walkFrame: Object.keys(this.WALK_FRAME)[enumByte << 29 >>> 29],//we operate on 32 bits
					name: bufferToString(buffer.slice(i + 11, i + 11 + nameLgt))
				});
				i += nameLgt + 11;
			}

			return {
				planets: planets,
				enemies: enemies,
				shots: shots,
				players: players
			};
		}
	},
	REMOVE_ENTITY: {
		value: 11,
		serialize: function(planetIds, enemyIds, shotIds, playerIds) {
			var buffer = new ArrayBuffer(4 + planetIds.filter(filter).length + enemyIds.filter(filter).length + shotIds.filter(filter).length + playerIds.filter(filter).length),
				view = new Uint8Array(buffer);
				view[0] = this.value;

			view[1] = planetIds.length;
			planetIds.forEach(function(id, i) {
				view[2 + i] = id;
			});

			view[2 + planetIds.length] = enemyIds.length;
			enemyIds.forEach(function(id, i) {
				view[2 + planetIds.length + 1 + i] = id;
			});

			view[3 + planetIds.length + enemyIds.length] = shotIds.length;
			shotIds.forEach(function(id, i) {
				view[3 + planetIds.length + enemyIds.length + 1 + i] = id;
			});

			playerIds.forEach(function(id, i) {
				view[3 + planetIds.length + enemyIds.length + shotIds.length + 1 + i] = id;
			});

			return buffer;
		},
		deserialize: function(buffer) {
			var planetIds = [],
				enemyIds = [],
				shotIds = [],
				playerIds = [],
				view = new Uint8Array(buffer);
			for (var i = 2; i !== view[1] + 2; ++i) {
				planetIds.push(view[i]);
			}
			for (var j = i + 1; j !== i + 1 + view[i]; ++j) {
				enemyIds.push(view[j]);
			}
			for (i = j + 1; i !== j + 1 + view[j]; ++i) {
				shotIds.push(view[i]);
			}
			for (; i !== buffer.byteLength; ++i) {
				playerIds.push(view[i]);
			}

			return {
				planetIds: planetIds,
				enemyIds: enemyIds,
				shotIds: shotIds,
				playerIds: playerIds
			};
		}
	},
	GAME_STATE: {
		value: 12,
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
		serialize: function(yourHealth, yourFuel, planets, enemies, shots, players) {
			var buffer = new ArrayBuffer(4 + planets.length*2 + enemies.length*4 + shots.length*4 + players.length*10),
				view = new DataView(buffer);

			view.setUint8(0, this.value);
			view.setUint8(1, yourHealth);
			view.setUint16(2, yourFuel);

			planets.forEach(function(planet, i) {
				view.setUint8(4 + i*2, this.OWNED_BY[planet.progress.team]);
				view.setUint8(5 + i*2, planet.progress.value);
			}, this);

			var offset = 4 + planets.length*2;
			enemies.forEach(function(enemy, i) {
				view.setFloat32(offset + i*4, enemy.box.angle);
			});

			offset += enemies.length*4;
			shots.forEach(function(shot, i) {
				view.setUint16(offset + i*4, shot.box.center.x);
				view.setUint16(2 + offset + i*4, shot.box.center.y);
			});

			offset += shots.length*4;
			players.forEach(function(player, i) {
				view.setUint16(offset + i*10, player.box.center.x);
				view.setUint16(2 + offset + i*10, player.box.center.y);
				view.setUint8(4 + offset + i*10, player.attachedPlanet);
				view.setFloat32(5 + offset + i*10, player.box.angle);
				var enumByte = this.WALK_FRAME[player.walkFrame.slice(1)];
				if (player.jetpack) enumByte |= this.MASK.JETPACK;
				if (player.looksLeft) enumByte |= this.MASK.LOOKS_LEFT;
				view.setUint8(9 + offset + i*10, enumByte);
			}, this);

			return buffer;
		},
		deserialize: function(buffer, planetAmount, enemyAmount, shotAmount, playerAmount) {
			var view = new DataView(buffer),
				planets = [],
				enemies = [],
				shots = [],
				players = [];

			for (var i = 4; i !== 4 + planetAmount*2; i += 2) {
				planets.push({
					ownedBy: Object.keys(this.OWNED_BY)[view.getUint8(i)],
					progress: view.getUint8(i + 1)
				});
			}

			var limit = i + enemyAmount*4;
			for (; i !== limit; i += 4) {
				enemies.push(view.getFloat32(i));
			}

			limit += shotAmount*4;
			for (; i !== limit; i+= 4) {
				shots.push({
					x: view.getUint16(i),
					y: view.getUint16(i + 2)
				});
			}

			limit += playerAmount*10;
			for (; i !== limit; i += 10) {
				var enumByte = view.getUint8(9 + i);
				players.push({
					x: view.getUint16(i),
					y: view.getUint16(2 + i),
					attachedPlanet: view.getUint8(4 + i),
					angle: view.getFloat32(5 + i),
					looksLeft: enumByte & this.MASK.LOOKS_LEFT ? true : false,
					jetpack: enumByte & this.MASK.JETPACK ? true : false,
					walkFrame: Object.keys(this.WALK_FRAME)[enumByte << 29 >>> 29]
				});
			}

			return {
				yourHealth: view.getUint8(1),
				yourFuel: view.getUint16(2),
				planets: planets,
				enemies: enemies,
				shots: shots,
				players: players
			};
		}
	},
	PLAYER_CONTROLS: {
		value: 13,
		MASK: {
			JUMP: 1,
			RUN: 2,
			CROUCH: 4,
			JETPACK: 8,
			MOVE_LEFT: 16,
			MOVE_RIGHT: 32
		},
		serialize: function(controls) {
			var bitField = new Uint8Array([this.value, 0]);

			if (controls.jump) bitField[1] |= this.MASK.JUMP;
			if (controls.run) bitField[1] |= this.MASK.RUN;
			if (controls.crouch) bitField[1] |= this.MASK.CROUCH;
			if (controls.jetpack) bitField[1] |= this.MASK.JETPACK;
			if (controls.moveLeft) bitField[1] |= this.MASK.MOVE_LEFT;
			if (controls.moveRight) bitField[1] |= this.MASK.MOVE_RIGHT;

			return bitField.buffer;
		},
		deserialize: function(buffer) {
			var view = new Uint8Array(buffer),
				controls = {};

			controls.jump = view[1] & this.MASK.JUMP ? true : false;
			controls.run = view[1] & this.MASK.RUN ? true : false;
			controls.crouch = view[1] & this.MASK.CROUCH ? true : false;
			controls.jetpack = view[1] & this.MASK.JETPACK ? true : false;
			controls.moveLeft = view[1] & this.MASK.MOVE_LEFT ? true : false;
			controls.moveRight = view[1] & this.MASK.MOVE_RIGHT ? true : false;

			return controls;
		}
	},
	CHAT: {
		value: 14,
		serialize: function(message) {
			var bufMsg = stringToBuffer(message),
				buffer = new ArrayBuffer(bufMsg.length + 1),
				view = new DataView(buffer);

			view.setUint8(0, this.value);
			new Uint8Array(bufMsg).forEach(function(val, i) {
				view.setUint8(i + 1, val);
			});

			return buffer;
		},
		deserialize: function(buffer) {
			return bufferToString(buffer.slice(1));
		}
	},
	CHAT_BROADCAST: {
		value: 15,
		serialize: function(id, message) {
			var bufMsg = stringToBuffer(message),
				buffer = new ArrayBuffer(bufMsg.length + 2),
				view = new DataView(buffer);

			view.setUint8(0, this.value);
			view.setUint8(1, id);
			new Uint8Array(bufMsg).forEach(function(val, i) {
				view.setUint8(i + 2, val);
			});

			return buffer;
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
		serialize: function(scoresObj) {
			var teams = Object.keys(scoresObj).sort(),
				buffer = new ArrayBuffer(1 + teams.length*4),
				view = new DataView(buffer);
			view.setUint8(0, this.value);
			teams.forEach(function(team, i) {
				view.setInt32(1 + i*4, scoresObj[team]);
			});

			return buffer;
		},
		deserialize: function(buffer, definedTeams) {
			var view = new DataView(buffer, 1),
				val = {};
			definedTeams.sort().forEach(function(team, i) {
				val[team] = view.getInt32(i*4);
			});

			return val;
		}
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
