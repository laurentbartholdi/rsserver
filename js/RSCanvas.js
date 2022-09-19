//Copyright (c) Anna Alekseeva 2013-2017

var RSCanvas = function(canvas, materialData, canvasData) {
	
	//------------------privileged methods---------------------------------
	//------------------event handlers-------------------------------------
	InteractiveCanvas.call(this, canvas, materialData, canvasData);
	this.onCanvasResize = function () {
		this.camera.position.z = RSCanvas.CAMERA_DISTANCE*Math.max(1, this.canvas3d.height/this.canvas3d.width);
		InteractiveCanvas.prototype.onCanvasResize.call(this);
	};
    this.handleMouseDown = function(event) {
        mouseDown = true;
        this.style.cursor = "crosshair";
        var canvasPos = UIU.getMousePos(that.canvas3d, event);
        var its = that.converter.getIntersects(canvasPos);

        if (its.length) {
        	var sphere_index = -1;
        	for (var i = 0; i < its.length; i++) {
         		if (its[i].object == that.sphere) {
        			sphere_index = i;
        			break;
        		}
        	}

        	if (sphere_index >= 0 && event.ctrlKey && isRightButton(event)) {
    	    	curMouseLocalPos = that.converter.canvasPosToLocal(canvasPos);
    	    	drawingOnTheSphere = true;
    		    vectorStartDraw(curMouseLocalPos);
        	} else {
        		var marker_index = -1;
        		var curMarker = null;
        		for (var j = 0; j < (sphere_index >= 0 ? sphere_index : its.length); j++) {
        			if (its[j].object.marker && !its[j].object.marker.fixed) {
        				marker_index = j;
        				curMarker = its[j].object.marker;
        				break;
        			}
        		}
        		if ((sphere_index >= 0 && marker_index < 0)|| 
	        			(marker_index >= 0 && (transformAnchorsValues.length == 1 && curMarker.numInArray !== undefined))) {
	    	        startRotWorldMousePos = that.converter.canvasPosToWorld(canvasPos);
	    	        startRotLocalMousePos = curMouseLocalPos.clone();
	    	        startRotQuaternion.copy(that.sphere.quaternion);
	    	        rotating = true;
	        	} else if (marker_index >= 0 && curMarker.numInArray === undefined) {
	        		movingSelectedPoint = curMarker;
	        	}
	        	if (marker_index >= 0 && transformAnchorsValues.length > 1) {
	        		that.oldTransform = that.currentTransform.copy();
	        		movingAnchor = curMarker.numInArray;
	        	}
        	}
        		
        }

    },
     this.handleDoubleClick = function(event) {	
    	//Preventing text selection, the default double-click behavior in some browsers
    	if (window.getSelection)
            window.getSelection().removeAllRanges();
        else if (document.selection)
            document.selection.empty();
    	//-----------------------------------------------
    	var dblclickPos = UIU.getMousePos(that.canvas3d, event);
    	var its = that.converter.getIntersects(dblclickPos);
    	if (its.length) {
    		if (its[0].object.marker) {
    			removeAnchor (its[0].object.marker, {ui: true});
    			
    			
    		} else {
    			for (var i = 0; i < its.length; i ++) {
    				if (its[i].object == that.sphere) {
		    			if (event.shiftKey) {
		    				addSelectedPointAnchor(that.sphere.worldToLocal(its[i].point), {ui: true});
		    			} else {
		    				addAnchor(dblclickPos);
		    			}
    					break;
    				}
    			}
    		}
    	}
    };
    
    function isRightButton(event) {
   		//check if right mouse button pressed
	    var isRightMB;
	    event = event || window.event;

	    if ("which" in event)  // Gecko (Firefox), WebKit (Safari/Chrome) & Opera
	        isRightMB = event.which == 3; 
	    else if ("button" in event)  // IE, Opera 
	        isRightMB = event.button == 2; 
	    
	    return isRightMB;

    }
    
    this.oldTransform = MoebiusTransform.identity;
    newLinesData = [];
    this.handleMouseUp = function(event) {
        mouseDown = false;
        if (drawingOnTheSphere) {
        	if (that.curDrawedLineData) {
        		newLinesData.push(that.curDrawedLineData);
        	}
        	
        }
        drawingOnTheSphere = false;
		
        if (event.ctrlKey && !isRightButton(event)) {
        	if (newLinesData.length) {
        		newLinesData.pop();
        		that.deleteLastDrawing(true);
        	} else that.deleteLastDrawing(false);
        }
	
        
        if (rotating && rotationChanged && that.configManager.getConfigValue("reportRotation") && movingAnchor < 0) {
        	that.canvas3d.dispatchEvent(new CustomEvent("rotationChanged", {detail: {data: that.getRotationElement(), object: that.serverId, ui: true}}));
        }
        rotating = false;
        rotationChanged = false;//prevents dispatching an event when the sphere was not actually rotated
       if(movingAnchor >= 0 && that.configManager.getConfigValue("reportTransform")) {
            	that.canvas3d.dispatchEvent(new CustomEvent("transformChanged", {detail: {data: that.getTransformElement(), object: that.serverId, ui: true}}));       		
        	}
        movingAnchor = -1;
        if (movingSelectedPoint) { 
        	if( movingSelectedPoint.numInArray === undefined){
	        	for (var i = 0; i < selectedPointsData.length; i++)
	        		if (selectedPointsData[i].anchor == movingSelectedPoint) {
	        				that.canvas3d.dispatchEvent( new CustomEvent("selectedPointsChanged", 
	        						{detail: {action: "updated", 
	        							object: that.serverId,
	        							data: that.getSnapshotObjectElement("point", selectedPointsData[i]),
	        							ui: true}}));
	        		}
        	} 
        }
        movingSelectedPoint = null;   
        that.canvas3d.style.cursor = "default";
    };

    this.handleKeyUp = function (event) {
     	if (event.keyCode == 17) { //Ctrl
           if (drawingOnTheSphere || newLinesData.length) {
            	if (that.curDrawedLineData) {
            		newLinesData.push(that.curDrawedLineData);
            	var eventData = [];
            	while (newLinesData.length) {
            		eventData.push(that.getSnapshotObjectElement("line", newLinesData.shift()));
            	}
            	if (eventData.length)
            		that.canvas3d.dispatchEvent( new CustomEvent("linesChanged", 
    					{detail: {action: "created", 
    						object: that.serverId,
    						data: eventData,
    						ui: true}}));
            	}
            	
            }
            drawingOnTheSphere = false;
    	}
    }

    this.handleMouseMove = function(event) {
        if (!mouseDown) {
            return;
         
       } else {
        	var canvasPos = UIU.getMousePos(that.canvas3d, event);
    	    var newWorldMousePos = that.converter.canvasPosToWorld(canvasPos);
        	if (newWorldMousePos && newWorldMousePos.distanceTo(curWorldMousePos) > vectorChangeBarrier) {
        		curWorldMousePos.copy(newWorldMousePos);
        		curMouseLocalPos = that.sphere.worldToLocal(newWorldMousePos);
        		mouseMoved = true;
        	}
        }
    };
    this.isMovingSelectedPoint = function( ) {return movingSelectedPoint != null }
    //------------------end event handlers------------------------------------
    
	
	this.render = function() {
		if (!this.inited) return;
		var sphereMoved = false;
		if (mouseMoved) {
			if (rotating) performRotation();
			if (drawingOnTheSphere) vectorDrawTo(curMouseLocalPos);
			if (movingAnchor >= 0) {
				//It seems, after optimizing of three.js there is no need 
				//to hide dynamic grid and arcs when transforming the sphere, it works fast
				//showArcs(false);
				this.drawArcs();

				//this.grid.hideGrid();
				this.updateTransform();
				
			}
			if (movingSelectedPoint) {
				movingSelectedPoint.setPosition(curMouseLocalPos);
				this.grid.checkLabelCollisions(movingSelectedPoint);
			}
			if (rotating || this.transformUpdated){
				sphereMoved = true;
			}
			mouseMoved = false;
			this.somethingChanged = true;
		} else {
			if (this.arcsNeedUpdate) {
				this.drawArcs();
				this.somethingChanged = true;
				this.arcsNeedUpdate = false;
			}
			if ((this.showGrid || this.showLabels || this.showAbsGrid) && this.gridNeedUpdate) {
				this.grid.updateGrid();
				this.somethingChanged = true;
				this.gridNeedUpdate = false;
			}
		}
		if ( this.showGridChanged) {
			
			this.grid.updateGrid();
			for (var i = 0; i < selectedPointsAnchors.length; i++) {
				this.grid.checkLabelCollisions(selectedPointsAnchors[i]);
			}
			this.somethingChanged = true;
			this.showGridChanged = false;
			
		} else if ((this.showGrid || this.showLabels || this.showAbsGrid) && this.transformUpdated) {
			this.grid.updateGrid(true);
			this.somethingChanged = true;
		}
		if (this.showArcsChanged) {
			showArcs();
			this.somethingChanged = true;
			this.showArcsChanged = false;
		}

		if (this.transformUpdated) {
			if (this.sphere.material instanceof THREE.ShaderMaterial){
				this.updateComplexAttribute(this.sphere.geometry, 
						this.sphere.material.complexShaderMap);
			} else if (this.sphere.material.map) {
				var tr;
				if (this.sphere.material.baseTransform instanceof MoebiusTransform)
					tr = this.currentTransform.superpos(this.sphere.material.baseTransform.invert());
				else tr = this.currentTransform.copy();
				if (this.sphere.material.mappingType == "stereo") {
					this.chooseStereoTexture(true);
				} else {
					this.updateCustomUVs (this.sphere.geometry, this.getUV, {transform: tr, mapping: this.sphere.material.mappingType});
				}
			}
			updateAnchors();
			transformDrawings();
			this.transformUpdated = false;
			this.linesUpdated = false;
			this.arcsNeedUpdate = true;
			this.gridNeedUpdate = true;
			this.somethingChanged = true;
		}
		
		if (this.linesUpdated ) {
			transformDrawings();
			this.linesUpdated = false;
			this.somethingChanged = true;
		}

		InteractiveCanvas.prototype.render.call(this);

		
	}
	var curObjectID = 0;
	this.getNewObjectID = function(type) {
		var res = "";
		if (this.serverId) res = this.serverId;
		else if (this.rsCanvasId) res = this.rsCanvasId;
		res += "UI" + type + (curObjectID++);
		return res;
	}
	
	function getPointById(id) {
		var ptsData = that.getSelectedPointsData();
		var res = null;
		for (var i = 0; i < ptsData.length; i++){
			if (ptsData[i].id == id) {
				res = ptsData[i];
			};				
		}
		return res;
	}
	
	this.removeObject = function (id) {
		var pt = getPointById(id);
		if (pt) {
			removeAnchor(pt.anchor);
			return true;
		}
		var drw = this.getDrawings();
		for (var i = 0; i < drw.length; i++) {
			if (drw[i].id == id) {
				removeDrawing(i);
				return true
			};
		}
		for (var i = 0; i < this.arcStyles.length; i++){
			if (this.arcStyles[i].id == id) {
				removeArc(i);
				return true};
		}
		return false;
	}
	
	this.getObjectInfo = function (id) {
		var ptsData = this.getSelectedPointsData();
		for (var i = 0; i < ptsData.length; i++){
			if (ptsData[i].id == id) {				
				return this.getSnapshotObjectElement("point", ptsData[i]);
			};				
		}
		var drw = this.getDrawings();
		for (var i = 0; i < drw.length; i++) {
			if (drw[i].id == id) {return this.getSnapshotObjectElement("line", drw[i]);};
		}
		for (var i = 0; i < this.arcStyles.length; i++){
			if (this.arcStyles[i].id == id) {return this.getSnapshotObjectElement("arc", this.arcStyles[i]);};
		}
		return false;
		
	}
	
	this.updatePoint = function (dataNode) {
		
		var point = getPointById(dataNode.getAttribute("object"));
		if (point) {
			var updated = false;
			var cn = dataNode.getElementsByTagName("cn")[0];
			var sp = dataNode.getElementsByTagName("sp")[0];
			var lbl = dataNode.getElementsByTagName("label")[0]
			if (lbl) {
				var text = "empty";
				var labelType = lbl.getAttribute("type");
				if (labelType) {
					switch (labelType) {
					case "text": {
						if (lbl.childNodes[0]) {
							point.anchor.noLabel = false;
							point.anchor.showValue = false;
							text = lbl.childNodes[0].nodeValue;
						}
						else console.warn("No text in a label of type \"text\"", lbl);
						break;
					}
					case "number": {
						text = "";
						point.anchor.noLabel = false;
						point.anchor.showValue = true;
						if (point.message) delete point.message;
						break;
					}
					case "none": {
						point.anchor.noLabel = true;
						break;
					}
					}
				}
				else if (lbl.childNodes[0]) text = lbl.childNodes[0].nodeValue;
				if (text) point.message = text;
				point.anchor.updateLabelText(text);
				updated = true;
			}
			if (cn || sp){
				var value = cn ? Complex.fromXML(cn) : CU.localToComplex(this.converter.xmlSPToLocal(sp));
				point.anchor.setValue(value);
				updated = true;
			}
			var configs = dataNode.getElementsByTagName("config");
			if (configs.length > 0) {
				var updateStyle = false;
				for (var j = 0; j < configs.length; j++){
					var key = configs[j].getAttribute("key");
					var value = configs[j].getAttribute("value");
					if (key == "movable") {
						value = ConfigManager.parseBool(value);
						point.movable = value;
						point.anchor.fixed = !value;
					}
					if (key == "color") {
						value = ConfigManager.parseColor(value);
						getLabelTextColors(value, point);
						updateStyle = true;
					}
					if (key == "radius") {
						value = parseFloat(value);
						point.pointerSize = value;
						updateStyle = true;
					}
				}
				if (updateStyle) {
					point.anchor.updateStyle(point);
					updated = true;
				}
			}
			if (updated) {
				this.somethingChanged = true;
				this.canvas3d.dispatchEvent(new CustomEvent("selectedPointsChanged", {detail: {action: "updated", 
					object: this.serverId,
					data: this.getSnapshotObjectElement("point", point)}}));
			}
			return updated;
		} else {
			return false;
		}
	}
	
	this.updateArc = function (dataNode) {
		var arcStyle, arc; 
		var id = dataNode.getAttribute("object");
		for (var i = 0; i < this.arcStyles.length; i++){
			if (this.arcStyles[i].id == id) {
				arcStyle = this.arcStyles[i];
				arc = this.arcs[i];
			};
		}

		if (arc) {
			var updated = false;
			var configs = dataNode.getElementsByTagName("config");
			var eventData = createEmptyNode("arc");
			if (configs.length > 0) {
				for (var j = 0; j < configs.length; j++){
					var key = configs[j].getAttribute("key");
					var value = configs[j].getAttribute("value");
					if (key == "color") {
						eventData.setAttribute("color", value);
						value = ConfigManager.parseColor(value);
						arcStyle.color = value;
						arc.material.color.set(value);
						updated = true;
					}
					if (key == "width") {
						eventData.setAttribute("width", value);
						value = parseFloat(value);
						arcStyle.width = value;
						arc.material.linewidth = value;
						updated = true;
					}
				}
			}
			if (updated) {
				arc.material.needsUpdate = true;
				this.somethingChanged = true;
				this.canvas3d.dispatchEvent(new CustomEvent("arcsChanged", {detail:{action: "updated", object: this.serverId, data: eventData}}));
			}
			return updated;
		} else {
			return false;
		}
		
	}


	
	//------------private vars-------------------------------------------
	var mouseDown = false;
	var mouseMoved = false; 
	var lastMouseX = null;
	var lastMouseY = null;
	
	var rotating = false;
	var movingAnchor = -1;
	
	var movingSelectedPoint = null;
	
	var curMouseLocalPos = new THREE.Vector3();
	var curWorldMousePos = new THREE.Vector3();
	var startRotWorldMousePos = new THREE.Vector3();
	var startRotLocalMousePos = new THREE.Vector3();
	var startRotMatrix = new THREE.Matrix4();
	var startRotQuaternion = new THREE.Quaternion();
	var vectorChangeBarrier = 0.01;
	var rotQuaternion = new THREE.Quaternion();
	
	
	
	var transformAnchors = [];
	var transformAnchorsValues = [];
	
	//When an object is created, addNewElement is called and information 
	//about created object is stored in newElements until readNewElements is called
	var newElements = [];
	this.addNewElement = function (node) {newElements.push(node)}
	this.readNewElements = function () {
		var res = [];
		while(newElements.length > 0)
			res.push(newElements.shift());
		return res;
	}
	

	//------------end private vars---------------------------------------
	//------------private methods----------------------------------------
	//---------------grid------------------------------------------------
	this.createGrid = function () {
		this.grid.createGrid();
	};
	function updateGrid() {
		this.grid.updateGrid();
	};
	//---------------end grid------------------------------------------
	//--------Legend------------------
	this.createLegend = function () {
		this.legend = new Legend();
		this.updateLegendPosition();
		this.scene.add(this.legend);
	}
	
	this.updateLegendPosition = function () {
		if (this.configManager.getConfigValue("showLegend")){

			var delta = 6; 
			var screenMarkerSize = this.configManager.getConfigValue("legendMarkerSize");
			var z = this.camera.position.z;
			var tgphi = Math.tan(this.camera.fov/2*Math.PI/180);
			var lw = this.legend.getWidth();
			var lh = this.legend.getHeight();
			var la = lw/lh;
			var r = this.canvas3d.height/2/tgphi*RSCanvas.SPHERE_RADIUS/Math.sqrt(z*z - RSCanvas.SPHERE_RADIUS*RSCanvas.SPHERE_RADIUS);//screen radius of the sphere
			var W_ = this.canvas3d.width/2 - delta;
			var H_ = this.canvas3d.height/2 - delta;
			var maxH;
			if ((r + la*H_) < W_) {maxH = Math.min(2*H_, (W_-r)/la);}
			else if ((r + W_/la) < H_) {maxH = Math.min(H_- r, 2*W_/la);}
			else {
				var la2 = 1+la*la;
				maxH = (H_+la*W_ - Math.sqrt(la2*r*r-Math.pow(W_-la*H_, 2)))/la2;
			}
			var zh = Math.max(lh/maxH, this.legend.style.markerSize/screenMarkerSize)*0.5*this.canvas3d.height/tgphi;
			var align = this.configManager.getConfigValue("legendPosition");
			this.legend.position.z = -zh+z;
			this.legend.position.y = align.charAt(1) == "t" ? -(2*delta/this.canvas3d.height - 1)*zh*tgphi : (2*delta/this.canvas3d.height - 1)*zh*tgphi+lh;
			this.legend.position.x = align.charAt(0) == "l" ? -(this.camera.aspect - 2*delta/this.canvas3d.height)*zh*tgphi : (this.camera.aspect - 2*delta/this.canvas3d.height)*zh*tgphi;
			this.legend.updateStyle({align: align.charAt(0) == "l" ? "left" : "right", textColor: this.configManager.getConfigValue("legendTextColor")});
			this.legend.visible = true;
		} else this.legend.visible = false;
	}
	//---------------end legend
	//---------transform anchors---------------------------------------
	this.createTransformAnchors = function() {
	    for (var i = 0; i < 3; i++) {
	    	var p = new DiamondMarker(new Complex(), this);
	    	transformAnchors.push(p);
	    	p.numInArray = i;
	    	p.hide();
	    }

	};
	//----------end transform anchors----------------------------------
	
	//-------------drawings--------------------------------------------
	var drawingOnTheSphere = false;

	var curLineVertices = [];
	var lastDrawingLine = null;
	var nextDrawingLineIndex = 0;
	var lastVertex = new THREE.Vector3();
	var curDrawingVertexIndex = 0;
	var maxDrawingBufferSize = 1000; 
	var lineOverTheSphere = 1.001;//1.01;
	var minCircleSegments = 24;
	var drawedLines = [];
	
	//Arrays of Complex
	this.drawedLinesData = [];
	this.curDrawedLineData = [];
	
	this.arcStyles = [];
	this.arcsData = [];
	this.arcsNum = 0;
	this.arcs = [];
	this.arcsNeedUpdate = false;
	this.resetArcs = function() {
		this.arcStyles = [];
		this.arcsData = [];
		this.arcsNum = 0;
		for (var i = 0; i < this.arcs.length; i++) {
			this.arcs[i].visible = false;
		}
		this.somethingChanged = true;
	};
	var arcVerticesBufferSize = 2*Math.ceil(Math.PI/Math.sqrt(lineOverTheSphere*lineOverTheSphere-1));
	
	this.drawArcs = function() {
		while (that.arcsData.length > that.arcs.length){
			createNewArc();
		}
		for (var i = 0; i < that.arcsData.length; i++){
			var a = that.arcs[i];
			a.material.color = that.arcStyles[i].color;
			a.material.linewidth = that.arcStyles[i].width;
			a.material.needsUpdate = true;
			that.arcStyles[i].data = that.arcsData[i];
			curDrawingVertexIndex = 1;
			if (this.currentTransform.isIdentity() && that.arcStyles[i].type != "transform"){
				a.geometry.vertices[0] = that.arcsData[i][0].clone().multiplyScalar(lineOverTheSphere);
				for (var j = 1; j < that.arcsData[i].length; j++) {
					smartDrawImpl(that.arcsData[i][j-1], that.arcsData[i][j], a);
				}
			} else {
				//TODO make an arc with a circle geometry
				var tData = [];
				for (var j = 0; j < that.arcsData[i].length; j++) {
					tData.push(CU.transformVector(that.arcsData[i][j], 
						this.currentTransform));
				}
				var vStart = tData[0];
				a.geometry.vertices[0] = vStart.clone().multiplyScalar(lineOverTheSphere);
				var circleData = GridLine.getCenterRadius(tData);
				circleData.circleCenter.multiplyScalar(RSCanvas.SPHERE_RADIUS);
				circleData.radius *= RSCanvas.SPHERE_RADIUS;
				var saveData = getSaveDrawArcData(tData, circleData.circleCenter, circleData.radius);
				for (var j = 1; j < saveData.length; j++) {
					smartDrawImpl(saveData[j-1], saveData[j], a, circleData.circleCenter, circleData.radius);
				}
				
				
			}
			for (var j = curDrawingVertexIndex; j < arcVerticesBufferSize; j++){
				a.geometry.vertices[j].set(0, 0, 0);
			}
			a.geometry.verticesNeedUpdate = true;
			
		}
		showArcs();
		
	}
	function removeArc(index) {
		that.arcsData.splice(index, 1);
		that.sphere.remove(that.arcs.splice(index, 1)[0]);
		that.canvas3d.dispatchEvent(new CustomEvent("arcsChanged", {detail:{action: "removed", object: that.arcStyles.splice(index, 1)[0].id}}));
		that.arcsNeedUpdate = true;
		that.somethingChanged = true;
	}
	
	function removeDrawing(index, silent) {
		var data = that.drawedLinesData.splice(index, 1)[0];
		if (data && data.id) {
			var i = 0;
			while (i < drawedLines.length) {
				if (drawedLines[i].dataId == data.id) {
					var ln = drawedLines.splice(i, 1)[0];
					that.sphere.remove(ln);
				} else i++;
			}
			if (!silent) that.canvas3d.dispatchEvent(new CustomEvent("linesChanged", {detail:{action: "removed", object: data.id}}));
			that.linesUpdated = true;
		}
	}
	function showArcs( arg ) {
		var val = (arg == undefined ? that.showArcs:arg);
		for (var i = 0; i < that.arcsData.length; i++) {
			that.arcs[i].visible = val;
		}
		for (var i = that.arcsData.length; i < that.arcs.length; i++){
			that.arcs[i].visible = false;
		}
		
	}
	function getMid(v1, v2, center, radius) {
		var v = (new THREE.Vector3()).addVectors(v1, v2).multiplyScalar(.5);
		if (center) {
			v.sub(center).setLength(radius).add(center);
		} else {
			v.setLength(v1.length());
		}
		return v;
	}
	function getSaveDrawArcData(startData, center, radius) {
		if (startData.length < 3) {
			consol.warn ("Invalid arc data");
			return;
		}
		var res = [startData[0]];
		if (startData[0].equals(startData[startData.length-1])) {
			res.push(startData[1]);
			var mid = getMid (startData[1], startData[startData.length-1], center, radius);
			if (center ) {
				mid.multiplyScalar(.5).sub(center).multiplyScalar(2);
			} else {
				mid.negate();
			}
		} else {
			var m = getMid(startData[0], startData[startData.length-1], center, radius);
			if (m.distanceTo(startData[0]) < m.distanceTo(startData[1])) {
				if (center) {
					m.multiplyScalar(-.5).add(center).multiplyScalar(2);
				}
				else {
					m.negate();
				}
			}
			res.push(m);
			
		}
		res.push(startData[startData.length - 1]);	
		return res;
	}
	var curArcVertex = 0;
	var curArc = null;
	function setArcVertex(pos) {
		if (curArc) {
			curArc.geomtery.vertices[++curArcVertex];
		}
	}
	function createNewArc(){

		var geometry = new THREE.Geometry();
		while (geometry.vertices.length < arcVerticesBufferSize){
			geometry.vertices.push(new THREE.Vector3());
			
		}
		var arc = new THREE.Line(geometry, new THREE.LineBasicMaterial());
		that.arcs.push(arc);
		that.sphere.add(arc);
	}
	
	
	function vectorStartDraw(pos) {
			that.curDrawedLineData = [CU.localToComplex(pos, that.currentTransform)];
			that.curDrawedLineData.id = that.getNewObjectID("line");
			that.drawedLinesData.push(that.curDrawedLineData);
			startDrawImpl(pos, that.curDrawedLineData.id);
		
	}
	function startDrawImpl(pos, idArg) {
		if (nextDrawedLineIndex < drawedLines.length) {
			lastDrawingLine = drawedLines[nextDrawedLineIndex];
			lastDrawingLine.geometry.vertices[0]=pos.clone().multiplyScalar(lineOverTheSphere);
		}
		else {
			lastDrawingLine = new THREE.Line(new THREE.Geometry(), 
					//new THREE.LineBasicMaterial({color: RSCanvas.drawingColor}));
					new THREE.LineBasicMaterial({color: that.configManager.getConfigValue("lineColor"), 
						linewidth: that.configManager.getConfigValue("lineWidth")}));
			drawedLines.push(lastDrawingLine);
			lastDrawingLine.geometry.vertices.push(pos.clone().multiplyScalar(lineOverTheSphere));
			while (lastDrawingLine.geometry.vertices.length < maxDrawingBufferSize)
				lastDrawingLine.geometry.vertices.push(new THREE.Vector3());
			that.sphere.add(lastDrawingLine);
			
		}
		lastDrawingLine.dataId = idArg;
		nextDrawedLineIndex ++;
		curDrawingVertexIndex = 1;
		lastVertex = pos.clone();
		
	}

	function vectorDrawTo(pos, fromData) {
		if (pos.distanceTo(lastVertex) > 0.1) {
			smartDrawImpl(lastVertex, pos);
			if (!fromData) {
				that.curDrawedLineData.push(CU.localToComplex(pos, that.currentTransform));
			};
		}
	}
	this.clearDrawing = function(dontClearData) {//seems not in use any more
		if (this.sphere.material.map) {
			drawTexture(textureCanvas.getContext("2d"), 2*textureSize, textureSize);
			this.sphere.material.map.needsUpdate = true;
		}
		for (var j = 0; j < drawedLines.length; j++) {
			this.sphere.remove(drawedLines[j]);
			
			//drawedLines[j].dispose();
		}
		drawedLines = [];
		nextDrawedLineIndex = 0;
		if (!dontClearData) {
			for (var i = 0; i < this.drawedLinesData.length; i ++)
				this.canvas3d.dispatchEvent(new CustomEvent("linesChanged", {detail: {action: "removed", object:this.drawedLinesData[i].id}}));
			this.curDrawedLineData = [];
			this.drawedLinesData = [];
			
		}
		//drawedLinesData = [];
		
		this.somethingChanged = true;
	};
	this.deleteLastDrawing = function (silent) {
		var l = this.drawedLinesData.length;
		if (l > 0) removeDrawing(l-1, silent);
	}
	
	function resetDrawing() {
		var v0 = new THREE.Vector3();
		for (var l = 0; l < drawedLines.length; l++) {
			for (var j = 0; j < maxDrawingBufferSize; j++) 
				drawedLines[l].geometry.vertices[j] = v0;
			drawedLines[l].geometry.verticesNeedUpdate = true;
			//drawedLines[l].geometry.buffersNeedUpdate = true;
			
		}
		nextDrawedLineIndex = 0;
		lastDrawedLine = null;
	}
	
	function transformDrawings() {
		resetDrawing();
		var p0 = new THREE.Vector3(), pnext = new THREE.Vector3();
		for (var i = 0; i < that.drawedLinesData.length; i++) {
			p0 = CU.complexToLocalNormalized(that.drawedLinesData[i][0], that.currentTransform).multiplyScalar(RSCanvas.SPHERE_RADIUS);
			startDrawImpl(p0, that.drawedLinesData.id);
			for (var j = 1; j < that.drawedLinesData[i].length; j++) {
				pnext = CU.complexToLocalNormalized(that.drawedLinesData[i][j], that.currentTransform).multiplyScalar(RSCanvas.SPHERE_RADIUS);
				smartDrawImpl(p0, pnext);
				p0 = pnext;
			}
		}
		for (var l = 0; l < drawedLines.length; l++) {
			drawedLines[l].geometry.verticesNeedUpdate = true;
		}
	};
	var maxSegmentLength = 2*RSCanvas.SPHERE_RADIUS*Math.sqrt(lineOverTheSphere*lineOverTheSphere-1);
	function smartDrawImpl (p1, p2, obj_, center, radius) {
		var obj = obj_ || lastDrawingLine;
		var curMaxSegment = (radius ? Math.min(maxSegmentLength, 2*Math.PI*radius/minCircleSegments) : maxSegmentLength);
		if (p1.distanceTo(p2) < curMaxSegment) {
			drawToImpl(p2, obj);
		} else {
			var p0 = getMid(p1, p2, center, radius);
			smartDrawImpl(p1, p0, obj, center, radius);
			smartDrawImpl(p0, p2, obj, center, radius);
		}
	}
	function drawToImpl (pos, obj) {
		obj.geometry.vertices[curDrawingVertexIndex++] = 
		pos.clone().multiplyScalar(lineOverTheSphere);
		if (obj == lastDrawingLine) lastVertex = pos;
		obj.geometry.verticesNeedUpdate = true;
		obj.geometry.buffersNeedUpdate = true;
		obj.visible = true;
		if (curDrawingVertexIndex >= maxDrawingBufferSize) {startDrawImpl(pos, obj.dataId);}
	}
	


	//-------------end drawings----------------------------------------
	
	//------------rotation---------------------------------------------
	var rotAxis = new THREE.Vector3();
	var rotAngle;
	var rotationChanged = false;
	function performRotation() {
		rotAxis.crossVectors(startRotWorldMousePos, curWorldMousePos);
		rotAxis.normalize();
		rotAngle = curWorldMousePos.angleTo(startRotWorldMousePos);
		rotQuaternion.setFromAxisAngle(rotAxis, rotAngle);
		that.sphere.quaternion.multiplyQuaternions(rotQuaternion, startRotQuaternion);
		rotationChanged = true;//resets in handleMouseUp;
		//console.log(this);
		that.chooseStereoTexture();
		
	}
	//--------------end rotation----------------------------------------

	//-------------Moebius transformations---------------------------
	this.updateTransform = function() {
		if (transformAnchorsValues.length < 2) return;
		if (movingAnchor === undefined || !transformAnchors[movingAnchor]) return;
		transformAnchors[movingAnchor].moveTo(curMouseLocalPos);
		var zs = [];
		var ws = [];
		for (var i = 0; i < transformAnchorsValues.length; i++) {
			ws.push(transformAnchors[i].value);
			zs.push(transformAnchors[i].baseValue);
		}
		if (transformAnchorsValues.length == 2) {
			var j = movingAnchor == 0 ? 1 : 0;
			ws.push(transformAnchors[j].oppositeValue);
			zs.push(transformAnchors[j].oppositeBaseValue);
		}
		this.currentTransform = MoebiusTransform.byInitEndVectors(zs, ws);
		//updateTextUI();
		
		this.transformUpdated = true;
	};
	this.resetTransform = function() {
		this.currentTransform = MoebiusTransform.identity;
	    if(this.configManager.getConfigValue("reportTransform")) {
           	that.canvas3d.dispatchEvent(new CustomEvent("transformChanged", {detail: {data: this.getTransformElement(), object: this.serverId}}));       		
       	}
		this.transformUpdated = true;
	};
	function addAnchor (canvasPos) {
		var transformAnchorsNum = transformAnchorsValues.length;
		var pm = transformAnchorsNum < 3 ? transformAnchors[transformAnchorsNum] :transformAnchors[2];
		pm.show();
		pm.setPosition(that.converter.canvasPosToLocal(canvasPos));
		if (transformAnchorsNum < 3) {
			transformAnchorsValues.push(pm.value);
			transformAnchorsNum ++;
		} else {
			transformAnchorsValues[2] = pm.value;
		}
		that.somethingChanged = true;
		
	}
	
	var selectedPointsAnchors = [];
	var selectedPointsData = [];
	
	function addSelectedPointAnchor (pos, pars) {
		var spa; 
		var firstHiddenPointIndex = -1;
		var selectedPointsCount = 0;
		for (var i = 0; i < selectedPointsAnchors.length; i++) {
			if (selectedPointsAnchors[i].hidden) {
				firstHiddenPointIndex = i;
				
			} else {selectedPointsCount ++;}
		}
		if ((that.selectedPointsLimit == undefined || that.selectedPointsLimit < 0) || selectedPointsCount < that.selectedPointsLimit) {
			if (firstHiddenPointIndex >= 0 && (!pars || pars.ui)) {
				spa = selectedPointsAnchors[firstHiddenPointIndex];
				spa.show();
				spa.setPosition(pos);
			}  else {
				if (pars && !pars.ui) {
					var argParameters = {};
					if (pars.color) {
						if (pars.color.substr(0, 2) == "0x") pars.color = "#" + pars.color.substr(2-pars.color.length, pars.color.length-2);
						var c = new THREE.Color(pars.color);
						getLabelTextColors(c, argParameters);
					}
					if (pars.radius) argParameters.pointerSize = parseFloat(pars.radius);
					if (pars.message) argParameters.message = pars.message;
					//By default, when there is no "movable" attribute, if a point has given label it's not movable, otherwise it's movable. 
					if ((pars.hasOwnProperty("movable") && (pars.movable == "false" || pars.movable == "0" || pars.movable.toLowerCase() == "no" ||(!pars.movable)))
							|| (!pars.hasOwnProperty("movable") && pars.hasOwnProperty("message")))
						spa = new RSTextLabel(pos, that, argParameters);
					else spa = new RSTextLabelMoveable(pos, that, argParameters);
				} 
				else spa = new RSTextLabelMoveable(pos, that);
				selectedPointsAnchors.push(spa);
				spa.show();
			}
			if (!pars) pars = {};
			if (!pars.id) pars.id = that.getNewObjectID("point");
			pars.anchor = spa;
			selectedPointsData.push(pars);
			that.addNewElement(that.getSnapshotObjectElement("point", pars));

			if (!that.muteChangeSelectedPointsEvent)
				that.canvas3d.dispatchEvent( new CustomEvent("selectedPointsChanged", {detail: {action: "created", object: that.serverId, data: that.readNewElements(), ui: pars.ui}}));
			that.grid.checkLabelCollisions(spa);

		}
		that.somethingChanged = true;
	}
	function getLabelTextColors(c, res) {
		if (!res) res = {}
		res.pointerColor = c;
		var bc = new THREE.Color(0, 0, 0);
		bc.lerp(c, 0.3);
		res.backgroundColor = {r: Math.round(bc.r*255), g: Math.round(bc.g*255),b: Math.round(bc.b*255), a: .8 };
		bc.set("#ffffff");
		bc.lerp(c, 0.3);
		res.textColor = {r: Math.round(bc.r*255), g: Math.round(bc.g*255),b: Math.round(bc.b*255), a: 1. };
		bc.lerp(c, 0.3);
		res.borderColor = {r: Math.round(bc.r*255), g: Math.round(bc.g*255),b: Math.round(bc.b*255), a: 1. };
		return res;
	}
	function removeAnchor (pm, params) {
		if (pm.numInArray !== undefined) {
			var na = pm.numInArray;
			transformAnchorsValues.splice(na, 1);
			var i = -1;
			while (++i < transformAnchorsValues.length) {
				pm = transformAnchors[i];
				pm.show();
				pm.setValue(transformAnchorsValues[i]);
			}
			while (i < 3) {
				transformAnchors[i++].hide();
			}
		} else {
			pm.hide();
			var curId = "";
			for (var j = 0; j < selectedPointsData.length; j++)
				if (selectedPointsData[j].anchor == pm) {
					curId = selectedPointsData[j].id;
					selectedPointsData.splice(j--, 1);
				}
			if (curId) {
				var ui = false;
				if (params && params.ui) ui = true;
				that.canvas3d.dispatchEvent( new CustomEvent("selectedPointsChanged", {detail: {action: "removed", object: curId, ui: ui}}));
			}

			
		}
		that.somethingChanged = true;

	}

	function updateAnchors() {
		for (var i = 0; i < transformAnchorsValues.length; i++) {
			transformAnchors[i].setValue(transformAnchorsValues[i]);
		}
		for (var j = 0; j < selectedPointsAnchors.length; j++) {
			if (!selectedPointsAnchors[j].hidden) {
				selectedPointsAnchors[j].updatePosition();
			}
		}
		this.somethingChanged = true;
	}
	this.hideAnchors = function() {
		transformAnchorsValues = [];
		for (var i = 0; i<3; i++)
			transformAnchors[i].hide();
		this.somethingChanged = true;
	}
	//--------------End Moebius transformation--------------------------
	//----------------bitmap material----------------------------------
	this.updateMaterialMap = function(dataStructure) {
		this.sphere.material.complexTextureImage.update(this, dataStructure);
		this.sphere.material.map = 
			new THREE.Texture(this.sphere.material.complexTextureImage.textureCanvas);
		this.sphere.material.map.needsUpdate = true;
		
	}
	
	//------------end private methods-----------------------------------

	                		this.addSelectedPoint= function(z, pars) {
	                				var exists = false;
	                			for (var i = 0; i < selectedPointsAnchors.length; i++){
	                				if (!selectedPointsAnchors[i].hidden && 
	                						(selectedPointsAnchors[i].value.equals(z))){
	                					exists = true;
	                					
	                				}
	                			}
	                			if (!exists || pars) 
	                				addSelectedPointAnchor(CU.complexToLocalNormalized(z, this.currentTransform).multiplyScalar(RSCanvas.SPHERE_RADIUS), pars);
	                		};
	                		this.muteChangeSelectedPointsEvent = false;
	                		this.addSelectedPoints= function(zs, pars) {
	                			for (var i = 0; i < zs.length; i++){
	                				this.muteChangeSelectedPointsEvent = (i < zs.length - 1);
	                				if (pars) this.addSelectedPoint(zs[i], pars[i])
	                				else this.addSelectedPoint(zs[i]);
	                			}
	                		};
	                		this.setNewSelectedPoints = function(zs) {
	                			this.muteChangeSelectedPointsEvent = true;
	                			this.removeAllSelectedPoints();
	                			this.addSelectedPoints(zs);
	                			
	                		};
	                		this.removeAllSelectedPoints = function() {
	                			var l = selectedPointsAnchors.length;
	                			selectedPointsData = [];
	                			for (var i = 0; i < l; i++) {
	                				selectedPointsAnchors[i].hide();
	                			}
	                			if (l > 0 && !this.muteChangeSelectedPointsEvent) 
	                				this.canvas3d.dispatchEvent( new CustomEvent("selectedPointsChanged"));
	                		};
	                		this.getSelectedPoints = function() {
	                			var res = [];
	                			for (var i = 0; i < selectedPointsAnchors.length; i++){
	                				if (!selectedPointsAnchors[i].hidden) res.push(selectedPointsAnchors[i].value);
	                			}
	                			return res;
	                		};
	                		this.getSelectedPointsData = function() {
	                			return selectedPointsData.slice(0);
	                		}
	                		this.checkSelectedPointsGridLabelsCollisions = function() {
	                			for (var i = 0; i < selectedPointsAnchors.length; i++) {
	                				if (!selectedPointsAnchors[i].hidden) 
	                					this.grid.checkLabelCollisions(selectedPointsAnchors[i]);
	                			}
	                		}
    
    //-----------initial function calls---------------------------
	var that = this;
	this.init(canvas, materialData, canvasData);
	
    this.canvas3d.onmousedown = that.handleMouseDown;
    this.canvas3d.ondblclick = that.handleDoubleClick;
    this.canvas3d.oncontextmenu=function () {return false;};
    //?????
    document.addEventListener("mouseup", this.handleMouseUp);
    document.addEventListener("mousemove",this.handleMouseMove);
    document.body.onkeyup = that.handleKeyUp;

	this.render();

	
};
//static vars
RSCanvas.SPHERE_RADIUS = 20;
RSCanvas.CAMERA_DISTANCE = 60;


