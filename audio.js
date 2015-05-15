music = document.getElementById("music");
music.play();
music.addEventListener("ended", function() {
	this.currentTime = 14.992;//
	this.play();
});

audioIcon = document.getElementById("audio-icon");
audioIcon.addEventListener("click", function() {
	if(audioIcon.getAttribute('src') === "assets/images/Speaker_Icon.svg") {
		audioIcon.src = "assets/images/Mute_Icon.svg";
		music.pause();
	} else {
		audioIcon.src = "assets/images/Speaker_Icon.svg";
		music.play();
	}
});
