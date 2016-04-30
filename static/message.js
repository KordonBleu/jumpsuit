"use strict";

var isNode = typeof module !== "undefined" && typeof module.exports !== "undefined";

if (isNode) var ipaddr = require("ipaddr.js");

function stringToBuffer(string) {
	if (isNode) {
		let buf = new Buffer(string, "utf8");
		return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
	} else {
		var encoder = new TextEncoder("utf8");
		return encoder.encode(string);
	}
}
function bufferToString(arrayBuffer) {
	if (isNode) {
		var StringDecoder = require("string_decoder").StringDecoder,
			decoder = new StringDecoder("utf8"),
			tmpBuf = new Buffer(arrayBuffer);
		return decoder.write(tmpBuf);
	} else {
		var decoder = new TextDecoder("utf8");
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

			serverList.forEach(function(server) {
				var partialServerBuf = MESSAGE.REGISTER_SERVER.serialize(server.secure, server.port, server.name, server.mod).slice(1);
				partialServerBufs.push(partialServerBuf);
				partialServerBufsLength += partialServerBuf.byteLength;
			});

			var buffer = new ArrayBuffer(1 + serverList.length*16 + partialServerBufsLength),
				view = new Uint8Array(buffer),
				offset = 1,
				promises = [];

			view[0] = this.value;

			partialServerBufs.forEach(function(partialServerBuf, i) {
				var offseti = offset;//a copy of offset local to this scope
				//because by the moment the promise will be resolved, `offset` will be modified

				var currentPromise = serverList[i].effectiveIp(clientIp);
				currentPromise.then(function(ip) {
					view.set(ip.toByteArray(), offseti);
				})
				promises.push(currentPromise);

				offset += 16;
				view.set(new Uint8Array(partialServerBuf), offset);
				offset += partialServerBuf.byteLength;

			});

			return new Promise(function(resolve, reject) {
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
			serverIds.forEach(function(id, i) {
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
				view = new Uint8Array(bufName.byteLength + 2);

			view[0] = this.value;
			view[1] = id;
			view.set(new Uint8Array(bufName), 2);

			return view.buffer;
		},
		deserialize: function(buffer) {
			return {
				id: new Uint8Array(buffer)[1],
				name: bufferToString(buffer.slice(2))
			};
		}
	},
	CREATE_PRIVATE_LOBBY: {
		value: 5,
		serialize: function(playerAmount) {
			return new Uint8Array([this.value, playerAmount]).buffer;
		},
		deserialize: function(buffer) {
			return new Uint8Array(buffer)[1];
		}
	},
	CONNECT: {
		value: 6,
		serialize: function(lobbyId) {
			if (lobbyId !== undefined) {
				let buffer = new ArrayBuffer(5),
					view = new DataView(buffer);
				view.setUint8(0, this.value);
				view.setUint32(1, lobbyId);

				return buffer;
			} else {
				return new Uint8Array([this.value]).buffer;
			}
		},
		deserialize: function(buffer) {
			if (buffer.byteLength === 2) {
				return new DataView(buffer).getUint32(1);
			}
		}
	},
	ERROR: {
		value: 7,
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
		value: 8,
		TEAM_MASK: {
			alienBeige: 16,
			alienBlue: 8,
			alienGreen: 4,
			alienPink: 2,
			alienYellow: 1
		},
		serialize: function(lobbyId, playerId, homographId, univWidth, univHeight, planets, enemies, shots, players, teams) {
			var entityBuf = MESSAGE.ADD_ENTITY.serialize(planets, enemies, shots, players),
				buffer = new ArrayBuffer(11 + entityBuf.byteLength),//11 + entityBuf.byteLength - 1 because the packet id is removed
				view = new DataView(buffer),
				enabledTeams = 0;
			view.setUint8(0, this.value);
			view.setUint32(1, lobbyId);

			view.setUint8(5, playerId);
			view.setUint8(6, homographId);

			view.setUint16(7, univWidth);
			view.setUint16(9, univHeight);

			teams.forEach(function(team) {
				enabledTeams |= this.TEAM_MASK[team];
			}, this);
			view.setInt8(11, enabledTeams);

			new Uint8Array(buffer).set(new Uint8Array(entityBuf.slice(1)), 12);

			return buffer;
		},
		deserialize: function(buffer, planetsCbk, enemiesCbk, shotsCbk, playersCbk) {
			var view = new DataView(buffer),
				enabledTeamsByte = view.getUint8(11),
				enabledTeams = [];
			for (let team in this.TEAM_MASK) {
				if (enabledTeamsByte & this.TEAM_MASK[team]) enabledTeams.push(team);
			}
			MESSAGE.ADD_ENTITY.deserialize(buffer.slice(11), planetsCbk, enemiesCbk, shotsCbk, playersCbk)//lil' hack: 11 because the packet id is removed
			return {
				lobbyId: view.getUint32(1),
				playerId: view.getUint8(5),
				homographId: view.getUint8(6),
				univWidth: view.getUint16(7),
				univHeight: view.getUint16(9),
				enabledTeams: enabledTeams
			};
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
				players.forEach(function(player, i) {
					playerNameBufs.push(stringToBuffer(player.name));
					totalNameSize += playerNameBufs[i].byteLength;
				});
			}
			var buffer = new ArrayBuffer(4 + (planets !== undefined ? planets.length*7 : 0) + (enemies !== undefined ? enemies.length*5 : 0) + (shots !== undefined ? shots.length*6 : 0) + (players !== undefined ? players.length*9 + totalNameSize : 0)),
				view = new DataView(buffer);
			view.setUint8(0, this.value);

			var offset = 2;
			if (planets !== undefined) {
				view.setUint8(1, planets.length);
				planets.forEach(function(planet) {
					view.setUint16(offset, planet.box.center.x);
					view.setUint16(2 + offset, planet.box.center.y);
					view.setUint16(4 + offset, planet.box.radius);
					view.setUint8(6 + offset, planet.type);
					offset += 7;
				});
			} else {
				view.setUint8(1, 0);
			}

			if (enemies !== undefined) {
				view.setUint8(offset++, enemies.length);
				enemies.forEach(function(enemy) {
					view.setUint16(offset, enemy.box.center.x);
					view.setUint16(2 + offset, enemy.box.center.y);
					view.setUint8(4 + offset, this.ENEMY_APPEARANCE[enemy.appearance]);
					offset += 5;
				}, this);
			} else {
				view.setUint8(offset++, 0);
			}

			if (shots !== undefined) {
				view.setUint8(offset++, shots.length);
				shots.forEach(function(shot, i) {
					view.setUint16(offset, shot.box.center.x);
					view.setUint16(2 + offset, shot.box.center.y);
					view.setUint8(4 + offset, radToBrad(shot.box.angle, 1));
					view.setUint8(5 + offset, shot.type);
					offset += 6;
				});
			} else {
				view.setUint8(offset++, 0);
			}

			if (players !== undefined) {
				players.forEach(function(player, i) {
					view.setUint16(offset, player.box.center.x);
					view.setUint16(2 + offset, player.box.center.y);
					view.setUint8(4 + offset, player.attachedPlanet);
					view.setUint8(5 + offset, radToBrad(player.box.angle, 1));
					var enumByte = this.WALK_FRAME[player.walkFrame.slice(1)];
					enumByte <<= 3;
					enumByte += this.PLAYER_APPEARANCE[player.appearance];
					if (player.jetpack) enumByte |= this.MASK.JETPACK;
					if (player.looksLeft) enumByte |= this.MASK.LOOKS_LEFT;
					view.setUint8(6 + offset, enumByte);
					var weaponByte = this.WEAPON[player.weaponry.armed];
					weaponByte <<= 2;
					weaponByte += this.WEAPON[player.weaponry.carrying];
					view.setUint8(7 + offset, weaponByte);
					view.setUint8(8 + offset, playerNameBufs[i].byteLength);
					new Uint8Array(buffer).set(new Uint8Array(playerNameBufs[i]), 9 + offset);
					offset += 9 + playerNameBufs[i].byteLength;
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

			lim = 6*view.getUint8(i) + ++i;
			for (; i !== lim; i += 6) {
				shotsCbk(
					view.getUint16(i),
					view.getUint16(i + 2),
					bradToRad(view.getUint8(i + 4), 1),
					view.getUint8(i + 5)
				);

			}

			while (i !== buffer.byteLength) {
				var nameLgt = view.getUint8(i + 8),
					enumByte = view.getUint8(i + 6),
					weaponByte = view.getUint8(i + 7);
				playersCbk(
					view.getUint16(i),
					view.getUint16(i + 2),
					view.getUint8(i + 4),
					radToBrad(view.getUint8(i + 5), 1),
					enumByte & this.MASK.LOOKS_LEFT ? true : false,
					enumByte & this.MASK.JETPACK ? true : false,
					Object.keys(this.PLAYER_APPEARANCE)[enumByte << 29 >>> 29],
					Object.keys(this.WALK_FRAME)[enumByte << 26 >>> 29],//we operate on 32 bits
					bufferToString(buffer.slice(i + 9, i + 9 + nameLgt)),
					Object.keys(this.WEAPON)[weaponByte << 30 >> 30],
					Object.keys(this.WEAPON)[weaponByte << 28 >> 30]
				);
				i += nameLgt + 9;
			}
		}
	},
	REMOVE_ENTITY: {
		value: 11,
		serialize: function(planetIds, enemyIds, shotIds, playerIds) {
			var view = new Uint8Array(4 + planetIds.length + enemyIds.length + shotIds.length + playerIds.length);

			view[0] = this.value;

			if (planetIds !== undefined) {
				view[1] = planetIds.length;
				planetIds.forEach(function(id, i) {
					view[2 + i] = id;
				});
			} else {
				view[1] = 0;
			}

			var offset = 2 + planetIds.length;
			if (enemyIds !== undefined) {
				view[offset++] = enemyIds.length;
				enemyIds.forEach(function(id, i) {
					view[offset + i] = id;
				});
			} else {
				view[offset++] = 0;
			}

			offset += enemyIds.length;
			if (shotIds !== undefined) {
				view[offset++] = shotIds.length;
				shotIds.forEach(function(id, i) {
					view[offset + i] = id;
				});
			} else {
				view[offset++] = 0;
			}

			playerIds.forEach(function(id, i) {
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
		serialize: function(yourHealth, yourFuel, planets, enemies, shots, players) {
			var buffer = new ArrayBuffer(4 + planets.length*2 + enemies.length + shots.length*4 + players.length*9),
				view = new DataView(buffer);

			view.setUint8(0, this.value);
			view.setUint8(1, yourHealth);
			view.setUint16(2, yourFuel);

			var offset = 4;
			planets.forEach(function(planet) {
				view.setUint8(offset++, this.OWNED_BY[planet.progress.team]);
				view.setUint8(offset++, planet.progress.value);
			}, this);

			enemies.forEach(function(enemy) {
				view.setUint8(offset++, radToBrad(enemy.box.angle, 1));
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
				view.setUint8(5 + offset, radToBrad(player.box.angle, 1));
				view.setUint8(6 + offset, radToBrad(player.aimAngle, 1));
				var enumByte = this.WALK_FRAME[player.walkFrame.slice(1)] << 2;//doesn't work directly on buffer for efficiency
				if (player.jetpack) enumByte |= this.MASK.JETPACK;
				if (player.looksLeft) enumByte |= this.MASK.LOOKS_LEFT;
				if (player.hurt) enumByte |= this.MASK.HURT;
				view.setUint8(7 + offset, enumByte);
				var weaponByte = this.WEAPON[player.weaponry.armed] << 2;
				weaponByte += this.WEAPON[player.weaponry.carrying];
				view.setUint8(8 + offset, weaponByte);
				offset += 9;
			}, this);

			return buffer;
		},
		deserialize: function(buffer, planetAmount, enemyAmount, shotAmount, playerAmount, planetsCbk, enemiesCbk, shotsCbk, playersCbk) {
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

			limit += shotAmount*4;
			for (let id = 0; i !== limit; i += 4, ++id) {
				shotsCbk(id,
					view.getUint16(i),//x
					view.getUint16(i + 2)//y
				);
			}

			limit += playerAmount*9;
			for (let id = 0; i !== limit; i += 9, ++id) {
				let enumByte = view.getUint8(7 + i),
					weaponByte = view.getUint8(8 + i);
				console.log(enumByte << 26 >>> 28);
				playersCbk(id,
					view.getUint16(i),//x
					view.getUint16(2 + i),//y
					view.getUint8(4 + i),//attachedPlanet
					bradToRad(view.getUint8(5 + i), 1),//angle
					enumByte & this.MASK.LOOKS_LEFT ? true : false,//looksLeft
					enumByte & this.MASK.JETPACK ? true : false,//jetpack
					enumByte & this.MASK.HURT ? true : false,//hurt
					Object.keys(this.WALK_FRAME)[enumByte << 27 >>> 29],//walkFrame
					Object.keys(this.WEAPON)[weaponByte >>> 2],//armed weapon
					Object.keys(this.WEAPON)[weaponByte << 30 >>> 30],//carrying weapon
					bradToRad(view.getUint8(6 + i), 1)
				);
			}

			return {
				yourHealth: view.getUint8(1),
				yourFuel: view.getUint16(2)
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
		value: 14,
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
		value: 15,
		serialize: function(message) {
			return MESSAGE.SET_NAME.serialize.call(this, message);
		},
		deserialize: function(buffer) {
			return MESSAGE.SET_NAME.deserialize(buffer);
		}
	},
	CHAT_BROADCAST: {//CHAT_BROADCAST and SET_NAME_BROADCAST are coincidentally serialized the same way
		value: 16,
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
		value: 17,
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
