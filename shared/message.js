import BiMap from './bimap.js';
import * as convert from './convert.js';

const weaponMap = new BiMap(false,
		'Lmg',
		'Smg',
		'Shotgun',
		'Knife'
	),
	enemyAppearanceMap = new BiMap(false,
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
	teamMap = new BiMap(false,
		'alienBeige',
		'alienBlue',
		'alienGreen',
		'alienPink',
		'alienYellow',
		'neutral' // sometimes not used, doesn't matter since it has the highest value
	),
	teamMaskMap = new BiMap(true,
		'alienBeige',
		'alienBlue',
		'alienGreen',
		'alienPink',
		'alienYellow'
	),
	walkFrameMap = new BiMap(false,
		'duck',
		'hurt',
		'jump',
		'stand',
		'walk1',
		'walk2'
	),
	controlsMap = new BiMap(true,
		'jump',
		'run',
		'crouch',
		'jetpack',
		'moveLeft',
		'moveRight',
		'changeWeapon',
		'shoot'
	),
	lobbyStateMap = new BiMap(false,
		'warmup',
		'playing',
		'displaying_scores'
	);

/* Note: TypedArrays are faster than Dataviews. Therefore, when possible, they should be used.
   But beware of endianness! */
const message = {
	REGISTER_SERVER: {
		value: 0,
		serialize: function(secure, serverPort, serverName, modName) {
			let serverNameBuf = convert.stringToBuffer(serverName),
				modNameBuf = convert.stringToBuffer(modName),
				buffer = new ArrayBuffer(6 + serverNameBuf.byteLength + modNameBuf.byteLength),
				view = new Uint8Array(buffer),
				dView = new DataView(buffer);

			view[0] = this.value;
			view[1] = secure ? 1 : 0;

			dView.setUint16(2, serverPort);

			view[4] = serverNameBuf.byteLength;
			view.set(new Uint8Array(serverNameBuf), 5);

			let offset = 5 + serverNameBuf.byteLength;
			view[offset++] = modNameBuf.byteLength;
			view.set(new Uint8Array(modNameBuf), offset);
			offset += modNameBuf.byteLength;

			return buffer;
		},
		deserialize: function(buffer) {
			let view = new DataView(buffer),
				offset = 5 + view.getUint8(4),
				serverName = convert.bufferToString(buffer.slice(5, offset));

			return {
				secure: view.getUint8(1) === 1 ? true : false,
				serverPort: view.getUint16(2),
				serverName,
				modName: convert.bufferToString(buffer.slice(offset + 1, offset + 1 + view.getUint8(offset)))
			};
		}
	},
	ADD_SERVERS: {
		value: 1,
		serialize: function(serverList, clientIp) {
			let partialServerBufs = [],
				partialServerBufsLength = 0;

			for (let server of serverList) {
				let partialServerBuf = message.REGISTER_SERVER.serialize(server.secure, server.port, server.name, server.mod).slice(1);
				partialServerBufs.push(partialServerBuf);
				partialServerBufsLength += partialServerBuf.byteLength;
			}

			let buffer = new ArrayBuffer(1 + serverList.length*16 + partialServerBufsLength),
				view = new Uint8Array(buffer),
				offset = 1,
				promises = [];

			view[0] = this.value;

			partialServerBufs.forEach((partialServerBuf, i) => {
				let offseti = offset;//a copy of offset local to this scope
				//because by the moment the promise will be resolved, `offset` will be modified

				let currentPromise = serverList[i].effectiveIp(clientIp);
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
			let view = new DataView(buffer),
				offset = 1,
				serverList = [];

			while (offset !== buffer.byteLength) {
				let ip = ipaddr.fromByteArray(new Uint8Array(buffer.slice(offset, offset += 16)));

				if (ip.isIPv4MappedAddress()) ip = ip.toIPv4Address().toString();
				else ip = '[' + ip.toString() + ']';

				let url = (view.getUint8(offset++) === 0 ? 'ws://' : 'wss://') + ip + ':' + view.getUint16(offset);
				offset += 2;

				let serverNameBuf = buffer.slice(offset + 1, offset + 1 + view.getUint8(offset));
				offset += serverNameBuf.byteLength + 1;

				let modNameBuf = buffer.slice(offset + 1, offset + 1 + view.getUint8(offset));
				offset += modNameBuf.byteLength + 1;

				serverList.push({
					name: convert.bufferToString(serverNameBuf),
					mod: convert.bufferToString(modNameBuf),
					url
				});
			}

			return serverList;
		}
	},
	REMOVE_SERVERS: {
		value: 2,
		serialize: function(serverIds) {
			let buffer = new ArrayBuffer(1 + 2*serverIds.length),
				view = new DataView(buffer);

			view.setUint8(0, this.value);
			serverIds.forEach((id, i) => {
				view.setUint16(1 + i*2, id);
			});

			return buffer;
		},
		deserialize: function(buffer) {
			let view = new DataView(buffer),
				serverIds = [];

			for (let offset = 1; offset !== buffer.byteLength; offset += 2) {
				serverIds.push(view.getUint16(offset));
			}

			return serverIds;
		}
	},
	SET_PREFERENCES: {
		value: 3,
		serialize: function(settings) {
			let nameBuffer = convert.stringToBuffer(settings.name),
				view = new Uint8Array(3 + nameBuffer.byteLength);
			view[0] = this.value;
			view[1] = weaponMap.getNbr(settings.primary);
			view[2] =  weaponMap.getNbr(settings.secondary);
			view.set(new Uint8Array(nameBuffer), 3);
			return view.buffer;
		},
		deserialize: function(buffer) {
			let view = new Uint8Array(buffer);
			return {
				primary: weaponMap.getStr(view[1]),
				secondary: weaponMap.getStr(view[2]),
				name: convert.bufferToString(buffer.slice(3))
			};
		}
	},
	SET_NAME_BROADCAST: {
		value: 4,
		serialize: function(id, name, homographId) {
			let nameBuffer = convert.stringToBuffer(name),
				view = new Uint8Array(3 + nameBuffer.byteLength);

			view[0] = this.value;
			view[1] = id;
			view[2] = homographId;
			view.set(new Uint8Array(nameBuffer), 3);

			return view.buffer;
		},
		deserialize: function(buffer) {
			let view = new Uint8Array(buffer);
			return {
				id: view[1],
				name: convert.bufferToString(buffer.slice(3)),
				homographId: view[2]
			};
		}
	},
	CONNECT: {
		value: 5,
		serialize: function(lobbyId, settings) {
			let nameBuffer = convert.stringToBuffer(settings.name),
				buffer = new Uint8Array(8 + nameBuffer.byteLength),
				view = new DataView(buffer.buffer);
			view.setUint8(0, this.value);
			view.setUint8(1, lobbyId !== undefined);
			view.setUint32(2, lobbyId || 0);
			console.log('serializing ' + settings.primary, settings.secondary);
			view.setUint8(6, weaponMap.getNbr(settings.primary));
			view.setUint8(7, weaponMap.getNbr(settings.secondary));
			buffer.set(new Uint8Array(nameBuffer), 8);
			return buffer.buffer;
		},
		deserialize: function(buffer) {
			let view = new DataView(buffer);
			return {
				lobbyId: (view.getUint8(1) === 1 ? view.getUint32(2) : undefined),
				primary: weaponMap.getStr(view.getUint8(6)),
				secondary: weaponMap.getStr(view.getUint8(7)),
				name: convert.bufferToString(buffer.slice(8))
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
			let buffer = new ArrayBuffer(11),
				view = new DataView(buffer);
			view.setUint8(0, this.value);
			view.setUint32(1, lobbyId);
			view.setUint8(5, playerId);
			view.setUint16(6, univWidth);
			view.setUint16(8, univHeight);

			return buffer;
		},
		deserialize: function(buffer) {
			let view = new DataView(buffer);
			return {
				lobbyId: view.getUint32(1),
				playerId: view.getUint8(5),
				univWidth: view.getUint16(6),
				univHeight: view.getUint16(8)
			};
		}
	},
	LOBBY_STATE: {
		value: 8,
		serialize: function(state, teams) {
			let view = new Uint8Array(3),
				enabledTeams = 0;
			view[0] =  this.value;
			view[1] = lobbyStateMap.getNbr(state);
			if (teams !== undefined) {
				teams.forEach(team => {
					enabledTeams |= teamMaskMap.getNbr(team);
				}, this);
				view[2] = enabledTeams;
			}
			return view.buffer;
		},
		deserialize: function(buffer) {
			let view = new Uint8Array(buffer),
				enabledTeams = [];
			for (let {str, nbr} of teamMaskMap) {
				if (view[2] & nbr) enabledTeams.push(str);
			}

			return {
				state: lobbyStateMap.getStr(view[1]), // you serialize a number... and you get back a string TODO: fix this
				enabledTeams: enabledTeams
			};
		}
	},
	ADD_ENTITY: {
		value: 9,
		MASK: {
			LOOKS_LEFT: 128,
			JETPACK: 64
		},
		serialize: function(planets, enemies, shots, players) {
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
			view.setUint8(0, this.value);

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
		},
		deserialize: function(buffer, planetsCbk, enemiesCbk, shotsCbk, playersCbk) {
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
	},
	REMOVE_ENTITY: {
		value: 10,
		serialize: function(planetIds, enemyIds, shotIds, playerIds) {
			let view = new Uint8Array(4 + planetIds.length + enemyIds.length + shotIds.length + playerIds.length);

			view[0] = this.value;

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
		},
		deserialize: function(buffer, planetsCbk, enemiesCbk, shotsCbk, playersCbk) {
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
	},
	GAME_STATE: {
		value: 11,
		MASK: {
			LOOKS_LEFT: 128,
			JETPACK: 64,
			HURT: 32
		},
		serialize: function(yourHealth, yourFuel, planets, enemies, players) {
			let buffer = new ArrayBuffer(4 + planets.length*2 + enemies.length + players.actualLength()*10),
				view = new DataView(buffer);

			view.setUint8(0, this.value);
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
		},
		deserialize: function(buffer, planetAmount, enemyAmount, planetsCbk, enemiesCbk, playersCbk) {
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
	},
	PLAYER_CONTROLS: {
		value: 12,
		serialize: function(controls) {
			let view = new Uint8Array(2),
				enumByte = 0;

			for (let key in controls) {
				if (controls[key]) enumByte |= controlsMap.getNbr(key);
			}
			view[0] = this.value;
			view[1] = enumByte;

			return view.buffer;
		},
		deserialize: function(buffer) {
			let enumByte = new Uint8Array(buffer)[1],
				controls = {};

			let rightShift = 0;
			for (let {str, nbr} of controlsMap) {
				controls[str] = (enumByte & nbr) >>> rightShift;
				++rightShift; // so that controls[`str`] is worth 1 if enabled, and no more
			}

			return controls;
		}
	},
	AIM_ANGLE: {
		value: 13,
		serialize: function(angle) {
			let view = new Uint8Array(2);
			view[0] = this.value;
			view[1] = convert.radToBrad(angle, 1);
			return view.buffer;
		},
		deserialize: function(buffer) {
			let angle = new Uint8Array(buffer)[1];
			return convert.bradToRad(angle, 1);
		}
	},
	CHAT: {//CHAT and SET_NAME are coincidentally serialized the same way
		value: 14,
		serialize: function(message) {
			let nameBuffer = convert.stringToBuffer(message),
				view = new Uint8Array(1 + nameBuffer.byteLength);
			view[0] = this.value;
			view.set(new Uint8Array(nameBuffer), 1);
			return view.buffer;
		},
		deserialize: function(buffer) {
			return convert.bufferToString(buffer.slice(1));
		}
	},
	CHAT_BROADCAST: {
		value: 15,
		serialize: function(id, message) {
			let bufMessage = convert.stringToBuffer(message),
				view = new Uint8Array(bufMessage.byteLength + 2);

			view[0] = this.value;
			view[1] = id;
			view.set(new Uint8Array(bufMessage), 2);

			return view.buffer;
		},
		deserialize: function(buffer) {
			return {
				id: new Uint8Array(buffer)[1],
				message: convert.bufferToString(buffer.slice(2))
			};
		}
	},
	SCORES: {
		value: 16,
		serialize: function(scoresObj) {
			let teams = Object.keys(scoresObj).sort(),
				buffer = new ArrayBuffer(1 + teams.length*4),
				view = new DataView(buffer);
			view.setUint8(0, this.value);
			teams.forEach(function(team, i) {
				view.setInt32(1 + i*4, scoresObj[team]);
			});

			return buffer;
		},
		deserialize: function(buffer, enabledTeams) {
			let view = new DataView(buffer, 1),
				val = {};
			enabledTeams.sort().forEach(function(team, i) {
				val[team] = view.getInt32(i*4);
			});

			return val;
		}
	},
	SERVER_REGISTERED: {
		value: 17,
		serialize: function() {
			let view = new Uint8Array(1);
			view[0] = this.value;
			return view.buffer;
		}
		//no deserialize needed
	}
};
Object.defineProperty(message, 'toString', {
	value: function(val) {
		let res = Object.keys(this);
		return res !== undefined && res[val] !== undefined ? res[val] : 'UNKNOWN';
	},
	enumerable: false
});

export default message;
