import * as config from './config_loader.js';
config.init(process.argv[2] || './game_config.json', {
	dev: false,
	master: 'wss://jumpsuit.space',
	monitor: false,
	server_name: 'JumpSuit server'
}, (newConfig, previousConfig) => {
	if(newConfig.monitor !== previousConfig.monitor) {
		if (previousConfig.monitor) monitor.unsetMonitorMode();
		else monitor.setMonitorMode(lobby.lobbies);
	}
});


import * as message from '../shared/message.js';
import logger from './logger.js';
import * as lobby from './lobby.js';

import * as onMessage from '<@onMessage@>';
import Player from '<@Player@>';

const modName = '<@modName@>';

require('colors');

import './proto_mut.js';

import * as monitor from './monitor.js';
if(config.config.monitor) monitor.setMonitorMode(lobby.lobbies);


const Slave = require('enslavism').Slave;

new Slave(config.config.master, {
	serverName: config.config.server_name,
	modName: modName
}).then(slave => {
	logger(logger.S_REGISTER, 'Successfully registered at ' + config.config.master.bold);

	slave.on('connection', clientCo => {
		console.log(clientCo);
		logger(logger.INFO, 'Client #' + clientCo.id + ' connected');
		// TODO: get the IP to feed it to the IPS to prevent spamming
		// see https://github.com/beefproject/beef/wiki/Module:-Get-Internal-IP-WebRTC
		clientCo.on('datachannel', dc => {
			let player = new Player(dc);

			dc.on('message', function(msg) {
				msg = msg.data;

				try {
					let serializator = message.getSerializator(msg);
					if (config.config.monitor) monitor.traffic.beingConstructed.in += msg.byteLength;
					switch (serializator) {
						case message.setPreferences: {
							let val = message.setPreferences.deserialize(msg);
							if (player.lobby !== undefined) {
								player.homographId = player.lobby.getNextHomographId(val.name);
								player.lobby.broadcast(message.setNameBroadcast.serialize(player.pid, val.name, player.homographId));
							}
							player.name = val.name;
							player.armedWeapon = player.weapons[val.primary];
							player.carriedWeapon = player.weapons[val.secondary];
							break;
						}
						case message.connect: {
							let val = message.connect.deserialize(msg);
							let selectedLobby;
							if (val.lobbyId !== undefined) {
								selectedLobby = lobby.lobbies.get(val.lobbyId);
								if (!selectedLobby) {
									player.send(message.error.serialize(message.error.NO_LOBBY));
									break;
								} else if (selectedLobby.players.length === selectedLobby.maxPlayers) {
									player.send(message.error.serialize(message.error.NO_SLOT));
									break;
								}
							} else {//public lobby
								val.lobbyId = lobby.newLobby();
								if (val.lobbyId === -1) {
									player.send(message.error.serialize(message.error.NO_LOBBY));
									break;
								}
								selectedLobby = lobby.lobbies.get(val.lobbyId);
							}
							player.pid = selectedLobby.addPlayer(player);
							player.name = val.name;
							player.armedWeapon = player.weapons[val.primary];
							player.carriedWeapon = player.weapons[val.secondary];
							player.homographId = selectedLobby.getNextHomographId(player.name);
							player.lobbyId = val.lobbyId;
							player.lobby = selectedLobby;
							player.lastUpdate = Date.now();

							selectedLobby.connectPlayer(player);

							break;
						}
						case message.playerControls:
							onMessage.onControls(player, message.playerControls.deserialize(msg));
							break;
						case message.chat: {
							let chatMsg = message.chat.deserialize(msg);
							if (chatMsg !== '' && chatMsg.length <= 150) lobby.lobbies[player.lobbyId].broadcast(message.chatBroadcast.serialize(player.pid, chatMsg), player);
							break;
						}
						case message.aimAngle:
							player.aimAngle = message.aimAngle.deserialize(msg);
							break;
						default:
							console.log('user should be banned temporarly');
							return;//prevent logging
					}
					logger(logger.DEV, serializator.toString());
				} catch (err) {
					console.error(err);
					console.log('user should be banned temporarly');
				}
			});

			function safeDisconnect() {
				console.log('let\'s disconnect');
				let lobbyId = player.lobbyId;
				if (player.lobby.disconnectPlayer(player)) {
					//true, if lobby needs to be closed or rather erased from the array
					lobby.deleteLobby(lobbyId);
				}
			}
			dc.on('error', safeDisconnect);
			dc.on('close', safeDisconnect);
		});
	});
}).catch(err => {
	logger(logger.ERROR, 'Attempt failed, master server is not reachable! ' + err);
});
