/**
 * (c) Anna Alekseeva, 2017
 * Legend, describing meanings of colors, using on a Riemann Sphere surface.
 *  
 * 
 * @param data array of Complex or THREE.Color, each of these objects may contain a "message" field (String)
 * @param style object containing style fields, such as markerSize, align, gap, textColor, fontSize, fontFace, 
 * precision, vMargine, hMargine. Optional. By default the values from Legend.baseStyle and 
 * RSTextLabel.baseStyle (defined in PointMarkers.js) are used.
 *
 * @returns
 */
Legend = function (data, style) {
	THREE.Object3D.call(this);
	this.getWidth = function () {
		var res = this.style.markerSize;
		for (var i = 0; i < lines.length; i++) {
			res = Math.max(res, lines[i].getWidth());
		}
		return res;			
	}
	this.getHeight = function () {
		return Math.max(this.style.markerSize, this.style.markerSize*lines.length + this.style.gap*Math.max(0, lines.length - 1));
	}
	var testRect;
	function fill(data) {
		if (Array.isArray(data)) {
			for (var i = 0; i < data.length; i ++){
				var legendLine = new LegendLine(data[i], data[i].message || "", this.style);
				this.add(legendLine);
				legendLine.position.y = -i*this.style.markerSize - i*this.style.gap;
				lines.push(legendLine);
				localData[i] = data[i];
			}
		}
		
	}
	if (!style) style = {};
	this.style = {};
	overloadStyle(Legend.prototype.baseStyle, style);
	overloadStyle(style, this.style);
	var lines = [];
	var localData = [];
	fill.call(this, data);

	this.addLine = function(value, message) {
		var l = new LegendLine(value, message, this.style);
		this.add(l);
		l.position.y = -lines.length*(this.style.markerSize + this.style.gap);
		lines.push(l);
		localData.push(value);
		if (message)
			localData[localData.length - 1].message = message;
	}
	
	//use without argument to clear legend
	this.clear = function (preserveData) {
		while(lines.length > 0) {
			this.remove(lines.shift());
		}
		if (!preserveData) localData = [];
	}
	
	this.update = function(data) {
		this.clear();
		fill.call(this, data);
	}
	
	this.updateStyle = function (newStyle) {
		overloadStyle(this.style, newStyle);
		this.style = newStyle;
		this.clear(true);
		fill.call(this, localData);
		
	}
}
Legend.prototype = new THREE.Object3D();
Legend.prototype.constructor = Legend;
Legend.baseStyle = {};
Legend.baseStyle.gap = .8;
Legend.baseStyle.markerSize = 2;
Legend.baseStyle.textMarkerRatio = 1.3;
Legend.baseStyle.textColor = new THREE.Color(.6, .6, .6);
Legend.baseStyle.align = "left";
Legend.baseStyle.hMargine = 8;
Legend.baseStyle.vMargine = 0;


LegendLine = function (value, message, style) {
	var marker = new LegendMarker(value, style);
	var label = new LegendLabel(message || value, style);
	THREE.Object3D.call(this);
	this.add(marker);
	this.add(label);
	this.value = value;
	this.getWidth = function () {return label.getWidth()}
}
LegendLine.prototype = new THREE.Object3D();
LegendLine.prototype.constructor = LegendLine;

LegendMarker = function (value, style) {
	
	if (!style) style = {};
	this.geometry = new THREE.BufferGeometry();
	var s = (style.markerSize || Legend.baseStyle.markerSize)/2;
	var vertices = new Float32Array( [
		-s, -s,  0,
		 s, -s,  0,
		 s,  s,  0,
	
		 s,  s,  0,
		-s,  s,  0,
		-s, -s,  0
	] );
	this.geometry.addAttribute( 'position', new THREE.BufferAttribute( vertices, 3 ) );

	var material;
	if (value instanceof Complex) {
		//Using ShaderMaterial to be sure that the color of a given complex value is same as on the sphere surface
		var customUniforms = {};
		if (value == Complex["Infinity"]) {
			customUniforms = {
					d: {value: new THREE.Vector2(1, 0)},
					n: {value: new THREE.Vector2(1e10, 0)}
				};
		} else {
			var l = 1/(value.r() + 1);
			var z = new THREE.Vector2(value.re*l, value.i*l);

			customUniforms = {
					d: {value: new THREE.Vector2(l, 0)},
					n: {value: new THREE.Vector2(z.x, z.y)}
				};
		}
		 var vShader ="uniform vec2 d;\n" +
		 	"uniform vec2 n;\n"+
		 	"void main()\n" + 
		 	"{\n" +
			"    vec4 modelViewPosition = modelViewMatrix * vec4(position, 1.0);\n"+
			"    gl_Position = projectionMatrix * modelViewPosition;\n"+
			"}\n";
	
		var fShader = "uniform vec2 d;\n" +
			"uniform vec2 n;\n"+
			complexToColorString + //defined in RationalFuncs.js 
			"void main() {\n"+
			"   vec3 rgb = complex2rgb(n, d);" +
			"	gl_FragColor = vec4(rgb, 1.0);\n"+
			"}";
		
			 
		material = new THREE.ShaderMaterial( {
				uniforms: customUniforms,
				vertexShader: vShader,
				fragmentShader: fShader
			} );
	} else if (value instanceof THREE.Color) {
		material = new THREE.MeshBasicMaterial({color: value})
	} else {
		material = new THREE.MeshBasicMaterial();
	}
	THREE.Mesh.call(this, this.geometry, material);
	var align = style.align || Legend.baseStyle.align;
	this.position.x = align == "left" ? s : -s;
	this.position.y = -s;
	this.position.z = 0;
}

LegendMarker.prototype = Object.create(THREE.Mesh.prototype);

//----------------------------------------------
LegendLabel = function(value, style) {
	this.style = style || {};
	overloadStyle(Legend.baseStyle, this.style);
	overloadStyle(RSTextLabel.baseStyle, this.style);
    var w, h, textWidth;
	if (value != undefined) {
		var message;
		if (value instanceof Complex) {
			message = value.toString(true, this.style.precision || 3)
		} else {
			message = value.toString();
		} 
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
		
		var clr = new THREE.Color();
		clr.set(this.style.textColor);
		context.font = this.style.fontSize + "px " + this.style.fontFace;
	    var metrics = context.measureText( message );
	    textWidth = metrics.width;	
	    w = 2*this.style.hMargine + textWidth + 2.*this.style.borderThickness;
	    h = 2*this.style.vMargine + this.style.fontSize*1. + 2.*this.style.borderThickness;
  	    context.fillStyle = "#" + clr.getHexString();
   	    context.fillText( message, canvas.width/2 - textWidth/2, canvas.height/2 + this.style.fontSize*.5-this.style.hMargine/2);
   	    
   	    var scale = this.style.markerSize / h * this.style.textMarkerRatio;
   	    
   	    this.position.z = 0;
   	    this.position.x = this.style.align == "left" ?  this.style.markerSize+0.5*scale*w:
   	    												-this.style.markerSize - 0.5*scale*w;
   	    this.position.y = -this.style.markerSize/2;
   	    this.scale.set(scale,scale,1);
    	this.material.map.needsUpdate = true;
	}
	
	this.getWidth = function () {
		if (!value) return 0;
		return w*this.scale.x + this.style.markerSize;
	}
	
};

function overloadStyle (base, res) {
	if (!res) res = {};
	for (var f in base) {
		if (base.hasOwnProperty(f)) {			
			res[f] = res[f] || base[f];
		}
	}
	return res;
} 
LegendLabel.prototype = Object.create(THREE.Mesh.prototype);
