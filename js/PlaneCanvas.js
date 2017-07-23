var PlaneCanvas = function(canvas, materialData, canvasData) {
	
	InteractiveCanvas.call(this, canvas, materialData, canvasData);
	
   	var that = this;
    var lbLabel, rtLabel;
    var updateLegendValues = function() {
	    	lbLabel.setValue(new Complex(this.center.re - this.scale, this.center.i - this.scale/this.aspect));
	    	rtLabel.setValue(new Complex(this.center.re + this.scale, this.center.i + this.scale/this.aspect));
    }
    this.createLegend = function () {
    	this.legend = new THREE.Group();

    	lbLabel = new PCLegendLabel();
    	rtLabel = new PCLegendLabel();
    	this.legend.add(lbLabel);
    	this.legend.add(rtLabel);
    	this.updateLegendPosition();
    	
    	this.scene.add(this.legend);
    }
    this.updateLegendPosition = function () {
    	if (this.configManager.getConfigValue("showLegend")){
	    	updateLegendValues.call(this);
	    	var hMax = this.camera.position.z*Math.tan(this.camera.fov*Math.PI/360);
	    	var h = 2*this.configManager.getConfigValue("legendMarkerSize")/this.canvas3d.height*hMax;
	    	var s = h/lbLabel.getHeight();
	    	lbLabel.scale.set(s, s, 1);
	    	lbLabel.position.set(-hMax*this.aspect+lbLabel.getWidth()*s/2, -hMax+lbLabel.getHeight()*s/2, 0);
	    	s = h/rtLabel.getHeight();
	    	rtLabel.scale.set(s, s, 1);
	    	rtLabel.position.set(hMax*this.aspect - rtLabel.getWidth()*s/2, hMax - rtLabel.getHeight()*s/2, 0);
	    	this.legend.position.z = 0.01;
	    	this.legend.visible = true;
    	} else {
    		this.legend.visible = false;
    	}

    };
	this.init(canvas, materialData, canvasData);
	this.somethingChanged = true;
	this.render();
	
   
    var dragging = false;
    var startCenter = null; 
    var startMousePos = null;
    console.log(this);
    this.handleMouseDown = function (event) {
        this.style.cursor = "crosshair";

    	startMousePos = {x: event.clientX, y: event.clientY};
    	startCenter = new Complex(that.center.re, that.center.i);
    	dragging = true;
    	
    }
    this.handleMouseUp = function (event) {
        that.canvas3d.style.cursor = "default";

    	if (dragging) {
    		move ({x: event.clientX, y: event.clientY});
    		that.dispatchTransformChangeEvent("move");

    	}
        dragging = false;
        startCenter = null; 
        startMousePos = null;
    	
    }
    this.handleMouseMove = function (event) {
    	if (dragging)
        	move ({x: event.clientX, y: event.clientY});

    }
    
    function move (newMousePos) {
    	var relDelta = {x: 2*(newMousePos.x - startMousePos.x)/that.canvas3d.width, y: -2*(newMousePos.y - startMousePos.y)/that.canvas3d.width/*sic*/};
    	var newCenter = new Complex(startCenter.re - relDelta.x*that.scale, startCenter.i - relDelta.y*that.scale);
    	that.setCenter(newCenter);
    }
    
    this.trnasformChanged = false;
    this.handleWheel = function (event) {
    	if (!that.transformChanged && event.deltaY) {
    		that.zoom(event.deltaY);
     	}
    }
    
    this.zoom = function (dir) {
		var s = that.scale *(1+PlaneCanvas.scaleStep*(dir > 0 ? 1 : -1));
		that.setScale(s);
    	
    }
    this.setScale = function (scale) {
    	
    	that.scale = scale;
		that.updateLegendPosition();
		that.transformChanged = true;
		that.dispatchTransformChangeEvent("scale");
    	
    }
    this.setCenter = function (newCenter) {
    	that.center = newCenter;
		that.updateLegendPosition();

    	that.transformChanged = true;
    	
    }
    
    this.canvas3d.onmousedown = this.handleMouseDown;
    document.addEventListener("mouseup", this.handleMouseUp);
    document.addEventListener("mousemove",this.handleMouseMove);
    this.canvas3d.onwheel = this.handleWheel;
    this.canvas3d.onmouseleave = function() {window.onwheel = null};
    this.canvas3d.onmouseenter = function() {window.onwheel = function() {return false}} 
    
    this.dispatchTransformChangeEvent = function (type) {
    	if(this.configManager.getConfigValue("reportTransform")) {
	    	type = type || "scale";
	    	this.canvas3d.dispatchEvent( new CustomEvent("transformChanged", {detail:{action: "updated", object: that.serverId, 
	    			data: that.getTransformData(type)}}));
    	}
    }
    this.getTransformData = function(type) {
    	var res = [];
    	function getConfigElement(key, value) {
    		var res = createEmptyNode("config");
    		res.setAttribute("key", key);
    		res.setAttribute("value", value);
    		return res;
    	}
    	var scaleEl = getConfigElement("scale", this.scale);
    	if (type == "scale") 
    		return scaleEl;
		res.push(
			getConfigElement("centerRe", this.center.re),
			getConfigElement("centerIm", this.center.i));
    	if (type == "move") {
    		return res;
    	}
    	res.push(scaleEl);
    	return res;
    }
    
    
    console.log(this.legend);


}