RSCanvas.prototype = Object.create(InteractiveCanvas.prototype);
var rp = RSCanvas.prototype;

//--public functions----------------
//constructor: RSCanvas,
rp.constructor = RSCanvas;
rp.init = function(canvas, materialData, canvasData) {
	console.log(this);
	
	var lblm = new RSCanvas.LabelManager(this);
	InteractiveCanvas.prototype.init.call(this, canvas, materialData, canvasData);
	this.sphere = this.object;
	this.sphere.rotation.x = 2.21;
	this.sphere.rotation.y = 0;
	this.sphere.rotation.z = 0.68;
	
	this.camera.position.z = RSCanvas.CAMERA_DISTANCE*Math.max(1, this.canvas3d.height/this.canvas3d.width);

    this.converter = new RSCanvas.PointConverter(this);
	this.showGrid = this.configManager.getConfigValue("showGrid");
	this.showLabels = this.configManager.getConfigValue("showLabels");
	this.showAbsGrid = this.configManager.getConfigValue("showAbsGrid");
	this.showDynamicGrid = this.configManager.getConfigValue("showDynamicGrid");
	this.showAbsDynamicGrid = this.configManager.getConfigValue("showAbsDynamicGrid");
    this.grid = new Grid(this);
    this.createGrid();
    this.createTransformAnchors();
    this.createLegend();
};

