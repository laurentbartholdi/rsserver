//Copyright (c) Anna Alekseeva 2013-2016
var PointMarker = function(arg, rsCanvas, object, size){//, colorInfo, wfColorArg) {
	this.canvas = rsCanvas;
	this.object = object;
	this.object.marker = this;
	this.objectSize = size || 0;

	if (arg instanceof THREE.Vector3) {
		this.position = arg;
		this.spherePosition = this.position.clone().multiplyScalar(RSCanvas.SPHERE_RADIUS);
		this.value = CU.localToComplex(arg, this.canvas.currentTransform);

		this.updateBaseValue();
	} else if (arg instanceof Complex) {
		this.setValue(arg);
	} else {
		this.position = new THREE.Vector3();
		this.value = this.baseValue = new Complex(0, 0, 0, 0);
	}
	
	this.updateObjectPosition();
	rsCanvas.sphere.add(this.object);
};


PointMarker.prototype = {
		
		ajustRotation: false,
		
		constructor: PointMarker,
		position: new THREE.Vector3(),
		spherePosition: new THREE.Vector3(),
		
		value: new Complex(),
		updatePosition: function () {
			this.moveTo(CU.complexToLocalNormalized(this.value, this.canvas.currentTransform));
		},
		/**
		 * Set new position, updating a value according to currentTransform
		 * @param pos
		 */
		setPosition: function(pos) {
			var c = CU.localToComplex(pos, this.canvas.currentTransform);
			this.setValue(c);
		},
		/**
		 * Set new position without changing value
		 * @param pos
		 */
		moveTo: function (pos) {
			this.position.copy(pos);
			this.position.normalize();
			this.spherePosition.copy(this.position).multiplyScalar(RSCanvas.SPHERE_RADIUS); 
			if (!this.hidden) this.updateObjectPosition();

			this.updateBaseValue();
		},
		updateBaseValue: function () {
			this.baseValue = CU.localToComplex(this.position);
			var oppos = this.position.clone().negate();
			this.oppositeBaseValue = CU.localToComplex(oppos);
			this.oppositeValue = this.canvas.currentTransform.apply(this.oppositeBaseValue);
		},
		/**
		 * set new value updating position and base value according to currentTransform
		 * @param val
		 */
		setValue: function (val) {
			this.value = val;
			this.updatePosition();
		},
		hide: function(arg) {
			if (arg) {
				this.hiddenBy = arg;
				this.lastObjectPosition = this.object.position.clone();
			}
			this.object.position.set(0, 0, 0);// = new THREE.Vector3(0,0,0);
			this.hidden = true;
		},
		show: function() {
			if (this.hiddenBy) this.object.position.set(this.lastObjectPosition.x,this.lastObjectPosition.y,this.lastObjectPosition.z);
			this.hiddenBy = null;
			this.hidden = false;
			
		},
		updateObjectPosition: function () {
			var v = this.position.clone().normalize();
			var phi = Math.acos(v.y);
			if (this.ajustRotation) {
				var a = new THREE.Vector3(v.z, 0, -v.x);
				a.normalize();
				this.object.quaternion.setFromAxisAngle(a, phi);}
			var l = RSCanvas.SPHERE_RADIUS + this.objectSize;
			v.multiplyScalar(l);
			this.object.position.set(v.x, v.y, v.z);
			//console.log(this.numInArray, "updateObjectPosition", this.position, v, l, this.object.position);
			
		}
};


var DiamondMarker = function (arg, rsCanvas, colorInfo, wfColorArg){
	
	var geometry = new THREE.OctahedronBufferGeometry(DiamondMarker.SIZE, 0);
	var	mainColor = DiamondMarker.COLOR;
	var	wfColor = DiamondMarker.WF_COLOR;
	if (colorInfo) {
	//console.log(this, arg.toString(), colorInfo, (colorInfo.constructor == String));
		if (colorInfo.constructor == String ){
			if (colorInfo.substring(0,3).toLowerCase() == "sel") {
				mainColor = DiamondMarker.SELECTED_POINT_COLOR;
				wfColor = DiamondMarker.SELECTED_POINT_WF_COLOR;
				
			} else {
				mainColor = colorInfo;
				if (wfColorArg) wfColor = wfColorArg
				else wfColor = mainColor;
			}
		}
	}
	var material = new THREE.MeshLambertMaterial({color: mainColor, emissive: 0x333333, emissiveIntensity: 0.8});

	PointMarker.call(this, arg, rsCanvas,new THREE.Mesh(geometry, material), DiamondMarker.SIZE);// colorInfo, wfColorArg);
	
	var wf = new THREE.Mesh(new THREE.OctahedronBufferGeometry(DiamondMarker.SIZE*1.05, 0),
	new THREE.MeshLambertMaterial({color: wfColor, wireframe: true}));
	this.object.add(wf);
	wf.marker = this;

};

DiamondMarker.SIZE = 1;
DiamondMarker.COLOR = 0x339933;
DiamondMarker.WF_COLOR = 0x003300;

