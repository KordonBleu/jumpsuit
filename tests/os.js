export function networkInterfaces() {
	return {
		lo: [
			{
				address: '127.0.0.1',
				netmask: '255.0.0.0',
				family: 'IPv4',
				mac: '00:00:00:00:00:00',
				internal: true
			},
			{
				address: '::1',
				netmask: 'ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff',
				family: 'IPv6',
				mac: '00:00:00:00:00:00',
				scopeid: 0,
				internal: true
			}
		],
		wlp2s0: [
			{
				address: '192.168.0.2',
				netmask: '255.255.255.0',
				family: 'IPv4',
				mac: '[REDACTED]',
				internal: false
			},
			{
				address: '2a01:e35:2434:3030:12fe:edff:fe8c:328d',
				netmask: 'ffff:ffff:ffff:ffff::',
				family: 'IPv6',
				mac: '[REDACTED]',
				scopeid: 0,
				internal: false
			},
			{
				address: 'fe80::12fe:edff:fe8c:328d',
				netmask: 'ffff:ffff:ffff:ffff::',
				family: 'IPv6',
				mac: '[REDACTED]',
				scopeid: 3,
				internal: false
			}
		] 
	}
}
