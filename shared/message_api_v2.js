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
function deserializeServer(buffer, offset) {
}



/* Serializators */

let serializators = [];
class Serializator {
	constructor() {
		this.enumVal = serializators.length;
		serializators.push(this);
	}
	serialize(...args) {
		let buf = this._serialize.apply(this, args);
		new Uint8Array(buf)[0] = this.enumVal;
		return buf;
	}
}
export function getSerializator(buffer) {
	let enumVal = new Uint8Array(buffer)[0];

	return serializators[enumVal];
}

class RegisterServer extends Serializator {
	constructor() {
		super();
	}
	_serialize(secure, serverPort, serverName, modName) {
		let serverNameBuf = convert.stringToBuffer(serverName),
			modNameBuf = convert.stringToBuffer(modName),
			buffer = new ArrayBuffer(6 + serverNameBuf.byteLength + modNameBuf.byteLength),
			view = new Uint8Array(buffer),
			dView = new DataView(buffer);

		serializePartialServer(buffer, 1, secure, serverPort, serverNameBuf, modNameBuf);

		return buffer;
	}
	deserialize(buffer) {
		return deserializePartialServer(buffer, 1).data;
	}
	toString() {
		return this.constructor.name;
	}
}

class AddServers extends Serializator {
	constructor() {
		super();
	}
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

export let registerServer = new RegisterServer();
export let addServers = new AddServers();
