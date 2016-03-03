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
			var bufName = stringToBuffer(name),
				view = new Uint8Array(bufName.length + 1);

			view[0] = this.value;
			view.set(bufName, 1);

			return view.buffer;
		},
		deserialize: function(buffer) {
			return bufferToString(buffer.slice(1));
		}
	},
	SET_NAME_BROADCAST: {
		value: 4,
		serialize: function(id, name) {
			var bufName = stringToBuffer(name),
				view = new Uint8Array(bufName.length + 2);

			view[0] = this.value;
			view[1] = id;
			view.set(bufName, 2);

			return view.buffer;
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
			var view = new Uint8ClampedArray(timer === undefined ? 2 : 3);
			view[0] = MESSAGE.LOBBY_STATE.value;
			view[1] = state;
			if (timer !== undefined) view[2] = timer;

			return view.buffer;
		},
		deserialize: function(buffer) {
			var view = new Uint8Array(buffer),
				val = {
					state: view[1],
				};
			if (buffer.length === 3) val.timer = view[2];

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
			var buffer = new ArrayBuffer(4 + planets.length*6 + enemies.length*5 + shots.length*9 + players.length*11 + totalNameSize),
				view = new DataView(buffer);
			view.setUint8(0, this.value);

			view.setUint8(1, planets.length);
			var offset = 2;
			planets.forEach(function(planet) {
				view.setUint16(offset, planet.box.center.x);
				view.setUint16(2 + offset, planet.box.center.y);
				view.setUint16(4 + offset, planet.box.radius);
				offset += 6;
			});

			view.setUint8(offset++, enemies.length);
			enemies.forEach(function(enemy) {
				view.setUint16(offset, enemy.box.center.x);
				view.setUint16(2 + offset, enemy.box.center.y);
				view.setUint8(4 + offset, this.ENEMY_APPEARANCE[enemy.appearance]);
				offset += 5;
			}, this);

			view.setUint8(offset++, shots.length);
			shots.forEach(function(shot, i) {
				view.setUint16(offset, shot.box.center.x);
				view.setUint16(2 + offset, shot.box.center.y);
				view.setFloat32(4 + offset, shot.box.angle);
				view.setUint8(8 + offset, shot.lt);
				offset += 9;
			});

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

			var lim = 5*view.getUint8(i) + ++i;
			for (; i !== lim; i += 5) {
				enemies.push({
					x: view.getUint16(i),
					y: view.getUint16(i + 2),
					appearance: Object.keys(this.ENEMY_APPEARANCE)[view.getUint8(i + 4)]
				});
			}

			lim = 9*view.getUint8(i) + ++i;
			for (; i !== lim; i+= 9) {
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
			var view = new Uint8Array(4 + planetIds.length + enemyIds.length + shotIds.length + playerIds.length);

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

			return view.buffer;
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
			var limit = view[i] + ++i;
			for (; i !== limit; ++i) {
				enemyIds.push(view[i]);
			}
			limit = view[i] + ++i;
			for (; i !== limit; ++i) {
				shotIds.push(view[i]);
			}
			for (; i !== buffer.byteLength; ++i) {
				if (i > 30) break;
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

			var offset = 4;
			planets.forEach(function(planet, i) {
				view.setUint8(offset, this.OWNED_BY[planet.progress.team]);
				view.setUint8(1 + offset, planet.progress.value);
				offset += 2;
			}, this);

			enemies.forEach(function(enemy) {
				view.setFloat32(offset, enemy.box.angle);
				offset += 4;
			});

			shots.forEach(function(shot, i) {
				view.setUint16(offset, shot.box.center.x);
				view.setUint16(2 + offset, shot.box.center.y);
				offset += 4;
			});

			players.forEach(function(player, i) {
				view.setUint16(offset, player.box.center.x);
				view.setUint16(2 + offset, player.box.center.y);
				view.setUint8(4 + offset, player.attachedPlanet);
				view.setFloat32(5 + offset, player.box.angle);
				var enumByte = this.WALK_FRAME[player.walkFrame.slice(1)];
				if (player.jetpack) enumByte |= this.MASK.JETPACK;
				if (player.looksLeft) enumByte |= this.MASK.LOOKS_LEFT;
				view.setUint8(9 + offset, enumByte);
				offset += 10;
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
			var view = new Uint8Array(2),
				enumByte = 0;

			if (controls.jump) enumByte |= this.MASK.JUMP;
			if (controls.run) enumByte |= this.MASK.RUN;
			if (controls.crouch) enumByte |= this.MASK.CROUCH;
			if (controls.jetpack) enumByte |= this.MASK.JETPACK;
			if (controls.moveLeft) enumByte |= this.MASK.MOVE_LEFT;
			if (controls.moveRight) enumByte |= this.MASK.MOVE_RIGHT;

			view[0] = this.value;
			view[1] = enumByte;

			return view.buffer;
		},
		deserialize: function(buffer) {
			var enumByte = new Uint8Array(buffer)[1],
				controls = {};

			controls.jump = enumByte & this.MASK.JUMP ? true : false;
			controls.run = enumByte & this.MASK.RUN ? true : false;
			controls.crouch = enumByte & this.MASK.CROUCH ? true : false;
			controls.jetpack = enumByte & this.MASK.JETPACK ? true : false;
			controls.moveLeft = enumByte & this.MASK.MOVE_LEFT ? true : false;
			controls.moveRight = enumByte & this.MASK.MOVE_RIGHT ? true : false;

			return controls;
		}
	},
	CHAT: {//CHAT and SET_NAME are coincidentally serialized the same way
		value: 14,
		serialize: function(message) {
			return MESSAGE.SET_NAME.serialize.call(this, message);
		},
		deserialize: function(buffer) {
			return MESSAGE.SET_NAME.deserialize(buffer);
		}
	},
	CHAT_BROADCAST: {//CHAT_BROADCAST and SET_NAME_BROADCAST are coincidentally serialized the same way
		value: 15,
		serialize: function(id, message) {
			return MESSAGE.SET_NAME_BROADCAST.serialize.call(this, id, message);
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
