var PlaneCanvasContainer = function (domElement, surfaceData, canvasData, idArg) {
	this.canvasData = canvasData || {};
	this.configManager = new ConfigManager(canvasData);
	
	this.canvasWidth = this.configManager.getConfigValue("width") || 600;
	this.canvasHeight = this.configManager.getConfigValue("height") || 600;
	this.canvasData.configManager = this.configManager;

	var that = this;
	console.log("creating canvas container", idArg);

	this.updateCanvas = function (configObj) {
		console.log("updateCanvas", configObj);
		
		if (configObj.width) {
			this.canvasWidth = configObj.width;
			var cellWidth = this.canvasWidth;
			mainCanvas.setAttribute("width", this.canvasWidth.toString());
			canvasCell.setAttribute("width", cellWidth.toString());
			tbl.setAttribute("width", cellWidth.toString());
		}
		if (configObj.height) {
			this.canvasHeight = configObj.height;
			mainCanvas.setAttribute("height", this.canvasHeight.toString());
		}
		if (configObj.width || configObj.height) {this.rsCanvas.onCanvasResize();}
	};
	
	if (document.icautoID === undefined) document.icautoID = 0;
	
	if (this.canvasData.name) {
		var headLine = document.createElement("h2");
		headLine.innerHTML = this.canvasData.name;
		domElement.appendChild(headLine);
	}
	
	var tbl = document.createElement("table");
	domElement.appendChild(tbl);
	//tbl.setAttribute("border", "1");

	var canvasCell = document.createElement("td");
	tbl.appendChild(document.createElement("tr").appendChild(canvasCell));
	var cellWidth = this.canvasWidth;
	canvasCell.setAttribute("width", cellWidth.toString()+"px");
	//canvasCell.setAttribute("colspan", "4");
	tbl.setAttribute("width", cellWidth);

	var mainCanvas = document.createElement("canvas");
	mainCanvas.setAttribute("width", this.canvasWidth.toString());
	mainCanvas.setAttribute("height", this.canvasHeight.toString());
	if (this.canvasData.name) mainCanvas.setAttribute("name", this.canvasData.name);
	mainCanvas.setAttribute("id", "canvas3d" + (document.icautoID++));
	canvasCell.appendChild(mainCanvas);

	this.rsCanvas = new PlaneCanvas(mainCanvas, surfaceData, this.canvasData);
	
	this.rsCanvas.rsCanvasId = idArg || ("rsCanvas" + document.icautoID++);
	if (domElement.hasAttribute("id")) this.rsCanvas.serverId = domElement.getAttribute("id");

	
	this.render = function() {
		requestAnimationFrame(that.render);
		that.rsCanvas.render();
	};
	
	this.render();


}

PlaneCanvasContainer.prototype = {
		constructor: PlaneCanvasContainer,
		rsCanvas: {}
}
