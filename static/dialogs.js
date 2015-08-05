var dialog = new function(){
	var dialogElement = document.getElementById("dialog"),
		textElement = document.getElementById("dialog-text"),
		buttonConfirm = document.getElementById("dialog-confirm"),
		buttonAbort = document.getElementById("dialog-abort"),
		_callback;

	textElement.addEventListener("input", function(){
		console.log("asd");
		buttonConfirm.disabled = (textElement.value === "");
	});

	textElement.addEventListener("keydown", function(e){
		textElement.maxLength = 40;
		if (e.key === "Enter" || convertToKey(e.keyCode) === "Enter"){
			dialog.close(textElement.value);
		}
	});
	buttonConfirm.addEventListener("click", function(){
		dialog.close(textElement.value);
	});
	buttonAbort.addEventListener("click", function(){
		dialog.close();
	});
	this.show = function(callback){
		_callback = callback;
		textElement.value = "";
		dialogElement.className = "";
	}
	this.close = function(result){
		dialogElement.className = "hidden";
		if (typeof result !== "undefined" && result !== "") _callback(result);		
	}
};