PlaneCanvas.internalWidth = 20;
PlaneCanvas.numSegments = 100;

PlaneCanvas.scaleStep = 0.05;

PlaneCanvas.prototype = Object.create(InteractiveCanvas.prototype);
var pp = PlaneCanvas.prototype;

pp.init = function (canvas, materialData, canvasData)	  {      			
	this.center = new Complex(this.configManager.getConfigValue("centerRe"), this.configManager.getConfigValue("centerIm"));
	this.scale = this.configManager.getConfigValue("scale");

	InteractiveCanvas.prototype.init.call(this, canvas, materialData, canvasData);
	this.setCameraPosition();
	this.plane = this.object;
	
	this.createLegend();

}

pp.getObjectGeometry = function () {
	return new THREE.PlaneBufferGeometry(PlaneCanvas.internalWidth, 
			PlaneCanvas.internalWidth/this.aspect, 
			PlaneCanvas.numSegments, PlaneCanvas.numSegments);
	
}

pp.setCameraPosition = function () {
	this.camera.position.z = 0.5*PlaneCanvas.internalWidth/(this.aspect*Math.tan((this.camera.fov*Math.PI/180)/2));
	
}


pp.getAttributeValues = function(posArr, i, res) {
   		if (!res) res = {};
   		res.c = new Complex(2*posArr.getX(i)*this.scale/PlaneCanvas.internalWidth + this.center.re, 
   				2*posArr.getY(i)*this.scale/PlaneCanvas.internalWidth + this.center.i);
   		res.scale = 0.5/this.scale;
   		return res;
}

pp.render = function () {
	if (this.transformChanged) {
		this.updateVertices();
    	this.transformChanged = false;
    	this.somethingChanged = true;

	}
	InteractiveCanvas.prototype.render.call(this);
}

pp.parseData = function (data) {
	InteractiveCanvas.prototype.parseData.call(this, data);
	if (this.configManager.getConfigValue("centerRe") != this.center.re || 
			this.configManager.getConfigValue("centerIm") != this.center.i) {
		this.setCenter(new Complex(this.configManager.getConfigValue("centerRe"), this.configManager.getConfigValue("centerIm")));
	} 
	if (this.configManager.getConfigValue("scale") != this.scale)
		this.setScale(this.configManager.getConfigValue("scale"));
}

pp.updateVertices = function () {
	if (this.object.material instanceof THREE.ShaderMaterial){
		this.updateComplexAttribute(this.object.geometry, 
				this.object.material.complexShaderMap);
	}
}

pp.onCanvasResize = function () {
	this.aspect = this.canvas3d.width/this.canvas3d.height;
	this.object.geometry = this.getObjectGeometry();
	this.setCameraPosition();
	this.updateVertices();
	InteractiveCanvas.prototype.onCanvasResize.call(this);
	
}