rp.getObjectGeometry = function () {
	//var g = new THREE.SphereGeometry(RSCanvas.SPHERE_RADIUS, 64 , 64);
	//return new THREE.BufferGeometry().fromGeometry( g );
	return new THREE.SphereBufferGeometry(RSCanvas.SPHERE_RADIUS, RSCanvas.WIDTH_SEGMENTS , RSCanvas.HEIGHT_SEGMENTS);
	
}

RSCanvas.WIDTH_SEGMENTS = 128;
RSCanvas.HEIGHT_SEGMENTS = 128;
RSCanvas.TEXTURE_COVER_SIZE = 2;

rp.deltaU = .5/RSCanvas.WIDTH_SEGMENTS;
rp.deltaV = .5/RSCanvas.HEIGHT_SEGMENTS;

rp.getUV = function (x, y, z, params) {
	var pos = new THREE.Vector3(x, y, z);
	params = params || {};
	var surfaceTransform = params.transform || MoebiusTransform.identity;
	var c = CU.localToComplex (pos, surfaceTransform);
	var uv = {};
	if (params.mapping == "stereo") {
		uv.u = Math.max(Math.min(1, 0.5*(1+ c.re/RSCanvas.TEXTURE_COVER_SIZE)), 0);
		uv.v = Math.max(Math.min(1, 0.5*(1+ c.i/RSCanvas.TEXTURE_COVER_SIZE)), 0);
		//console.log(x, y, z, c.re, c.i, uv.u, uv.v);
	} else {
		//console.log("inside", params);
		var sph = CU.projectToSphere(c);
		var uv = CU.sphericalToUV(sph);
	}
	return uv;
};