DiamondMarker.SELECTED_POINT_COLOR = 0xbb3333;
DiamondMarker.SELECTED_POINT_WF_COLOR = 0x330000;

DiamondMarker.prototype = Object.create(PointMarker.prototype);
DiamondMarker.prototype.ajustRotation = true;

var RSTextLabel = function (arg, rsCanvas, parameters){
	this.style = {};
	this.showInfinity = function(t, v) {
		   var infScale = t.isIdentity() ? 1 : t.determinantAbs()/(t.a.r2() + t.c.r2());
		   return v.r() > RSTextLabel.baseInfinityRadius/infScale; 
	    }

	if ( parameters === undefined ) parameters = {};
	if (parameters.message !== undefined) this.message = parameters.message;
	this.noLabel = (parameters.message == "empty"); 

	copyObject(RSTextLabel.baseStyle, this.style);
	copyObject(parameters, this.style);
	var geometry = new THREE.SphereBufferGeometry( this.style.pointerSize, 32, 32 ); 
	var material = new THREE.MeshLambertMaterial({color: this.style.pointerColor});
	var sph = new THREE.Mesh( geometry, material );
	var pointer = new THREE.Group();
	pointer.add(sph);
	this.labelWidth = 1;
	this.labelHeight = 1;1
	if (!this.noLabel) this.createLabelPlane();
	pointer.add(this.label);
	PointMarker.call(this, arg, rsCanvas, pointer, this.style.pointerSize/2);
	sph.marker = this;
	if (!this.noLabel) this.updateLabelText(this.message);
	var that = this;
	//this.canvas.canvas3d.addEventListener("sphereMoved", function(e){that.updateObjectRotation();});
	this.canvas.labelManager.registerLabel(this);
}
RSTextLabel.prototype = Object.create(PointMarker.prototype);
RSTextLabel.prototype.ajustRotation = false;
RSTextLabel.prototype.updateObjectPosition  = function() {
	PointMarker.prototype.updateObjectPosition.call(this);
	if (!this.message && !this.noLabel) this.updateLabelText();
	this.updateObjectRotation();
}
RSTextLabel.prototype.updateObjectRotation = function(){
	var q = new THREE.Quaternion();
	q.copy(this.canvas.sphere.quaternion);
	var glp = this.object.position.clone().applyQuaternion(q);
	q.inverse();
	this.object.quaternion.copy(q);
//	console.log(this.value, "updateRotation", glp.x, glp.y, glp.z, testp.x, testp.y, testp.z);
	if (!this.noLabel) {
		var signx  = glp.x > 0 ? 0.5 : -0.5;
		var signy  = glp.y > 0 ? 0.5 : -0.5;
		this.label.position.set(signx*this.labelWidth, signy*this.labelHeight, 0);
	}
	
}
function copyObject(src, res) {
	if (!src) return res;
	if (res === undefined) res = {};
	for (var attr in src) {
		if (src.hasOwnProperty(attr)) res[attr] = src[attr];
	}
	return res;
}

RSTextLabel.prototype.createLabelPlane = function(){

    var tcanvas =  document.createElement('canvas');
    var context = tcanvas.getContext('2d');
    
    var testString = RSTextLabel.longestString;
    for (var i = 0; i < this.style.precision; i ++)
    	testString += "00";
	context.font = /*"Bold " + */this.style.fontSize + "px " + this.style.fontFace;
   
	var maxWidth = context.measureText( testString ).width;   
    var size2D =Math.pow(2, Math.ceil(Math.LOG2E*Math.log(maxWidth)));
    tcanvas.width = size2D;
    tcanvas.height = size2D/4;    

	this.labelCanvas = tcanvas;
	this.labelContext = context;
	this.planeWdith = this.style.resolution * tcanvas.width;
	this.planeHeight = this.style.resolution * tcanvas.height;
	
	this.clearContext();
	var pg = new THREE.PlaneGeometry(this.planeWdith, this.planeHeight);
	//console.log("creating label plane", parameters, this);
	
    var tttexture = new THREE.Texture(this.labelCanvas) ;
    tttexture.needsUpdate = true;
    var m = new THREE.MeshLambertMaterial({map: tttexture});
    m.transparent = true;
    
    this.label = new THREE.Mesh(pg, m);	
}

RSTextLabel.prototype.clearContext = function () {
	this.labelContext.clearRect(0, 0, this.labelCanvas.width, this.labelCanvas.height);
    this.labelContext.fillStyle = "rgba(0,0,0,0)";
    this.labelContext.fillRect(0, 0, this.labelCanvas.width, this.labelCanvas.height);
}

