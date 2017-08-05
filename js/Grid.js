//Copyright (c) Anna Alekseeva 2013-2016
var Grid = function(rsCanvasArg) {
	var rsCanvas = rsCanvasArg;
	var grid = [];
	var gridLinesNum = 1;
	var permanentLabels = [];
	var lineLabels = [];
	var staticAbsValues = Grid.staticAbsValues;
	var absGrid = [];
	this.hidden = false;
	this.createGrid = function() {
		for (var i = -gridLinesNum; i <= gridLinesNum; i++ ) {
			grid.push(new GridLine(i, "re", rsCanvas));//, 0x0000ff));
			grid.push(new GridLine(i, "im", rsCanvas));//, 0xff0000));
			
		}
		for (var j = 0; j < Grid.permanentLabelsData.length; j++){
			permanentLabels.push(new RSTextLabel(Grid.permanentLabelsData[j].value, rsCanvas, {message: Grid.permanentLabelsData[j].text} ));
		}
		for (var jj = 0; jj < Grid.staticAbsValues.length; jj++) {
			Grid.absValueLabelStyle.message = "|z|=" +Grid.staticAbsValues[jj];
			permanentLabels.push(new RSTextLabel(Complex.Polar(Grid.staticAbsValues[jj], 0.25*Math.PI), rsCanvas, Grid.absValueLabelStyle));
			
		}
		
		for (var k = 0; k < staticAbsValues.length; k++) {
			absGrid.push(new GridLine(staticAbsValues[k], "rho", rsCanvas, GridLine.absColor));
		}
		createDynamicGrid();

	};
	this.updateGrid = function(leaveHidden) {

		if (!leaveHidden) this.hidden = false;
		if (rsCanvas.showLabels) {
			for (var j = 0; j < Grid.permanentLabelsData.length; j ++){
				permanentLabels[j].show();
				permanentLabels[j].updatePosition();}
			if (rsCanvas.showAbsGrid) {
				for (var j = Grid.permanentLabelsData.length; j < permanentLabels.length; j++){
					permanentLabels[j].show();
				permanentLabels[j].updatePosition();}
			} else {
				for (var j = Grid.permanentLabelsData.length; j < permanentLabels.length; j++){
					permanentLabels[j].hide();
				}
				
			}
		} else {
			for (var j = 0; j < permanentLabels.length; j ++)
			permanentLabels[j].hide();
		}
		if (rsCanvas.showGrid){
			for (var i = 0; i < grid.length; i++) {
				grid[i].setVisible(true);
				grid[i].update();
			}
		} else {
			for (var i = 0; i < grid.length; i++) {
				grid[i].setVisible(false);
			}		
			
		}
		if (rsCanvas.showAbsGrid){
			for (var i = 0; i < absGrid.length; i++) {
				absGrid[i].setVisible(true);
				absGrid[i].update();
			}
		} else {
			for (var i = 0; i < absGrid.length; i++) {
				absGrid[i].setVisible(false);
			}		
			

		}
		//var w0 = currentTransform.findOpposite(Complex["Infinity"]);
		//dilCenterMarker.update(w0);
		if (!(this.hidden))
			updateDynamicGrid();
		if (rsCanvas.showLabels) rsCanvas.checkSelectedPointsGridLabelsCollisions();
		//var d = getSmallGridLineDistance();
		//var dw = new Complex(d, d);
		//dilCenterPlusMarker.update(w0.add(dw));
		//dilCenterMinusMarker.update(w0.sub(dw));
		
		var gCenterInfoLine = document.getElementById("grid-center");
		if (gCenterInfoLine) {
			gCenterInfoLine.innerHTML = showGrid ? "Grid center " + 
					new Complex(roundTo(dynamicGridVars.reMid, dynamicGridVars.smallDiv), 
							roundTo(dynamicGridVars.imMid, dynamicGridVars.smallDiv)).toString(true) + " " + 
							
							currentTransform.scale(new Complex(dynamicGridVars.reMid,
									dynamicGridVars.imMid))
							:"";
		}
		var gStepInfoLine = document.getElementById("grid-step");
		if (gStepInfoLine) {
			gStepInfoLine.innerHTML = showGrid ? "Grid step " +dynamicGridVars.smallDiv :"";
		}
	};
	
	this.checkLabelCollisions = function (obj) {
		if (!rsCanvas.showLabels) return;
		if (!(obj instanceof RSTextLabel)) return;
		for (var j = 0; j < permanentLabels.length; j++) {
			permanentLabels[j].checkCollision(obj);
		}
		for (var l = 0; l < lineLabels.length; l++) {
			lineLabels[l].checkCollision(obj);
		}
	};
	
	this.hideGrid = function () {
		for (var i = 0; i < dynamicGrid.length; i++) {
			dynamicGrid[i].setVisible(false);
		}
		for (var j = 0; j < lineLabels.length; j++)
			lineLabels[j].hide();

		this.hidden = true;
		
	};
	var dynamicGrid = [];
	//TODO move to config
	var dynamicGridSmallLinesNum = 10;
	var smallRDistance = Math.PI/20;
	var dynamicAbsGridSmallLinesNum = 30;
	var reImLinesNum = 0;
	//var absLinesNum = 0;

	function createDynamicGrid() {
		for (var i = -dynamicGridSmallLinesNum; i <= dynamicGridSmallLinesNum; i++){
			dynamicGrid.push(new GridLine( i/dynamicGridSmallLinesNum, "re", rsCanvas, GridLine.smallDivColor));
			dynamicGrid.push(new GridLine( i/dynamicGridSmallLinesNum, "im", rsCanvas, GridLine.smallDivColor));
		}
		reImLinesNum = dynamicGrid.length;
		for (var j = 0; j < 3*dynamicGridSmallLinesNum; j ++) {
				
			var lbl = new RSTextLabel(Complex["0"], rsCanvas, Grid.lineLabelStyle);
			lbl.hide();
			lineLabels.push(lbl);
		}
		//TODO
		for (var i = -dynamicAbsGridSmallLinesNum; i <= dynamicAbsGridSmallLinesNum; i++) {
			dynamicGrid.push(new GridLine( 1+0.5*i/dynamicAbsGridSmallLinesNum, "rho", rsCanvas, GridLine.absSmallDivColor));
		}
		absLinesNum = dynamicGrid.length - reImLinesNum;
		for (var i = 0; i < absLinesNum; i++) {
			var albl = new RSTextLabel(Complex["0"], rsCanvas, Grid.absValueDynamicLabelStyle);
			albl.hide();
			lineLabels.push(albl);
		}
	};
	var dynamicGridVars = {};
	var absDynamicGridVars = {};
	function updateDynamicGrid() {
		if (rsCanvas.showGrid || rsCanvas.showLabels) {
			dynamicGridVars = getDynamicGridVars();			
		}
		if (rsCanvas.showAbsGrid) {
			absDynamicGridVars = getAbsDynamicGridVars();
		}
		if (rsCanvas.showGrid && rsCanvas.showDynamicGrid) {
			for (var i = -dynamicGridSmallLinesNum; i <= dynamicGridSmallLinesNum; i++){
				updateDynamicGridLine(2*(dynamicGridSmallLinesNum + i), dynamicGridVars.reMid + i*dynamicGridVars.smallDiv);
				updateDynamicGridLine(2*(dynamicGridSmallLinesNum + i) + 1, dynamicGridVars.imMid + i*dynamicGridVars.smallDiv);
				
			}
		} else {
			for (var i = 0; i < reImLinesNum; i++) {
				dynamicGrid[i].setVisible(false);
			}
		}
		var j = 0;
		if (rsCanvas.showAbsGrid && rsCanvas.showAbsDynamicGrid) {
			for (j = 0; j < absDynamicGridVars.values.length; j++ ){
				updateDynamicGridLine(reImLinesNum + j, absDynamicGridVars.values[j]);
			}
		}
		j += reImLinesNum;
		while (j < dynamicGrid.length) {
			dynamicGrid[j++].setVisible(false);
		}
		if (rsCanvas.showLabels){
			if ( rsCanvas.showGrid && rsCanvas.showDynamicGrid) {	
				var j = 0;
				updateLineLabel(0, dynamicGridVars.reMid, dynamicGridVars.imMid);
				var dist = 0;
				while (dynamicGridVars.reMid + dist < dynamicGridVars.reMax) {
					dist += dynamicGridVars.bigDiv;
					updateLineLabel(j+1, dynamicGridVars.reMid + dist, dynamicGridVars.imMid);
					updateLineLabel(j+2, dynamicGridVars.reMid, dynamicGridVars.imMid + dist);
					updateLineLabel(j+3, dynamicGridVars.reMid - dist, dynamicGridVars.imMid);
					updateLineLabel(j+4, dynamicGridVars.reMid, dynamicGridVars.imMid - dist);
					j+=4;
				}
				while (j < 3*dynamicGridSmallLinesNum-1) {
					lineLabels[++j].hide();
				}
			} else {
				for (var j = 0; j < 3*dynamicGridSmallLinesNum; j++){
					lineLabels[j].hide();
				}
			}
			if (rsCanvas.showAbsGrid && rsCanvas.showAbsDynamicGrid) {
				var k = 0;//3*dynamicGridSmallLinesNum;
				while (
				k < absDynamicGridVars.values.length) {
					updateLineLabel(k +3*dynamicGridSmallLinesNum, absDynamicGridVars.values[k++], absDynamicGridVars.phi0, true);
				}
				while (++k < lineLabels.length - 3*dynamicGridSmallLinesNum ) {
					lineLabels[k +3*dynamicGridSmallLinesNum].hide();
				}
			}else {
				for (var j = 3*dynamicGridSmallLinesNum; j < lineLabels.length; j++){
					lineLabels[j].hide();
				}
			}
		} else {
			for (var j = 0; j < lineLabels.length; j++)
				lineLabels[j].hide();
		}

	}
	function updateLineLabel(index, val1, val2, isAbs) {
		var c = isAbs? Complex.Polar(val1, val2) : Complex(val1, val2);
		lineLabels[index].show();
		lineLabels[index].setValue(c);
		if (isAbs) 
			lineLabels[index].updateLabelText("|z|=" + Complex.toSmartStringComponent(val1, lineLabels[index].style.precision));//Grid.absValueDynamicLabelStyle.precision));
		for (var j = 0; j < permanentLabels.length; j++) {
			lineLabels[index].checkCollision(permanentLabels[j]);
		}
	}
	
	function updateDynamicGridLine(index, value) {
		var l = dynamicGrid[index];
		l.setVisible(true);
		l.setPar(value);
		if (index == reImLinesNum + 1) l.log = true;
		if (index < reImLinesNum) {
			var cv = roundTo(value, dynamicGridVars.bigDiv);
			if (Math.abs(value - cv) < dynamicGridVars.smallDiv*0.001) {
				l.setColor (GridLine.bigDivColor);
			} else {
				l.setColor(GridLine.smallDivColor);
			}
		} 
	}
	function getDynamicGridVars() {
		//var transformPars = getTransformParams(rsCanvas.currentTransform);
		var t = rsCanvas.currentTransform;
		var w0 = t.findOpposite(Complex["Infinity"]);
		var dRaw = smallRDistance*t.determinantAbs()/(t.c.r2()+t.d.r2());
		var res = roundTo10 (dRaw);
		//res.smallDiv = Math.pow(10,logDfloor);
		//res.smallDiv = Math.round(Math.pow(10, logDFrac3))*Math.pow(10, logDfloor);
		var n = dynamicGridSmallLinesNum*res.smallDiv;
	 	res.reMid = roundTo(w0.re, res.bigDiv);
		res.reMin = res.reMid - n;
		res.reMax = res.reMid + n;
		res.imMid = roundTo(w0.i, res.bigDiv);
		res.imMin = res.imMid - n;
		res.imMax = res.imMid + n;
		
		return res;	
	}
	
	function getAbsDynamicGridVars () {
		var res = {};
		res.values = [];
		var t = rsCanvas.currentTransform;
		var rbd =t.b.r2()+t.a.r2();
		var rac =t.d.r2() + t.c.r2();
		var rho0 = Math.sqrt(rbd/ rac); //works!
		
		res.beta = Math.sqrt(rac*rbd/t.determinant().r2()-1);
		res.alpha = rac/t.determinantAbs();
		var drho0 = getDRho(rho0, smallRDistance, res.alpha, res.beta);
		res.rhoMin = roundTo10(smallRDistance/res.alpha*(1+res.beta*res.beta)/(1+0.5*smallRDistance*res.beta)).smallDiv;
		res.rhoMax = roundTo10(1/res.alpha*(res.beta + 2/smallRDistance)).smallDiv;
		var step0 = roundTo10(drho0).smallDiv;
		var start = roundTo(rho0, step0);
		res.values.push(res.rhoMin,start-step0,start, start+step0, res.rhoMax);
		res.phi0 = t.a.mult(Complex.conj(t.c)).add(t.b.mult(Complex.conj(t.d))).t();
		addDynamicAbsValues(start, step0, res, 1);
		addDynamicAbsValues(start, step0, res, -1);
		return res;
	}
	
	function addDynamicAbsValues(start, step0, res, increment) {
		var i = 0;
		var currRho = start;
		var step = step0, newStep;
		while (i++ < dynamicAbsGridSmallLinesNum && currRho > res.rhoMin && 
				currRho < res.rhoMax && 
				res.values.length <= 2*dynamicAbsGridSmallLinesNum ) {
			newStep = roundTo10(getDRho(currRho, smallRDistance, res.alpha, res.beta)).smallDiv;
			if (Math.abs(roundTo(currRho, newStep) - currRho) < 0.0001*newStep) {
				step = newStep;
			}
			currRho += step*increment;
			res.values.push(currRho);
		}
		
	}
	
	function getDRho (rho, dtheta, alpha, beta) {
		var arg = alpha*rho - beta;
		return dtheta*0.5*(1+arg*arg)/alpha;
	}
	

	function roundTo(x, par) {
		if (par) return Math.round(x/par)*par;
		return Math.round(x);
	}
	
	function roundTo10 (x) {
		var res = {};
		var logD = Math.log(x)/Math.LN10;
		var logDfloor = Math.floor(logD);
		var logDFrac = logD - logDfloor;
		var logDFrac3 = Math.floor(logDFrac*3)/3;
		res.bigDiv = Math.pow(10,logDfloor + 1);
		res.smallDiv = Math.round(Math.pow(10, logDFrac3))*Math.pow(10, logDfloor);
		return res;

	}
	//var dilCenterMarker, dilCenterPlusMarker, dilCenterMinusMarker;// = new GridPointMarker(Complex["0"]);
	
};
Grid.prototype = {
		constructor: Grid
};