rp.setTransform = function(transform) {
	this.oldTransform = this.currentTransform.copy();

	this.currentTransform = transform.copy();
		//console.log(this.currentTransform.toString(), this.currentTransform.getDistance(this.oldTransform), this.oldTransform.getDistance(this.currentTransform));
	this.updateTransform();
    if(this.configManager.getConfigValue("reportTransform")) {
    	this.canvas3d.dispatchEvent(new CustomEvent("transformChanged", {detail: {data: this.getTransformElement(), object: this.serverId}}));       		
	}

	this.transformUpdated = true;
	this.somethingChanged = true;
};
rp.getTransform = function() {
	return this.currentTransform.copy();
};
rp.getDrawings = function() {
	var res = [];
	for (var i = 0; i < this.drawedLinesData.length; i++){
		res[i] = this.drawedLinesData[i].slice(0);
		if (this.drawedLinesData[i].hasOwnProperty("id")) res[i].id = this.drawedLinesData[i].id;
	}
	return res;
};



rp.getSnapshotElement = function() {
	var snapshotXMLObj = InteractiveCanvas.prototype.getSnapshotElement.call(this);
	if (!this.configManager.getConfigValue("reportImage")) {
		snapshotXMLObj.setAttribute("geometry", "sphere");
		snapshotXMLObj.appendChild(this.getRotationElement());
		
		snapshotXMLObj.appendChild(this.getTransformElement());

		var ptsData = this.getSelectedPointsData();
		for (var i = 0; i < ptsData.length; i++) {
			snapshotXMLObj.appendChild(this.getSnapshotObjectElement("point", ptsData[i]));
		}
		var drw = this.getDrawings();
		for (var i = 0; i < drw.length; i++) {
			snapshotXMLObj.appendChild(this.getSnapshotObjectElement("line", drw[i]));
		}
		for (var i = 0; i < this.arcStyles.length; i++) {
			snapshotXMLObj.appendChild(this.getSnapshotObjectElement("arc", this.arcStyles[i]));
		}
	}
	return snapshotXMLObj;
};
rp.getRotationElement = function() {
	var rotEl = createEmptyNode("rotation");
	rotEl.setAttribute("x", this.sphere.rotation.x);
	rotEl.setAttribute("y", this.sphere.rotation.y);
	rotEl.setAttribute("z", this.sphere.rotation.z);
	rotEl.setAttribute("order", this.sphere.rotation.order);
	return rotEl;
	
};
rp.getTransformElement = function() {
	var transformEl = createEmptyNode("transform");
	transformEl.appendChild(this.currentTransform.a.toXMLObj());
	transformEl.appendChild(this.currentTransform.b.toXMLObj());
	transformEl.appendChild(this.currentTransform.c.toXMLObj());
	transformEl.appendChild(this.currentTransform.d.toXMLObj());
	return transformEl;
	
};
rp.getSnapshotObjectElement = function (type, data) {
	var el = createEmptyNode(type);
	if (!data) console.error("Invalid snapshot argument", type, data);
	else {
		if (data.hasOwnProperty("id")) el.setAttribute("id", data.id);
		if (this.serverId) el.setAttribute("canvas", this.serverId);
		switch (type) {
			case "point": return this.getSnapshotPointElement(data, el); break;
			case "line": return this.getSnapshotLineElement(data, el); break;
			case "arc": return this.getSnapshotArcElement(data, el); break;
			default: console.error("Unknow element type", type);
		}
	}
};

