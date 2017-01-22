export const urlSafeChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~!$&\'()*+,;=:@'; // https://tools.ietf.org/html/rfc3986#section-3.3

export function encodeUint(lobbyNb) {
	let upperDigit = Math.trunc(lobbyNb/urlSafeChars.length),
		lobbyCode = urlSafeChars.charAt(lobbyNb%urlSafeChars.length);

	if (upperDigit === 0) return lobbyCode;
	else return encodeUint(upperDigit) + lobbyCode;
}
export function decodeUint(lobbyCode) {
	let lobbyNb = 0;

	for (let i = 0; i !== lobbyCode.length; ++i) lobbyNb += Math.pow(urlSafeChars.length, lobbyCode.length - i -1) * urlSafeChars.indexOf(lobbyCode.charAt(i));

	return lobbyNb;
}
