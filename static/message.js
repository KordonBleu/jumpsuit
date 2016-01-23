const MESSAGE = {
	ERROR: {
		value: 0,
		serialize: function(errorCode) {
			return new Uint8Array([this.value, errorCode]);
		},
		deserialize: function(data) {
			var view = new Uint8Array(data);
			return view[1];
		}
	},

	CONNECT: 1,

	GET_LOBBIES: 2,

	LOBBY_LIST: 3,

	CREATE_LOBBY: {
		value: 4,
		serialize: function(name, playerAmount) {
			var buffer = new ArrayBuffer(2 + name.length*2),
				viewOne = new Uint8ClampedArray(buffer, 0, 2);
				viewTwo = new Uint16Array(buffer, 2);//JavaScript's string are UTF-16
			viewOne[0] = this.value;
			viewOne[1] = playerAmount;
			for (var i = 0; i !== name.length; i++) {
				viewTwo[i] = name.charCodeAt(i);
			}
			return buffer;
		},
		deserialize: function(buffer) {
			return {
				playerAmount: new Uint8ClampedArray(buffer, 0, 2)[1],
				name: String.fromCharCode.apply(null, new Uint16Array(buffer, 2))
			};
		}
	},

	PLAYER_SETTINGS: 5,

	LEAVE_LOBBY: 6,

	PLAYER_CONTROLS: 7,

	WORLD_DATA: 8,

	CHAT: 9,

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
			var buffer = new ArrayBuffer,
				teamView = new Int32Array(buffer, 1),
				i = 0;
			new Uint8ClampedArray(buffer, 0, 1)[0] = this.value;//packet type
			for (i in scoresObj) {
				teamView[i] = scoresObj[i];
				i++;
			}
		},
		deserialize: function(buffer) {
			var teamView = new Int32Array(buffer, 1),
				teams = ["alienBeige", "alienBlue", "alienGreen", "alienPink", "alienYellow"],
				val = {};
			teamView.forEach(function(score, index) {
				val[teams[index]] = score;
			});

			return val;
		}
	},
	toString: function(val) {
		var res = Object.keys(this);
		return res !== undefined ? res[1] : "UNKNOW";
	}
},
ERROR = {
	NO_LOBBY: 0,
	NO_SLOT: 1,
	NAME_TAKEN: 2
};

if (typeof module !== "undefined" && typeof module.exports !== "undefined") module.exports = { MESSAGE: MESSAGE, ERROR: ERROR};