Grid.permanentLabelsData = [{value: Complex["1"]}, 
                            {value: Complex["0"]}, 
                            {value: Complex["I"]}, 
                            {value: Complex["-I"]}, 
                            {value: Complex(-1, 0, 1, Math.PI)},
                            {value: Complex["Infinity"], text: "∞"}];

Grid.staticAbsValues = [0.1, 0.5, 1, 2, 10];

Grid.lineLabelStyle = {
		precision: 7,
		fontSize: 16
};

Grid.absValueLabelStyle = {
		backgroundColor: {r: 100, g: 80, b: 80, a: .8},
		borderColor: {r: 240, g: 160, b: 160, a: 1},
		textColor: { r: 255, g: 200, b: 200, a: 1}, 
		pointerColor:  0xf0a0a0
}
Grid.absValueDynamicLabelStyle = {
		backgroundColor: {r: 100, g: 80, b: 80, a: .8},
		borderColor: {r: 240, g: 160, b: 160, a: 1},
		textColor: { r: 255, g: 200, b: 200, a: 1}, 
		pointerColor:  0xf0a0a0, 
		precision: 7,
		fontSize: 16

}

var GridPointMarker = function (z, color, rsCanvas) {
	this.color = color || GridPointMarker.defaultColor;
	this.reLine = new GridLine (z.re, "re", rsCanvas, this.color);
	this.imLine = new GridLine(z.i, "im", rsCanvas, this.color);
};
GridPointMarker.defaultColor = 0xff0000;
GridPointMarker.prototype = {
		constructor: GridPointMarker,
		update: function(z) {
			if (z) {
				this.reLine.setPar(z.re);
				this.imLine.setPar(z.i);
			} else {
				this.reLine.update();
				this.imLine.update();
			}
		}
};


