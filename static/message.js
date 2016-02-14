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
			return new Uint8Array([this.value]);
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
		serialize: function(playerId, univWidth, univHeigth) {
			var buffer = new ArrayBuffer(10),
				view = new DataView(buffer);
			view.setUint8(0, this.value);
			view.setUint8(1, playerId);
			view.setUint32(2, univWidth);
			view.setUint32(6, univHeigth);

			return buffer;
		},
		deserialize: function(buffer) {
			var view = new DataView(buffer);
			return {
				playerId: view.getUint8(1),
				univWidth: view.getUint32(2),
				univHeight: view.getUint32(6)
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
			return new Uint8Array([this.value, errorCode]);
		},
		deserialize: function(buffer) {
			return new Uint8Array(buffer)[1];
		}
	},
	LEAVE_LOBBY: {
		value: 8,
		serialize: function() {
			return new Uint8Array([this.value]);
		}
	},
	LOBBY_STATE: {
		value: 9,
		serialize: function(state, timer) {
			var data = new Uint8ClampedArray(timer === undefined ? 2 : 3);
			data[0] = MESSAGE.LOBBY_STATE.value;
			data[1] = state;
			if (timer !== undefined) data[2] = timer;

			return data;
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
	WORLD: {
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
			var buffer = new ArrayBuffer(4 + planets.length*6 + enemies.length*5 + shots.length*9 + players.length*14 + totalNameSize),
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

			offset += 5*enemies.length;
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
				var enumByte = this.ENEMY_APPEARANCE[player.appearance];
				enumByte <<= 3;
				enumByte += this.WALK_FRAME[player.walkFrame.slice(1)];
				if (player.jetpack) enumByte |= this.MASK.JETPACK;
				if (player.looksLeft) enumByte |= this.MASK.LOOKS_LEFT;
				view.setUint8(9 + offset, enumByte);
				view.setUint8(10 + offset, player.health);
				view.setUint16(11 + offset, player.fuel);
				view.setUint8(13 + offset, playerNameBufs[i].length);
				var name = new Uint8Array(playerNameBufs[i]);
				for (let i = 0; i != name.length; i++) {
					view.setUint8(14 + offset + i, name[i]);
				}
				offset += 14 + name.length;
			}, this);

			return buffer;
		},
		deserialize: function(buffer) {
			var view = new DataView(buffer),
				planets = [],
				enemies = [],
				shots = [],
				players = [];

			for(var i = 2; i !== 6*view.getUint8(1) + 2; i += 6) {
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
					appearance: view.getUint8(i + 4)
				});
			}

			lim = i + 9*view.getUint8(i -1);
			for (; i !== lim; i+= 9) {
				shots.push({
					x: view.getUint16(i),
					y: view.getUint16(i + 2),
					angle: view.getFloat32(i + 4),
					lt: view.getUint8(i + 8)
				});
			}

			while (i !== buffer.byteLength - 1) {
				var nameLgt = view.getUint8(i + 13),
					enumByte = view.getUint8(i + 9);
				players.push({
					x: view.getUint16(i),
					y: view.getUint16(i + 2),
					attachedPlanet: view.getUint8(i + 4),
					angle: view.getFloat32(i + 5),
					looksLeft: enumByte & this.MASK.LOOKS_LEFT ? true : false,
					jetpack: enumByte & this.MASK.JETPACK ? true : false,
					appearance: enumByte << 2 >>> 5,
					walkFrame: enumByte << 5 >>> 5,
					health: view.getUint8(i + 10),
					fuel: view.getUint16(i + 11),
					name: bufferToString(buffer.slice(i + 14, i + 14 + nameLgt))
				});
				i += nameLgt + 14;
			}

			return {
				planets: planets,
				enemies: enemies,
				shots: shots,
				players: players
			};
		}
	},

	GAME_DATA: 11,

	PLAYER_CONTROLS: {
		value: 12,
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
		value: 13,
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
		value: 14,
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
	ADD_ENTITY: {
		value: 15,
		serialize: function() {
		},
		deserialize: function() {
		}
	},
	REMOVE_ENTITY: {
		value: 16,
		serialize: function() {
		},
		deserialize: function() {
		}
	},
	SCORES: {
		value: 17,
		serialize: function(scoresObj) {
			var buffer = new ArrayBuffer(21), //5 teams * 4 bytes + 1 byte
				teamView = new DataView(buffer, 1),
				i = 0;
			new Uint8ClampedArray(buffer, 0, 1)[0] = this.value;//packet type
			for (team in scoresObj) {
				teamView.setUint32(i, scoresObj[team]);
				i += 4;
			}
			return buffer;
		},
		deserialize: function(buffer) {
			var teamView = new DataView(buffer, 1),
				teams = ["alienBeige", "alienBlue", "alienGreen", "alienPink", "alienYellow"],
				val = {},
				i = 0;
			teams.forEach(function(team) {
				val[team] = teamView.getUint32(i);
				i += 4;
			});

			return val;
		}
	},
	toString: function(val) {
		var res = Object.keys(this);
		return res !== undefined && res[val] !== undefined ? res[val] : "UNKNOWN";
	},

	PLAY_SOUND: 666,
};

if (isNode) module.exports.MESSAGE = MESSAGE;
