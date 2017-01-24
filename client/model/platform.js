export const isMobile = navigator.userAgent.match(/(?:Android)|(?:webOS)|(?:iPhone)|(?:iPad)|(?:iPod)|(?:BlackBerry)|(?:Windows Phone)/i),
	isUnsupported = !navigator.userAgent.match(/(?:Firefox)|(?:Chrome)/i);