rp.getSnapshotPointElement = function(data, pntEl){
	pntEl.appendChild(data.anchor.value.toXMLObj());
	var lbl = createEmptyNode("label");
	if (data.message) {
		lbl.appendChild(document.createTextNode(data.message));	
		lbl.setAttribute("type", "text");
	}
	if (data.anchor.showValue) lbl.setAttribute("type", "number");
	if (data.anchor.noLabel) lbl.setAttribute("type", "none");
	pntEl.appendChild(lbl);
	
	if (data.color) pntEl.setAttribute("color", data.color);
	if (data.radius) pntEl.setAttribute("radius", data.radius);
	if (data.hasOwnProperty("movable")) pntEl.setAttribute("movable", data.movable);

	return pntEl;
	
};

rp.getSnapshotLineElement = function(data, el) {
	for (var j = 0; j < data.length; j++ ) {
		el.appendChild(data[j].toXMLObj());
	}
	return el;
	
};

rp.getSnapshotArcElement = function (data, el) {
	function getSpElement(vector) {
		var spEl = createEmptyNode("sp");
		var v = vector.clone().normalize();
		spEl.setAttribute("x", v.x);
		spEl.setAttribute("y", v.y);
		spEl.setAttribute("z", v.z);
		return spEl;
	}
	el.setAttribute("color", "#" + data.color.getHexString());
	el.setAttribute("width", data.width);
	if (Array.isArray(data.data))
		for (var j = 0; j < data.data.length; j++)
			el.appendChild(getSpElement(data.data[j]));
	return el;
};