pp.getSnapshotElement = function() {
	var snapshotXMLObj = InteractiveCanvas.prototype.getSnapshotElement.call(this);
	if (!this.configManager.getConfigValue("reportImage")) {
		snapshotXMLObj.setAttribute("geometry", "plane");
		var trns = this.getTransformData();
		for (var i = 0; i < trns.length; i ++)
			snapshotXMLObj.appendChild(trns[i]);
	}
	return snapshotXMLObj;
};

var PCLegendLabel = function (message, style) {
	this.style = style || {};
	overloadStyle (PCLegendLabel.baseStyle, this.style); //defined in Legend.js
	overloadStyle (RSTextLabel.baseStyle, this.style);
	var canvas = document.createElement('canvas');
	var context = canvas.getContext('2d');
	
    var testString = RSTextLabel.longestString; //defined in PointMarkers.js
    for (var i = 0; i < this.style.precision; i ++)
    	testString += "00";
	context.font = this.style.fontSize + "px " + this.style.fontFace;
   
	var maxWidth = context.measureText( testString ).width;   
    var size2D =Math.pow(2, Math.ceil(Math.LOG2E*Math.log(maxWidth)));
    canvas.width = size2D;
    canvas.height = size2D/4;    	    
    var texture = new THREE.Texture(canvas);
	texture.needsUpdate = true;
	var cover = new THREE.MeshBasicMaterial({map: texture});
	cover.transparent = true;
	var shape = new THREE.PlaneBufferGeometry(canvas.width, canvas.height);
	
	THREE.Mesh.call(this, shape, cover);
	
	function updateTextImpl() {
		if (this.message != undefined) {
			context.clearRect(0, 0, canvas.width, canvas.height);
		    context.fillStyle = "rgba(0,0,0,0)";
		    context.fillRect(0, 0, canvas.width, canvas.height);

		    var w, h, textWidth;
			
			var message = this.message;
			var clr = new THREE.Color();
			clr.set(this.style.textColor);
			context.font = this.style.fontSize + "px " + this.style.fontFace;
		    var metrics = context.measureText( message );
		    textWidth = metrics.width;	
		    w = 2*this.style.hMargine + textWidth + 2.*this.style.borderThickness;
		    h = 2*this.style.vMargine + this.style.fontSize*1. + 2.*this.style.borderThickness;
    	    function makeRgbaString(color) {
    	    	return "rgba(" + color.r + "," + color.g + "," + color.b + "," + color.a +")"; 
    	    }
		    context.fillStyle = makeRgbaString(this.style.backgroundColor);
		    context.strokeStyle = makeRgbaString(this.style.borderColor);
		    context.lineWidth = this.style.borderThickness;
		    roundRect(context, (canvas.width - w)/2, (canvas.height - h)/2, w, h, this.style.hMargine/2);
	  	    context.fillStyle = "#" + clr.getHexString();
	   	    context.fillText( message, canvas.width/2 - textWidth/2, canvas.height/2 + this.style.fontSize*.5-this.style.hMargine/2);
	   	    this.material.map.needsUpdate = true;
	   	    this._w = w;
	   	    this._h = h;
			
		}
	}
	this.updateText = function (message) {
		this.message = message;
		updateTextImpl.call(this);
	}
	
	this.getWidth = function () {
		return this._w;
	}
	this.getHeight = function () {
		return this._h;
	}
	
}
PCLegendLabel.prototype = Object.create(THREE.Mesh.prototype);


PCLegendLabel.prototype.constructor = PCLegendLabel;
PCLegendLabel.prototype.setValue = function (c) {
	var msg;
	if (c instanceof Complex) {
		msg = c.toString(true, this.style.precision || 3);
	} else {
		msg = c;
	}
	this.updateText(msg);
		
}

PCLegendLabel.baseStyle = {};
PCLegendLabel.baseStyle.textColor = "white";
PCLegendLabel.baseStyle.backgroundColor = {r: 80, g: 80, b: 80, a: .8};
PCLegendLabel.baseStyle.borderColor = {r: 160, g: 160, b: 160, a: 1};
PCLegendLabel.baseStyle.align = "left";
PCLegendLabel.baseStyle.fontSize = 48;


			

		