var GridLine = function(par, type, rsCanvas, color ) {
	
	this.rsCanvas = rsCanvas;
	this.type = type || "Re";
	this.color = color || GridLine.color;
	this.setPar(par, true);
	
};
GridLine.color = 0x009900;
GridLine.smallDivColor = 0x226622;
GridLine.bigDivColor = 0x339933;
GridLine.extraDivColor = 0x006600;

GridLine.absColor = 0x990000;
GridLine.absSmallDivColor = 0x662222;
GridLine.absBigDivColor = 0x993333;

//GridLine.absSmallDivColor = 0x6666ff;
//GridLine.absBigDivColor = 0x000099;

GridLine.getCenterRadius = function (argVectors, resObj) {
	var vectors = new Array();
	for (var i = 0; i < argVectors.length; i++) {
		vectors.push(argVectors[i].clone().normalize());
	}
	var res = resObj || {};
	res.center = new THREE.Vector3(); 
	res.circleCenter = new THREE.Vector3();
	//TODO check for equal vectors
	res.center.crossVectors(
			vectors[1].sub(vectors[0]),
			vectors[2].sub(vectors[0]));
	res.center.normalize();
	var cs = res.center.dot(vectors[0]);
	if (cs < 0) {
		cs = -cs;
		res.center.negate();
	}
	
	res.radius = Math.sqrt(1 - cs*cs);
	res.circleCenter.copy(res.center).setLength(cs);
	var rotAxis = new THREE.Vector3(-res.center.y, res.center.x, 0);
	var rotAngle = Math.acos(res.center.z);
	res.q = (new THREE.Quaternion()).setFromAxisAngle(rotAxis.normalize(), rotAngle);
	
	res.newX = (new THREE.Vector3(1, 0, 0)).applyQuaternion(res.q);
	res.newY = (new THREE.Vector3(0, 1, 0)).applyQuaternion(res.q);
	res.angles = [];
	for (var i = 0; i < vectors.length; i++) {
		res.angles.push(Math.atan2(vectors[i].dot(res.newY), vectors[i].dot(res.newX)));
		if (res.angles[i] < 0) res.angles[i] += 2*Math.PI;
	}
	var phi1 = res.angles[0],
	 phi2 = res.angles[res.angles.length-1],
	 phi0 = res.angles[1];
	
		res.phiStart = ((phi1 < phi2 && phi0 > phi1) || (phi0 < phi2 && phi2 < phi1)) ? 
				phi1 : phi2;
		res.phi = ((phi1 < phi0 && phi0 < phi2) || (phi2 < phi0 && phi0 < phi1)) ?
				Math.abs(phi1-phi2) : (2*Math.PI - Math.abs(phi1-phi2));
	
	return res;
}



