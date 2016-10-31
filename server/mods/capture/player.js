import Player from '../../../shared/player.js';

const ipaddr = require('ipaddr.js');

export default class SrvPlayer extends Player {
	constructor(ws) {
		super();

		this.ws = ws;
		this.ip = ipaddr.parse(ws._socket.remoteAddress);

		// we set these in case we receive a pong before sending a ping
		this.updateRate = 50; // ms
		this.latency = 100; // ms
		this.nextUpdate = 50; // ms

		this.nextSeqNbr = 0;
		this.sentSeqNbr = []; // associate a sequence number with a date

		this.ws.on('pong', (buffer) => {
			buffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);//convert Buffer to ArrayBuffer

			let dView = new DataView(buffer),
				seqNbr = dView.getUint32(0),

				newLatency = Date.now() - this.sentSeqNbr[seqNbr],
				pingIncreasefactor = this.latency === 0 ? 0 : Math.sqrt(newLatency / this.latency); // the sqrt is totally arbitrary, but it works well in practice. It doesn't increase the updateRate to much if it's just a sudden peak

			this.updateRate *= pingIncreasefactor; // if the latency gets worse, the updateRate gets slower, or viceversa
			if(this.updateRate < 1) this.updateRate = 1;
			this.latency = newLatency;

			delete this.nextSeqNbr[seqNbr];
			if (this.latency <= 30) setTimeout(this.ping.bind(this), 30); // no need to ping too often
			else this.ping();
		});
		this.ping();

		this._lastHurt = 0;
		this._walkCounter = 0;
	}

	ping() {
		let buffer = new ArrayBuffer(4),
			dView = new DataView(buffer);
		dView.setUint32(0, this.nextSeqNbr);

		this.sentSeqNbr[this.nextSeqNbr] = Date.now();

		this.nextSeqNbr = (this.nextSeqNbr + 1) % 0xFFFFFFFF;

		this.ws.ping(buffer, undefined, true);
	}

	get hurt() {
		return Date.now() - this._lastHurt < 600;
	}
	set hurt(hurt) {
		this._lastHurt = hurt ? Date.now() : 0;
	}

	setWalkFrame() {
		if (this.box === undefined) return;
		if (this.attachedPlanet === -1){
			this.walkFrame = 'jump';
		} else {
			let leftOrRight = (this.controls['moveLeft'] || this.controls['moveRight']);
			if (!leftOrRight) this.walkFrame = (this.controls['crouch']) ? 'duck' : 'stand';
			else if (this._walkCounter++ >= (this.controls['run'] > 0 ? 6 : 10)){
				this._walkCounter = 0;
				this.walkFrame = (this.walkFrame === 'walk1') ? 'walk2' : 'walk1';
			}
			this.setBoxSize();
		}
	}
}
