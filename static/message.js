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
	ERROR: {
		value: 0,
		serialize: function(errorCode) {
			return new Uint8Array([this.value, errorCode]);
		},
		deserialize: function(buffer) {
			return new Uint8Array(buffer)[1];
		}
	},

	CONNECT: 1,

	GET_LOBBIES: {
		value: 2,
		serialize: function() {
			return new Uint8Array([this.value]);
		}
	},
	LOBBY_LIST: {
		value: 3,
		serialize: function(lobbyList) {
			var totalNameSize = 0,
				lobbyNameBufs = [];
			lobbyList.forEach(function(lobby, i) {
				lobbyNameBufs.push(stringToBuffer(lobby.name));
				totalNameSize += lobbyNameBufs[i].length;
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
		value: 4,
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

	PLAYER_SETTINGS: 5,

	LEAVE_LOBBY: {
		value: 6,
		serialize: function() {
			return new Uint8Array([this.value]);
		}
	},

	PLAYER_CONTROLS: {
		value: 7,
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

	WORLD_DATA: 8,

	CHAT: {
		value: 9,
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
		value: 10,
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

	PLAY_SOUND: 10,

	GAME_DATA: 11,

	LOBBY_STATE: {
		value: 12,
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
	CONNECT_ACCEPTED: {
		value: 13,
		serialize: function(playerId) {
			return new Uint8ClampedArray([this.value, playerId]);
		},
		deserialize: function(data) {
			var view = new Uint8ClampedArray(data);
			return view[1];
		}
	},

	SCORES: {
		value: 14,
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
	}
},
ERROR = {
	NO_LOBBY: 0,
	NO_SLOT: 1,
	NAME_TAKEN: 2
};

if (isNode) module.exports = { MESSAGE: MESSAGE, ERROR: ERROR};
