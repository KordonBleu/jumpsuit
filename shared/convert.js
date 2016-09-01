export function radToBrad(rad, precision) {
	return Math.round(rad/(2*Math.PI) * ((1 << precision*8) - 1));
}
export function bradToRad(brad, precision) {
	return brad/((1 << precision*8) - 1) * (2*Math.PI);
}

export * from '<@convert@>';