GridLine.radiusFactor = 1.005;
GridLine.prototype = {
		constructor: GridLine,
		setPar: function (arg, firstCall) {
			this.par = arg;
			this.points = [];

			if (this.type.toLowerCase() == "re" || 
					this.type.toLowerCase() == "im" ||
					this.type.toLowerCase() == "phase") {
				this.points.push(Complex["Infinity"]);
			}
			if (this.type.toLowerCase() == "re") {
				this.points.push(new Complex(this.par, 0));
				this.points.push(new Complex(this.par, 1));
			}
			if (this.type.toLowerCase() == "im") {
				this.points.push(new Complex(0, this.par));
				this.points.push(new Complex(1, this.par));
			}
			if (this.type.toLowerCase() == "phase") {
				this.points.push(Complex["0"]);
				this.points.push(new Complex(Math.cos(this.par), Math.sin(this.par)));
			}
			if (this.type.toLowerCase() == "rho") {
				this.points.push(new Complex(this.par, 0));
				this.points.push(new Complex(0, this.par));
				this.points.push(new Complex(-this.par, 0));
			}
			if (firstCall) {
				this.setCenterRadius();
				this.setObject();
			} else {
				this.update();
			}
		},
		setCenterRadius: function() {
			var vectors = [];
			for (var i = 0; i < 3; i++){
				vectors.push(CU.complexToLocalNormalized(this.points[i], 
						this.rsCanvas.currentTransform));
			}
			//projection of the circle center to the sphere surface
			this.center = new THREE.Vector3(); 
			this.circleCenter = new THREE.Vector3();
			this.center.crossVectors(
					vectors[1].sub(vectors[0]),
					vectors[2].sub(vectors[0]));
			this.center.normalize();
			var cs = this.center.dot(vectors[0]);
			if (cs < 0) {
				cs = -cs;
				this.center.negate();
			}
			this.radius = Math.sqrt(1 - cs*cs);
			this.circleCenter.copy(this.center).setLength(cs);
		},
		setObject: function() {
			this.geometry = new THREE.CircleBufferGeometry(RSCanvas.SPHERE_RADIUS*GridLine.radiusFactor, 60);
			this.material = new THREE.LineBasicMaterial({color: this.color});
			this.object = new THREE.Line(this.geometry, this.material);
			this.object.scale = new THREE.Vector3(this.radius, this.radius, this.radius);
			this.rsCanvas.sphere.add(this.object);
			this.setObjectPosition();
			
		},
		setObjectPosition: function() {
			this.object.position.copy(this.circleCenter);
			this.object.position.multiplyScalar(RSCanvas.SPHERE_RADIUS);
			var rotAxis = new THREE.Vector3(-this.center.y, this.center.x, 0);
			var rotAngle = Math.acos(this.center.z);
			this.object.quaternion.setFromAxisAngle(rotAxis.normalize(), rotAngle);
			
		},
		updateObject: function (){
			this.object.scale.set(this.radius, this.radius, this.radius);
			
			this.setObjectPosition();
			this.object.geometry.verticesNeedUpdate = true;
			this.object.updateMatrix();
		},
		setColor: function (c) {
			if (this.color != c){
				
				this.color = c;
				this.object.material.color.set(this.color);
				this.object.material.needsUpdate = true;
			}
			
		},
		setVisible: function (val) {
			this.object.visible = val;
		},
		update: function() {
			this.setCenterRadius();
			this.updateObject();
		}
		
		
};
THREE.Vector3.signedAngleTo = function (v, axis_) {
	var axis = axis_ || new THREE.Vector3(0, 0, 1);
	var phi = this.angleTo(v);
	return this.clone().cross(v).dot(axis) > 0 ? phi : -phi;
}



