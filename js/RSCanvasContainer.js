//Copyright (c) Anna Alekseeva 2013-2017
//TODO ВСЁ ПЕРЕДЕЛАТЬ!!!
var RSCanvasContainer = function (domElement, surfaceData, canvasData, idArg) {
	this.canvasData = canvasData || {};
	this.configManager = new ConfigManager(canvasData);
	
	this.canvasWidth = this.configManager.getConfigValue("width") || 600;
	this.canvasHeight = this.configManager.getConfigValue("height") || 600;
	this.canvasData.configManager = this.configManager;
	//this.canvasData.bkgColor = this.configManager.getConfigValue("bkgColor");
	var that = this;
	console.log("creating canvas container", idArg);

	this.changeShowGrid = function (event) {
		that.rsCanvas.showGridChanged = true;
		that.rsCanvas.showGrid = showGrid.checked;
		that.rsCanvas.showAbsGrid = showAbsGrid.checked;
		that.rsCanvas.showLabels = showLabels.checked;
		that.rsCanvas.showDynamicGrid = showDynamicGrid.checked;
		that.rsCanvas.showAbsDynamicGrid = showAbsDynamicGrid.checked;
		if (showGrid.checked) 
			showDynamicGrid.removeAttribute("disabled")
		else 			showDynamicGrid.setAttribute("disabled", "disabled");

		if (showAbsGrid.checked) 
			showAbsDynamicGrid.removeAttribute("disabled")
		else 			showAbsDynamicGrid.setAttribute("disabled", "disabled");
		for (var f in that.rsCanvas) {
			if (that.rsCanvas.hasOwnProperty(f) && (f.slice(0, 4).toLowerCase()=="show" 
					&& (f.slice(-4).toLowerCase() == "grid" 
						|| f.slice(-6).toLowerCase() == "labels")))
				that.configManager.setConfigValue(f, that.rsCanvas[f], true);
		}
	};
	this.changeShowArcs = function (event) {
		that.rsCanvas.showArcs = showArcs.checked;
		that.rsCanvas.showArcsChanged = true;
		that.configManager.setConfigValue("showArcs", showArcs.checked);
	}
	
	this.collectData = function (event) {
		if (event) event.preventDefault();
		//that.rsCanvas.saveSnapshotToFile((that.rsCanvas.canvas3d.name || that.rsCanvas.rsCanvasId || that.rsCanvas.canvas3d.id) + "_data.txt");
		var str = that.rsCanvas.getSnapshot();
		var evt=new CustomEvent("SnapshotSaved", {data: str,  __exposedProps__ : { data : "r"}});
		evt.data = str;
		console.log("snapshot saved", str, evt, evt.data);
		that.rsCanvas.canvas3d.dispatchEvent(evt);


		};
	this.clearDrawing = function (event) {
		that.rsCanvas.clearDrawing();
	};
	this.resetTransform = function (event) {
		that.rsCanvas.resetTransform();
	};
	this.removeAnchors = function (event) {
		that.rsCanvas.hideAnchors();
	};
	
	this.getConfigValue = function(key) {
		return this.configManager.getConfigValue(key);
	}
	
	this.copyImage = function(event) {
		console.log("copy image");
		that.rsCanvas.somethingChanged = true;
		that.rsCanvas.render();
		var imgData = that.rsCanvas.canvas3d.toDataURL();
		var imgTag = document.createElement("img");
		imgTag.setAttribute("src", imgData);
		domElement.appendChild(imgTag);
	}
	this.fillBitmap = function(event) {
		console.log("fill bitmap");
		var c = document.getElementById("testBitmapCanvas");
		if (c) {
			c.parentNode.removeChild(c);
		}
		var tr = that.rsCanvas.getTransform();
		var dataURL = getTestImageData(tr);
		var dataObject = new BitmapFillData(dataURL, tr, "test");
		that.rsCanvas.updateSphereMaterial(dataObject);
		that.rsCanvas.somethingChanged = true;
		
		that.rsCanvas.canvas3d.addEventListener("transformChanged", that.fillBitmapContinue);
	}
	
	this.fillBitmapContinue = function (event) {
			var c = document.getElementById("testBitmapCanvas");
			if (c) {
				c.parentNode.removeChild(c);
			}
		if (that.rsCanvas.sphere.material.name == "test") {
			var tr = that.rsCanvas.getTransform();
			var dataURL = getTestImageData(tr);
			var dataObject = new BitmapFillData(dataURL, tr, "test");
			that.rsCanvas.updateSphereMaterial(dataObject);
			that.rsCanvas.somethingChanged = true;
			
		} else {
			that.rsCanvas.canvas3d.removeEventListener("transformChanged", this.fillBitmapContinue);
			
		}
	}
	
	
	this.updateCanvas = function (configObj) {
		console.log("updateCanvas", configObj);
		
		if (configObj.width) {
			this.canvasWidth = configObj.width;
			var cellWidth = this.canvasWidth;// + 12;
			mainCanvas.setAttribute("width", this.canvasWidth.toString());
			canvasCell.setAttribute("width", cellWidth.toString());
			tbl.setAttribute("width", cellWidth.toString());
		}
		if (configObj.height) {
			this.canvasHeight = configObj.height;
			mainCanvas.setAttribute("height", this.canvasHeight.toString());
		}
		if (configObj.width || configObj.height) {this.rsCanvas.onCanvasResize();}
		var showGridChanged = false;
		var showArcsChanged = false;
		for (var f in configObj){
			if (configObj.hasOwnProperty(f)){
				if (f.slice(0, 4).toLowerCase()=="show") { 
					if (f.slice(-4).toLowerCase() == "grid" 
						|| f.slice(-6).toLowerCase() == "labels"){
						showGridChanged = true;
					}
					else if (f.slice(-4).toLowerCase()== "arcs") {
						showArcsChanged = true;
					}
					if (showControls[f]) showControls[f].checked = configObj[f];
				}
				
			}
		}
		if (showGridChanged) this.changeShowGrid();
		if (showArcsChanged) this.changeShowArcs();
	
	};
	
	
	//var autoId = 0;
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
	canvasCell.setAttribute("colspan", "4");
	tbl.setAttribute("width", cellWidth);

	var mainCanvas = document.createElement("canvas");
	mainCanvas.setAttribute("width", this.canvasWidth.toString());
	mainCanvas.setAttribute("height", this.canvasHeight.toString());
	if (this.canvasData.name) mainCanvas.setAttribute("name", this.canvasData.name);
	mainCanvas.setAttribute("id", "canvas3d" + (document.icautoID++));
	canvasCell.appendChild(mainCanvas);

	
	var controlsRow = document.createElement("tr");
	tbl.appendChild(controlsRow);
	var td01 = document.createElement("td");
	td01.setAttribute("width", "40%");
	td01.setAttribute("valign", "top");
	td01.appendChild(document.createTextNode("Grid and labels"));
	var hideGLControlsBtn = addButton(td01, "\u25B4", hideGLControls, "hide_gl_btn", true);
	var showGLControlsBtn = addButton(td01, "\u25BE", showGLControls, "show_gl_btn", true);
	var td1 = document.createElement("div");
	td01.appendChild(td1);
	td1.setAttribute("id", "show_grid_controls");
	var showControls = {};//object to store references for controls to access by names
	
	var showGrid = addInput(td1, "checkbox", InterfaceNames.SHOW_RE_IM_GRID, "change", this.changeShowGrid);
	showControls.showGrid = showGrid;
	if (this.configManager.getConfigValue("showGrid"))
		showGrid.setAttribute("checked", "checked");
	td1.appendChild(document.createElement("br"));
	td1.appendChild(document.createTextNode("\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0"));
	var showDynamicGrid = addInput(td1, "checkbox", InterfaceNames.SHOW_DYN_GRID, "change", this.changeShowGrid);
	showControls.showDynamicGrid = showDynamicGrid;
	if (!showGrid.checked) 
		showDynamicGrid.setAttribute("disabled", "disabled");
	if (this.configManager.getConfigValue("showDynamicGrid"))
		showDynamicGrid.setAttribute("checked", "checked");
	td1.appendChild(document.createElement("br"));
	var showAbsGrid = addInput(td1, "checkbox", InterfaceNames.SHOW_ABS_GRID, "change", this.changeShowGrid);
	showControls.showAbsGrid = showAbsGrid;
	if (this.configManager.getConfigValue("showAbsGrid"))
		showAbsGrid.setAttribute("checked", "checked");
	td1.appendChild(document.createElement("br"));
	td1.appendChild(document.createTextNode("\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0"));
	var showAbsDynamicGrid = addInput(td1, "checkbox", InterfaceNames.SHOW_DYN_GRID, "change", this.changeShowGrid);
	if (!showAbsGrid.checked) 
		showAbsDynamicGrid.setAttribute("disabled", "disabled");
	if (this.configManager.getConfigValue("showAbsDynamicGrid"))
		showAbsDynamicGrid.setAttribute("checked", "checked");
	td1.appendChild(document.createElement("br"));
	var showLabels = addInput(td1, "checkbox", InterfaceNames.SHOW_LABELS, "change", this.changeShowGrid);
	showControls.showLabels = showLabels;
	if (this.configManager.getConfigValue("showLabels"))
		showLabels.setAttribute("checked", "checked");
	var td2 = document.createElement("td");
	td2.setAttribute("valign", "top");
	//addButton(td2, InterfaceNames.SUBMIT, this.collectData);
	//td2.appendChild(document.createElement("br"));
	//addButton(td2, InterfaceNames.CLEAR_DRAWING, this.clearDrawing);
	var td3 = document.createElement("td");
	addButton(td3, InterfaceNames.RESET_TRANSFORM, this.resetTransform);
	//td3.appendChild(document.createElement("br"));
	addButton(td2, InterfaceNames.CLEAR_REFPOINTS, this.removeAnchors);
	td3.setAttribute("valign", "top");
	var td4 = document.createElement("td");
	var showArcs = addInput(td4, "checkbox", InterfaceNames.SHOW_ARCS, "change", this.changeShowArcs);
	showControls.showArcs = showArcs;
	if (this.configManager.getConfigValue("showArcs"))
		showArcs.setAttribute("checked", "checked");
	td4.setAttribute("width", "20%");
	td4.setAttribute("valign", "top");
	
	var td5 = document.createElement("td");
	//addButton(td5, "Copy image", this.copyImage);
	addButton(td5, "Fill bitmap", this.fillBitmap);
	
	controlsRow.appendChild(td01);
	if (DEBUG > 0) controlsRow.appendChild(td5);
	else controlsRow.appendChild(td4);
	controlsRow.appendChild(td3);
	controlsRow.appendChild(td2);
	//controlsRow.appendChild(td4);
	
	
	hideGLControls();
	
	this.rsCanvas = new RSCanvas(mainCanvas, surfaceData, this.canvasData);
	this.rsCanvas.showGrid = showGrid.checked;
	this.rsCanvas.showLabels = showLabels.checked;
	this.rsCanvas.showGridChanged = true;
	this.rsCanvas.showArcs = showArcs.checked;
	this.rsCanvas.showArcsChanged = true;
	
	this.rsCanvas.rsCanvasId = idArg || ("rsCanvas" + document.icautoID++);
	if (domElement.hasAttribute("id")) this.rsCanvas.serverId = domElement.getAttribute("id");
	
	
	function addInput(domElement, type, text, event, handler, idarg) {
		var res = document.createElement("input");
		res.setAttribute("type", type);
		var id = idarg || type + (document.icautoID++) + idArg;
		res.setAttribute("id", id);
		domElement.appendChild(res);
		if (type.toLowerCase() == "button") {
			res.setAttribute("value", text);
		} else {
			var lbl = document.createElement("label");
			domElement.appendChild(lbl);
			if (type.toLowerCase() == "file") {
				res.setAttribute("style", "display:none");
				lbl.setAttribute("style", "appearance: button; -webkit-appearance: button;  -moz-appearance: button;");
				lbl.innerHTML = text;
			} else {
				lbl.appendChild(document.createTextNode(text));
			}
			lbl.setAttribute("for", id);
			
		}

		res.addEventListener(event, handler, true);
		return res;	
	}
	
	function addButton(domElement, text, clickHandler, id, inline) {
		var btn = addInput(domElement, "button", text, "click", clickHandler);
		//btn.onclick = clickHandler;
		//console.log("addButton", btn, clickHandler);
		if (!inline) btn.setAttribute("style", "width: 100%");
		return btn;
	}
	function showGLControls() {setGLControlsVisible(true);};
	function hideGLControls() {setGLControlsVisible(false);};
	function setGLControlsVisible (value) {
		showElement(td1, value, true);
		showElement(hideGLControlsBtn, value);
		showElement(showGLControlsBtn, !value);
	}
	function showElement(element, val, block) {
		element.style.display = val? (block ? "block" : "inline") : "none";
	}
	
	this.render = function() {
		requestAnimationFrame(that.render);
		that.rsCanvas.render();
	};
	
	this.render();
	
	
	
}
//console.log("RSCanvasContainer", RSCanvasContainer);

RSCanvasContainer.prototype = {
		constructor: RSCanvasContainer,
		rsCanvas: {}
}
