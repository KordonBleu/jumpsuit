const canvas = document.getElementById('canvas');

export let windowBox = new vinage.Rectangle(new vinage.Point(null, null), canvas.clientWidth, canvas.clientHeight), // these parameters will be overwritten later
	universe = new vinage.Rectangle(new vinage.Point(0, 0), null, null), // these parameters will be overwritten later
	players = [],
	planets = [],
	enemies = [],
	shots = [],
	deadShots = [];