rp.saveSnapshotToFile = function(name) {
	var str=this.getSnapshot();
	//https://github.com/eligrey/FileSaver.js
	var filename = name || "data.txt";
	//if (filename.indexOf(".") == -1) filename += ".txt";
	saveAs (new Blob([str], {type: "text/plain;charset=utf-8"}), filename);
};
rp.hasObject = function (id) {
	var ptsData = this.getSelectedPointsData();
	for (var i = 0; i < ptsData.length; i++){
		if (ptsData[i].id == id) return "point";				
	}
	var drw = this.getDrawings();
	for (var i = 0; i < drw.length; i++) {
		if (drw[i].id == id) return "line";
	}
	for (var i = 0; i < this.arcStyles.length; i++){
		if (this.arcStyles[i].id == id) return "arc";
	}
	return false;
};

rp.parseData = function(data) {
	console.log("parse data", data, DATA_IN_XML);
	data = InteractiveCanvas.prototype.parseData.call(this, data);
	var transformParsed = false;
	var pointsParsed = false;
	var linesParsed = false;
	var rotationParsed = false;
	var arcsParsed = false;
	
	var transformData = data.getElementsByTagName("transform")[0];
	if (transformData && transformData.parentNode.nodeName == "downdata") {
		var new_transform = MoebiusTransform.fromXML(transformData);
		this.setTransform(new_transform);
		transformParsed = true;
		console.log("transform", new_transform.toString());
	}
	
	var pointsData = data.getElementsByTagName("point");
	if (pointsData && pointsData.length > 0) {
		var pts = [];
		var params = [];
		function readAttribute(name,  i) {
			var val = pointsData[i].getAttribute(name);
			if (val) {
				if (!params[i]) params[i] = {};
				params[i][name] = val;
			}
		}
		for (var i = 0; i < pointsData.length; i++) {
			var cnNode = pointsData[i].getElementsByTagName("cn")[0];
			var spNode = pointsData[i].getElementsByTagName("sp")[0];
			if (!cnNode && !spNode) console.error("Data error. 'Point' node must contain either 'cn' or 'sp' child", pointsData[i]);
			else if (cnNode) pts.push(Complex.fromXML(cnNode));
			else pts.push(CU.localToComplex(this.converter.xmlSPToLocal(spNode)));
			params[i] = {};
			var label = pointsData[i].getElementsByTagName("label")[0];
			if (label) {
				var labelType = label.getAttribute("type");
				if (labelType) {
					switch (labelType) {
					case "text" : {
						if (label.childNodes[0]) {
							params[i].message = label.childNodes[0].nodeValue;
						} else {
							console.warn("No text inside a label of type \"text\"", label);
						}
						break;
					}
					case "number" : {
						break;
					}
					case "none" : {
						params[i].message = "empty";
						break;
					}
					default: 
						console.warn("Incorrect label type", labelType);
					}
				}
				else if (label.childNodes[0]) {
					params[i].message = label.childNodes[0].nodeValue;
				}
			}
			readAttribute("color", i);
			readAttribute("radius", i);
			readAttribute("movable", i);
			readAttribute("id", i);
		}
		this.addSelectedPoints(pts, params);
		pointsParsed = true;
		console.log("points", pts, params);
		
	}
	
	var rotationData = data.getElementsByTagName("rotation")[0];
	if (rotationData) {
		if (!rotationData.hasAttributes()) console.error("Data error. 'rotation' node has no attributes", rotationData);
		else {
			var rotArgs = { x: parseFloat(rotationData.attributes.x.nodeValue),
					y:parseFloat(rotationData.attributes.y.nodeValue),
					z: parseFloat(rotationData.attributes.z.nodeValue),
					order: rotationData.attributes.order.nodeValue.toUpperCase()
					};
			
			if (isNaN(rotArgs.x) || isNaN(rotArgs.y) || isNaN(rotArgs.z)) console.error("Data error. Invalide 'rotation' attributes", rotArgs);
			else {
				var rot = new THREE.Euler( rotArgs.x, rotArgs.y, rotArgs.z, rotArgs.order );
				var q = new THREE.Quaternion();
				q.setFromEuler(rot);
				this.sphere.quaternion.copy(q);
				this.somethingChanged = true;
				rotationParsed = true;
				console.log("Rotataion", rot, this.sphere.quaternion.x, this.sphere.quaternion.y,this.sphere.quaternion.z,this.sphere.quaternion.w, q.x, q.y, q.z, q.w);
				
			}
		}
		
		
	}
	var linesData = data.getElementsByTagName("line");
	if (linesData && linesData.length > 0) {
		for (var i = 0; i < linesData.length; i++) {
			var newLine = [];
			for (var j = 0; j < linesData[i].childNodes.length; j++) {
				if (linesData[i].childNodes[j].nodeName == "cn" ){
					newLine.push(Complex.fromXML (linesData[i].childNodes[j]));
				}
			}
			if (linesData[i].getAttribute("id")) newLine.id = linesData[i].getAttribute("id");
			else newLine.id = this.getNewObjectID("line");
			this.drawedLinesData.push(newLine);
		}
		console.log("lines parsed", this.drawedLinesData);
		linesParsed = true;
		this.linesUpdated = true;
		var l = linesData.length;
		while(l > 0){
			this.addNewElement(this.getSnapshotObjectElement("line", this.drawedLinesData[this.drawedLinesData.length - (l--)]));
		}
		this.canvas3d.dispatchEvent(new CustomEvent("linesChanged", {detail:{action: "created", object: this.serverId, data: this.readNewElements()}}));
		

	}
	
	var arcsData = data.getElementsByTagName("arc");
	if (arcsData && arcsData.length > 0) {
		function parseFloatAttribute(node, name) {
			var r = parseFloat(node.getAttribute(name));
			if (isNaN(r)) return 0;
			return r;
		}
		function spointToVector(spNode) {
			var v = new THREE.Vector3(parseFloatAttribute(spNode, "x"), parseFloatAttribute(spNode, "y"), parseFloatAttribute(spNode, "z"));
			if (v.x == 0 && v.y == 0 && v.z == 0) console.error("Invalid sphere point", spNode);
			return v.normalize();
		}
		
		var arcsAdded = 0;
		for (var i = 0; i < arcsData.length; i++) {
			var styleObj = {};
			var cString = arcsData[i].getAttribute("color"); 
			if (cString) {
				styleObj.color = ConfigManager.parseColor(cString)
			} else {
				styleObj.color = this.configManager.getConfigValue("arcColor");
			}
			var wNum = parseFloat(arcsData[i].getAttribute("width"));
			if (wNum && !isNaN(wNum)) {
				styleObj.width = wNum;
			} else {
				styleObj.width = this.configManager.getConfigValue("arcWidth");
			}
			if (arcsData[i].getAttribute("type") == "transformation")
				styleObj.type = "transform";
			var curArcData = [];
			var succes = false;
			if (arcsData[i].getAttribute("type") == "transformation") {
				var transformCoefs = arcsData[i].getElementsByTagName("cn");
				if (transformCoefs.length < 4) console.error("Invalid arc definition. There must be at least four <cn> child nodes", arcsData[i]);
				else {
					var t = new MoebiusTransform(Complex.fromXML(transformCoefs[0]),
												Complex.fromXML(transformCoefs[1]),
												Complex.fromXML(transformCoefs[2]),
												Complex.fromXML(transformCoefs[3]));
					var arcDataComplex = [t.apply(Complex["0"]), t.apply(Complex(0.5, 0)),t.apply(Complex["1"])];
					curArcData.push(CU.complexToLocalNormalized(t.apply(Complex["0"])),
							CU.complexToLocalNormalized(t.apply(Complex(0.5, 0))),
							CU.complexToLocalNormalized(t.apply(Complex["1"])));
					this.arcsData.push([curArcData[0].multiplyScalar(RSCanvas.SPHERE_RADIUS), 
					                    curArcData[1].multiplyScalar(RSCanvas.SPHERE_RADIUS), 
					                    curArcData[2].multiplyScalar(RSCanvas.SPHERE_RADIUS)]);
					succes = true;
				}
			} else {
				var sps = arcsData[i].getElementsByTagName("sp");
				if (!sps || sps.length ==0) {
					var cns = arcsData[i].getElementsByTagName("cn");
					if (!cns || cns.length == 0) {
						console.error("Arc entry contains no point", arcsData[i]);
					} else {
						for (var j = 0; j < cns.length; j++)
							curArcData.push(CU.complexToLocalNormalized(Complex.fromXML(cns[j])));
					}
					
				} else {
					for (var j = 0; j < sps.length; j++)
						curArcData.push(spointToVector(sps[j]));
				        }
                                #LB: curArcData contains the parsed points. Now interpolate / normalize, and push to this.arcsData
				var v1 = curArcData[0].normalize(), v2 = curArcData[curArcData.length - 1].normalize();
				if (v1.equals(v2)) {
					var v0 = curArcData[1].normalize();
					var v01 = (new THREE.Vector3()).addVectors(v1, v0).negate().normalize();
					this.arcsData.push([v1.multiplyScalar(RSCanvas.SPHERE_RADIUS), 
					                    v0.multiplyScalar(RSCanvas.SPHERE_RADIUS), 
					                    v01.multiplyScalar(RSCanvas.SPHERE_RADIUS), 
					                    v2.multiplyScalar(RSCanvas.SPHERE_RADIUS)]);
					succes = true;
				} else {
					var mid = (new THREE.Vector3()).addVectors(v1, v2);
					if (mid.length == 0)
						this.arcsData.push([v1.multiplyScalar(RSCanvas.SPHERE_RADIUS), 
						                    curArcData[1].normalize().multiplyScalar(RSCanvas.SPHERE_RADIUS), 
						                    v2.multiplyScalar(RSCanvas.SPHERE_RADIUS)]);
					else {
						mid.normalize();
						var v0 = mid.distanceTo(curArcData[1].normalize()) > mid.distanceTo(v1) ? mid.negate() : mid;
						this.arcsData.push([v1.multiplyScalar(RSCanvas.SPHERE_RADIUS), 
						                    v0.multiplyScalar(RSCanvas.SPHERE_RADIUS), 
						                    v2.multiplyScalar(RSCanvas.SPHERE_RADIUS)]);
					}
					succes = true;
				}
			}
			if (succes) {
				if (arcsData[i].getAttribute("id")) styleObj.id = arcsData[i].getAttribute("id");
				else styleObj.id = this.getNewObjectID("arc");
				this.arcStyles.push(styleObj);
				arcsAdded++;
				
			}
			
		}
		this.drawArcs();
		while(arcsAdded > 0){
			this.addNewElement(this.getSnapshotObjectElement("arc", this.arcStyles[this.arcStyles.length - (arcsAdded--)]));
		}
		this.canvas3d.dispatchEvent(new CustomEvent("arcsChanged", {detail:{action: "created", object: this.serverId, data: this.readNewElements()}}));
		console.log("arcs parsed", this.arcsData);
		arcsParsed = true;
	}
	var legendEl =  data.getElementsByTagName("legend")[0];
	if (legendEl) {
		var legendLines = legendEl.getElementsByTagName("legendline");
		var legendData = [];
		for (var i = 0; i < legendLines.length; i++) {
			var value = {};
			var message = "";
			var cn = legendLines[i].getElementsByTagName("cn")[0];
			var cAttr = legendLines[i].getAttribute("color"); 
			if (cAttr) {
				value = new THREE.Color(cAttr);
				if (cn) message = Complex.fromXML(cn).toString();
				else message = legendLines[i].textContent;
			} else if (cn) {
				value = Complex.fromXML(cn);
			} 
			value.message = message;
			legendData.push(value);
		}
		
		if (legendEl.hasAttribute("name"))
			this.legend.name = legendEl.getAttribute("name");
		else this.legend.name = undefined;
		this.legend.update(legendData);
		if (legendData.length > 0 && this.configManager.getConfigValue("showLegend")) {
			this.legend.visible = true;
			this.updateLegendPosition();
		}
	}

	this.newDataLoaded = true;
	this.somethingChanged = true;


};