RSTextLabel.baseInfinityRadius = 500;//Points with greater absolute values are shown as "Infinity" when trivial Moebius transformation is applied
RSTextLabel.prototype.updateLabelText = function (message){
	message = message || (this.showInfinity(this.canvas.currentTransform, this.value) ? "∞" : this.value.toString(true, this.style.precision));
	this.clearContext();
    var context = this.labelContext;
    var w, h, textWidth;
	context.font = /*"Bold " + */this.style.fontSize + "px " + this.style.fontFace;
    	    var metrics = context.measureText( message );
    	    textWidth = metrics.width;
    	    w = 2*this.style.hMargine + textWidth + this.style.borderThickness;
    	    h = 2*this.style.vMargine + this.style.fontSize*1. + this.style.borderThickness;
    	
    	    
    	    function makeRgbaString(color) {
    	    	return "rgba(" + color.r + "," + color.g + "," + color.b + "," + color.a +")"; 
    	    }
    context.fillStyle = makeRgbaString(this.style.backgroundColor);
    context.strokeStyle = makeRgbaString(this.style.borderColor);
    context.lineWidth = this.style.borderThickness;
    roundRect(context, (this.labelCanvas.width - w)/2, (this.labelCanvas.height - h)/2, w, h, this.style.hMargine/2);
    context.fillStyle = makeRgbaString(this.style.textColor);
    context.fillText( message, this.labelCanvas.width/2 - textWidth/2, this.labelCanvas.height/2 + this.style.fontSize*.5-this.style.hMargine/2);
    this.label.material.map.needsUpdate = true;
    this.labelWidth = this.style.resolution*w;
    this.labelHeight = this.style.resolution*h;
    this.updateObjectRotation();
    
	
}

RSTextLabel.prototype.setValue = function (val) {
	if (this.labelContext && !this.message && !this.noLabel) {
		this.updateLabelText((this.canvas && this.showInfinity(this.canvas.currentTransform, val))? "∞" :  val.toString(true, this.style.precision || 3));		
	}
	PointMarker.prototype.setValue.call(this, val);
}

RSTextLabel.prototype.checkCollision = function (compare_label) {
	if (!(compare_label instanceof RSTextLabel)) return;
	if (this.hidden && !(this.hiddenBy === compare_label) || (compare_label.hidden && !(compare_label.hiddenBy === this))) return;
	var v0 = this.hidden ? this.lastObjectPosition : this.object.position;
	var v1 = compare_label.hidden ? compare_label.lastObjectPosition : compare_label.object.position;
	if (!v0 || !v1) return;
	var dist = v0.distanceTo(v1);
	if (dist < this.style.pointerSize + compare_label.style.pointerSize) {
		if (compare_label.fixed && !this.fixed &&!compare_label.hidden) compare_label.hide(this);
		else if (!this.hidden) this.hide(compare_label);
		return true;
	} else {
		if (this.hiddenBy === compare_label || compare_label.hiddenBy === this) {
			this.show();
			this.updatePosition();
			compare_label.show();
			compare_label.updatePosition();
		}
	}
	return false;
}

RSTextLabel.prototype.hide = function (arg) {
	//console.log("hide",this,arg,arg===undefined);
	if (arg === undefined) this.canvas.labelManager.hideLabel(this);
	PointMarker.prototype.hide.call(this, arg);
}

RSTextLabel.prototype.fixed = true;

RSTextLabel.baseStyle = {
		backgroundColor: {r: 80, g: 100, b: 80, a: .8},
		borderColor: {r: 160, g: 240, b: 160, a: 1},
		borderThickness: 2.,
		textColor: { r: 200, g: 255, b: 200, a: 1}, 
		fontFace: "Arial", 
		fontSize: "24",
		precision: 3,
		pointerSize: .2,
		pointerColor:  0xa0f0a0, 
		vMargine: 3.,
		hMargine: 5.,
		resolution: 0.04
}

RSTextLabel.longestString = "-0.00000+0.00000 i";


RSTextLabelMoveable = function (arg, rsCanvas, parameters) {
	var newParams = copyObject(RSTextLabelMoveable.baseStyle);
	copyObject(parameters, newParams);
	RSTextLabel.call(this, arg, rsCanvas, newParams);
	this.fixed = false;
}
RSTextLabelMoveable.prototype = Object.create(RSTextLabel.prototype);


RSTextLabelMoveable.baseStyle =  {
		pointerSize: .6,
		pointerColor:  0xf0a0a0,
		vMargine: 3.,
		hMargine: 4.,
		backgroundColor: {r: 90, g: 80, b: 80, a: .8},
		borderColor: {r: 240, g: 180, b: 180, a: 1},
		textColor: { r: 255, g: 220, b: 220, a: 1} 
		
}

//http://stemkoski.github.io/Three.js/Sprite-Text-Labels.html
//function for drawing rounded rectangles
function roundRect(ctx, x, y, w, h, r) 
{
    ctx.beginPath();
    ctx.moveTo(x+r, y);
    ctx.lineTo(x+w-r, y);
    ctx.quadraticCurveTo(x+w, y, x+w, y+r);
    ctx.lineTo(x+w, y+h-r);
    ctx.quadraticCurveTo(x+w, y+h, x+w-r, y+h);
    ctx.lineTo(x+r, y+h);
    ctx.quadraticCurveTo(x, y+h, x, y+h-r);
    ctx.lineTo(x, y+r);
    ctx.quadraticCurveTo(x, y, x+r, y);
    ctx.closePath();
    ctx.fill();
	ctx.stroke();   
}