rp.textureWrapS = THREE.RepeatWrapping;
rp.textureWrapT = THREE.RepeatWrapping;


	
rp.getAttributeValues = function(posArr, i, res) {
	if (!res) res = {};
	var curPos = new THREE.Vector3();
	curPos.set(posArr.getX(i), posArr.getY(i), posArr.getZ(i));
	var c0 = CU.localToComplex(curPos);
	var c, scale;
	if (this.currentTransform) {
		c = this.currentTransform.apply(c0);
		scale = this.currentTransform.scale(c);
	} else {
		c = c0; 
		scale = 1.;
	}
	res.c = c;
	res.scale = scale;
	
	return res;
	
};
rp.cashBitmap = function(bitmapNode) {
	var materialData = bitmapNode instanceof BitmapFillData? bitmapNode : new BitmapFillData(bitmapNode);
	if (materialData.mapping == "stereo" && 
			materialData.name && 
			this.bitmapCash.hasOwnProperty(materialData.name) &&
			!materialData.refresh) {
		if (this.bitmapCash[materialData.name].length > 0 && this.bitmapCash[materialData.name][0].mapping != materialData.mapping) {
			console.warn("Mapping of existing data " + materialData.name + " (" + this.bitmapCash[materialData.name][0].mapping 
					+ ") doesn't fit to new data mapping (" + materialData.mapping + ")");
			return;
		}

		var merged = false;
		for (var i = 0; i < this.bitmapCash[materialData.name].length; i++) {
			if (this.bitmapCash[materialData.name][i].merge(materialData)) merged = true;
		}
		if (!merged) this.bitmapCash[materialData.name].push(materialData);
	} else {
		InteractiveCanvas.prototype.cashBitmap.call(this, materialData);
	}
}

rp.initTextureMaterial = function (geometry, data, material) {
	if (data instanceof BitmapFillData && data.mapping == "stereo") {
		material = material || new THREE.MeshLambertMaterial();
		material.name = data.name;
		material.mappingType = "stereo";
		var loader = new THREE.TextureLoader();
		var that_ = this;
		material.baseTransform = data.baseTransform || MoebiusTransform.identity;
		var texturesLoaded = 0;
		if (data.refresh ||
				!this.texturesPool ||
				this.texturesPool.name != data.name ||
				!this.texturesPool.baseTransform.equals(data.baseTransform)) {
			//refresh textures pool
			this.texturesPool = new Array(BitmapFillData.partNames.length);
			this.texturesPool.baseTransform = data.baseTransform || MoebiusTransform.identity;
			this.texturesPool.name = data.name;
			for (var i = 0; i < this.texturesPool.length; i ++) {
				this.texturesPool[i] = {focus: Complex[BitmapFillData.partNames[i]]}
			}
		}
		data.data.forEach(function(value, index){
			var indexInPool = -1;
			for (var i = 0; i < this.texturesPool.length; i++) {
				if (this.texturesPool[i] && this.texturesPool[i].focus instanceof Complex) {
					if (this.texturesPool[i].focus.equals(value.focus)) {
						indexInPool = i;
					} 
				}
			}
			if (indexInPool >= 0) {
				loader.load(value.dataURL, function(texture){
					that_.texturesPool[indexInPool].texture = texture;
					texturesLoaded ++;
					if (texturesLoaded == data.data.length) {
						material.mappingType = "stereo";
						that_.chooseStereoTexture.call(that_, true);
					}
				});
			} else {
				texturesLoaded ++; 
			}
		}, this);
		if (texturesLoaded == data.data.length) this.chooseStereoTexture(true);
			
		

	} else {
		InteractiveCanvas.prototype.initTextureMaterial.call(this, geometry, data, material);
	}
}

rp.chooseStereoTexture = function (force) {
	if (this.sphere.material.mappingType != "stereo") return;
	if (!this.texturesPool || this.texturesPool.length < 1) return;
	var front = this.getFrontPointBase();
	var minDist = 2;
	var ind = -1;
	for (i = 0; i < this.texturesPool.length; i ++) {
		if (this.texturesPool[i].texture) {
			var f = this.texturesPool[i].focus;
			var focus = this.currentTransform.invert().apply(this.sphere.material.baseTransform.apply(f));
			var d = CU.getDistance(front, focus);
			d = CU.getDistance(front, focus);
			if (d < minDist) {
				minDist = d;
				ind = i;
			}
		}
	}
	if (ind >= 0 && (ind != this.sphere.material.indexInPool || force)) {
		this.sphere.material.map = this.texturesPool[ind].texture;
		var surfaceTransform = this.getTransform().superpos(this.sphere.material.baseTransform.invert().superpos(MoebiusTransform.focusTransform( this.texturesPool[ind].focus).invert()));
		this.updateCustomUVs (this.sphere.geometry, this.getUV, {transform: surfaceTransform , mapping: "stereo"});
			 
		this.sphere.material.needsUpdate = true;
		this.sphere.material.indexInPool = ind;
		
		this.somethingChanged = true;
	}
}

rp.getFrontPoint = function () {
	var p = this.converter.canvasPosToLocal ({x:this.canvas3d.width/2, y: this.canvas3d.height/2});
	
	var c = CU.localToComplex(p, this.getTransform());
	return c;
}
rp.getFrontPointBase = function () {
	var p = this.converter.canvasPosToLocal ({x:this.canvas3d.width/2, y: this.canvas3d.height/2});
	
	var c = CU.localToComplex(p);
	return c;
}




//------ end of public functions ----------------------
//--------------vars---------------------------------

rp.currentTransform = MoebiusTransform.identity;
rp.somethingChanged= true;
rp.showGrid= true;
rp.showAbsGrid= true;
rp.transformUpdated= true;
rp.linesUpdated= true;
rp.inited= false;
rp.newDataLoaded= false;


rp.selectedPointsLimit= -1;



rp.sphere= {};
rp.renderer= {};
rp.scene= {};
rp.camera= {};
rp.marker= {};
rp.localMarker= {};
rp.canvasStyle= {};
rp.canvas3d= {};

rp.converter= {}; 



//----------------------------------------------------------

//};

RSCanvas.PointConverter = function (rsc) {
	this.canvasObj = rsc;
	
};

RSCanvas.PointConverter.prototype = {
		constructor: RSCanvas.PointConverter,
		canvasObj: {},
        raycaster: new THREE.Raycaster(),
        //projector: new THREE.Projector(),
        directionVector: new THREE.Vector3(),
        //--------------functions ------------------------
        
        canvasPosToWorld: function (pos) {
            var intersects = this.getIntersects(pos);
             if (intersects.length) {
            	var i = 0;
            	while (i < intersects.length) {
             		if (intersects[i].object == this.canvasObj.sphere) {
            			return intersects[i].point;
            		}
            		i++;
            	}
            	return intersects[0].point.normalize().multiplyScalar(RSCanvas.SPHERE_RADIUS);
            	
            }
            else return null;
        	
        },


        getIntersects: function(pos) {
        	var x = ( pos.x / this.canvasObj.canvas3d.width ) * 2 - 1;
            var y = -( pos.y / this.canvasObj.canvas3d.height ) * 2 + 1;

            this.directionVector.set(x, y, 1);
            this.directionVector.unproject(this.canvasObj.camera);
            //this.projector.unprojectVector(this.directionVector, this.canvasObj.camera);
            this.directionVector.sub(this.canvasObj.camera.position);
            this.directionVector.normalize();
            this.raycaster.set(this.canvasObj.camera.position, this.directionVector);
            var intersects = this.raycaster.intersectObjects(this.canvasObj.scene.children, true);
        	return intersects;
        },



        localToSpherical: function(pos) {
        	return RSCanvas.PointConverter.localToSpherical(pos);
        	
        },
        localToUV: function(pos) {	
        	return sphericalToUV(this.localToSpherical(pos));
        },
        sphericalToUV: function(sph) {
        	return {u: 0.5*(sph.phi/Math.PI+1), v: sph.theta/Math.PI+.5};
        },
        sphericalToLocalNormalized: function(sph) {
        	RSCanvas.PointConverter.sphericalToLocalNormalized (sph);
        },
        canvasPosToLocal: function(pos) {
        	var p = this.canvasPosToWorld(pos);
        	if (p) return this.canvasObj.sphere.worldToLocal(p);
            else return null;

        },
        
        xmlSPToLocal: function (node) {
        	function checkAttribute(name) {
        		var a = node.getAttribute(name);
        		if (a) return parseFloat(a);
        		else return 0;
        	};
        	var res = new THREE.Vector3(checkAttribute("x"), checkAttribute("y"), checkAttribute("z"));
        	if (res.length() > 0) return (res.normalize());
        	else console.error("Invalid sp node", node);
        }

}

RSCanvas.PointConverter.sphericalToLocalNormalized = function(sph) {
	return new THREE.Vector3(
			Math.cos(sph.theta)*Math.cos(sph.phi),
			-Math.sin(sph.theta),
			-Math.cos(sph.theta)*Math.sin(sph.phi)
		);
};


RSCanvas.PointConverter.localToSpherical = function(pos) {
	var r = pos.clone().normalize();
	var phi = -Math.atan2(r.z, r.x);
	var theta = -Math.asin(r.y);
	return {phi: phi, theta: theta}
	
}
//-------------------------Label Manager-------------------------------------

RSCanvas.LabelManager = function (rsc) {
	this.canvasObj = rsc;
	rsc.labelManager = this;
	var labels = [];
	var curLabelId = 0;
	
	this.registerLabel = function (label) {
			if (!(label instanceof RSTextLabel)) return;
			labels.push(label);
			label.idInManager = curLabelId++;
			
	}
	this.removeLabel = function (label) {
		if (!(label instanceof RSTextLabel)) return;
		if (label.idInManager == undefined) return;
		for (var i = 0; i < labels.length; i++) {
			if (labels[i].idInManager == label.idInManager) {
				labels.splice(i, 1);
				return;
			}
				
		}
	}
	
	this.checkLabel = function (label, checkCollisions) {
		label.updateObjectRotation();
		if (checkCollisions) {
			for (var i = 0; i < this.labels.length; i++) {
				if (label.idInManager != this.labels[i].idInManager)
					label.checkCollision(this.labels[i]);
			}
		}
		
	}
	this.checkLabels = function (checkCollisions) {
		for (var i = 0; i < labels.length; i++) {
			if (!labels[i].hidden)
			labels[i].updateObjectRotation();
		}
	}
	
	this.hideLabel = function (label) {
		for (var i = 0; i < labels.length; i++) {
			if (labels[i].hidden && labels[i].hiddenBy && labels[i].hiddenBy.idInManager == label.idInManager){
				labels[i].show();
				labels[i].updateObjectRotation();
			}
		}
		
	}
	
};

RSCanvas.LabelManager.prototype = {
		constructor: RSCanvas.LabelManager
} ;
console.log("RSCanvas the last line");
;	
