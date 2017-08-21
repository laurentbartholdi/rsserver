//Copyright (c) Anna Alekseeva 2013-2016
//Needs Three.js and Complex.js

var PROJECTION_SPHERE_RADIUS = 0.5;

var CU = {
		projectToSphere: function (c, transform) {
			if (transform) c = transform.invert().apply(c);
			if (c == Complex["Infinity"])
				return {phi: 0, theta: Math.PI/2};
			return {phi: c.t(), 
				theta: 2*Math.atan(0.5*c.r()/PROJECTION_SPHERE_RADIUS)-Math.PI/2};
		},
		complexToLocalNormalized: function (c, transform) {
			return RSCanvas.PointConverter.sphericalToLocalNormalized(CU.projectToSphere(c, transform));
		},
		localToComplex: function (pos, transform) {
			
			return CU.sphercicalToComplex(RSCanvas.PointConverter.localToSpherical(pos), transform); 
		},
		sphercicalToComplex: function (sph, transform) {
			
			var c;
			if (sph.theta == Math.PI*.5) c = transform instanceof MoebiusTransform ? transform.infinityImage() : Complex["Infinity"];
			else
				c = Complex.Polar(
					2*PROJECTION_SPHERE_RADIUS*Math.tan(0.5*(sph.theta + Math.PI*.5)), 
					sph.phi);
			if (transform instanceof MoebiusTransform) c = transform.apply(c);
			return c;
		},
		//TODO perhaps not in use any more
		complexToTexture: function (c, transform) {
			var uv = CU.sphericalToUV(CU.projectToSphere(c, transform));
			return new THREE.Vector2(
					2*textureSize*uv.u, 
					textureSize*uv.v);
		},
		
		sphericalToUV: function (sph) {
			var u = 0.5*(sph.phi/Math.PI+1);
			while (u < 0) u+= 1;
			while (u > 1) u-=1;
			return {u: u, v: (sph.theta/Math.PI+.5)};
		}, 

		getDistance: function (z1, z2) {
			return Math.sqrt(this.getDistance2(z1, z2));
		},
		getDistance2: function (z1, z2) {
			if (z1.equals(z2)) {
				return 0;
			}
			else if (z1.equals(Complex["Infinity"])){
				return 1/(1 + z2.r2());
			} else if (z2.equals(Complex["Infinity"])) {
				return 1/(1+z1.r2());
			} else 
				return z1.sub(z2).r2()/((1+z1.r2())*(1+z2.r2()));
		},
		
		transformVector: function (pos, transform) {
			return CU.complexToLocalNormalized(CU.localToComplex(pos), 
					transform).multiplyScalar(pos.length());
		}
		

};

Complex.prototype.projectToSphere = function() {return CU.projectToSphere(this);};
Complex.prototype.toLocalNormalized = function () {return CU.complexToLocalNormalized(this);};
Complex.prototype.toTexture = function () {return CU.complexToTexture(this);};


ComplexMatrix = function (data) {
	this.data = data;
	this.dimHeight = data.length;
	if (this.dimHeight > 0) {this.dimWidth = data[0].length;}
	else {this.dimWidth = 0;}
};

ComplexMatrix.prototype = {
		constructor: ComplexMatrix,
		
		subMatrix: function (col, row) {
			var _dimWidth = this.dimWidth;
			var _dimHeight = this.dimHeight;
			var _data = this.data;
			if (!row) row = 0;
			if (col >= _dimWidth || row >= _dimHeight) {
				console.warn("Invalid complex subMatrix dimentions " + row + ", " + col + " (" + _dimWidth + "x" + _dimHeight + ")");
			}
			var subData = [];
			for (var i = 0; i < _dimHeight; i++) {
				if (i != row) {
					var curRow = [];
					for (var j = 0; j < _dimWidth; j++)
						if (j != col) curRow.push(_data[i][j]);
					subData.push(curRow);
				}
			}
			return new ComplexMatrix(subData);
		},

		determinant: function() {
			var _dimWidth = this.dimWidth;
			var _dimHeight = this.dimHeight;
			var _data = this.data;
			if (_dimWidth != _dimHeight || _dimWidth < 1 || _dimHeight < 1) {
				console.warn("Invalid complex matrix dimentions " + _dimWidth + "x" + _dimHeight);
				return null;
			}
			if (_dimWidth == 1 && _dimHeight == 1) {
				return _data[0][0];
			}
			var res = new Complex(0, 0, 0, 0);
			var ind = -1;
			for (var i = 0; i < _dimWidth; i++) {
				ind = -ind;
				var c = ind > 0 ? this.subMatrix(i).determinant() : Complex.neg(this.subMatrix(i).determinant());
				res = res.add(c.mult(_data[0][i], true), true);
			}
			return res;

		},
		
		toString: function() {
			var s = "ComplexMatrix [";
			for (var i = 0; i < this.dimHeight; i++){
				s += "[";
				for (var j = 0; j < this.dimWidth; j++) {
					s += this.data[i][j].toString(true) + (j == this.dimWidth - 1 ? "]":", ");
				}
			}
			s += "]";
			return s;
		}

		
};

MoebiusTransform = function (a, b, c, d){
	if ((a instanceof Complex) && (b instanceof Complex) && (c instanceof Complex) && (d instanceof Complex)  ) {
		this.a = a;
		this.b = b;
		this.c = c;
		this.d = d;
	} else {
		console.error("Invalid Moebius Transformation arguments", a, b , c, d);
	}
	
};


/**
 * A Moebius transformation in the form w = (a*z+b)/(c*z+d), given by four ComplexNumber parameters a, b, c, d.
 */
MoebiusTransform.prototype = {
		constructor: MoebiusTransform,
		apply: function(z) {
			if (z == Complex["Infinity"]) return this.infinityImage();
			return this.a.mult(z).add(this.b).divBy(this.c.mult(z).add(this.d));
		},
		infinityImage : function() {
			if (Math.abs(this.c.re) < Complex.epsilon && Math.abs(this.c.i) < Complex.epsilon) return Complex["Infinity"];
			return this.a.divBy(this.c);
		},
		/**
		 * Returns inverted transformation. Does not change initial transformation. 
		 */
		invert: function() {
			if (!this.invertObj) 
				this.invertObj = new MoebiusTransform(
						this.d, 
						Complex.neg(this.b), 
						Complex.neg(this.c), 
						this.a);
			return this.invertObj;
		},
		/**
		 * Returns superposition of initial and given transformations. Doesn't change initial transformation.
		 * this.superpos(t).apply(z) = t.apply(this.apply(z));
		 */
		superpos: function(t) {
			return new MoebiusTransform (
					this.a.mult(t.a).add(this.c.mult(t.b)), 
					this.b.mult(t.a).add(this.d.mult(t.b)), 
					this.a.mult(t.c).add(this.c.mult(t.d)), 
					this.b.mult(t.c).add(this.d.mult(t.d)));
		},
		
		scale: function (w){
			var num = this.d.mult(w).sub(this.b);
			var den = this.c.mult(w).sub(this.a);
			
			return this.determinantAbs()/(num.r2() + den.r2());
		},
		determinant: function() {
			if (!this._determinant) {this._determinant = this.a.mult(this.d).sub(this.b.mult(this.c));}
			return this._determinant;
		},
		determinantAbs: function() {
			if (!this._determinantAbs) {
				this._determinantAbs = this.determinant().r();
			}
			return this._determinantAbs;
		},
		
		//returns maximal distortion of sphere surface
		getMetric: function () {
			var A = Math.max(1, .5*(this.a.r2() + this.b.r2() + this.c.r2() + this.d.r2())/this.determinantAbs());

			return A+Math.sqrt(A*A-1);
			
		},
		
		getCenter: function () {
			var s0 = (this.a.r2() + this.b.r2())/this.determinantAbs();
			var sInf = (this.c.r2()+this.d.r2())/this.determinantAbs();
			if (s0*sInf == 1) return Complex["0"];
			var sPlus = s0 + sInf;
			var rho = 0.5*(s0-sInf + Math.sqrt(sPlus*sPlus-4))/Math.sqrt(s0*sInf - 1);
			var t = this;
			var theta = t.a.mult(Complex.conj(t.c)).add(t.b.mult(Complex.conj(t.d))).t();
			return Complex.Polar(rho, theta);
		},
		
		//relative distortion between this and argument
		getDistance: function (t) {
			if (t instanceof MoebiusTransform) {
				return this.superpos(t.invert()).getMetric() - 1;
			} else {
				console.error("Invalid transform", t);
				return 0;
			}
		},
		
		findOpposite: function(z) {
			var w = this.invert().apply(z);
			//console.log("findOpposite(" + z.toString(true) + ") w=" + w.toString(true), this.invert().toString());
			var thetaphi = CU.projectToSphere(w);
			var phi_ = thetaphi.phi < Math.PI ? thetaphi.phi + Math.PI : thetaphi.phi - Math.PI; 
			var thetaphi_ = {theta: -thetaphi.theta, phi: phi_};
			var w_ = CU.sphercicalToComplex(thetaphi_); 
			return this.apply(w_);
		},
		
		copy: function() {
			return new MoebiusTransform(this.a, this.b, this.c, this.d);
		},
		equals: function (t) {
			return (this.superpos(t.invert()).isIdentity());
		},
		
		isIdentity: function () {
			return this.a.equals(this.d) && 
				this.b.equals(Complex["0"]) && 
				this.c.equals(Complex["0"]);
		},
		isLinear: function () {
			return this.c.equals(Complex["0"]);
		},

		//for human reading
		toString : function() {
			return "Moebius transformation: " +
					"a=" + this.a.toString(true) + " " +
					"b=" + this.b.toString(true) + " " +
					"c=" + this.c.toString(true) + " " +
					"d=" + this.d.toString(true);
			
			
		},
		toXML : function () {
			var res = createEmptyNode("transform");
			res.appendChild(this.a.toXMLObj());
			res.appendChild(this.b.toXMLObj());
			res.appendChild(this.c.toXMLObj());
			res.appendChild(this.d.toXMLObj());
			return res;
			
		},
		//for automatic parsing
		getRawString: function() {
			var res = "";
			res += this.a.re + " " + this.a.i + " ";
			res += this.b.re + " " + this.b.i + " ";
			res += this.c.re + " " + this.c.i + " ";
			res += this.d.re + " " + this.d.i;
			return res;
		}

};
/**
 * Returns a Moebius transformation, projecting three points given in the first argument
 * to the corresponding points in the second.
 * z - an array of three Complex (initial points)
 * w - an array of three Complex (projections)
 */
MoebiusTransform.byInitEndVectors = function (z, w) {
	if (!z || !w || z.length < 3 || w.length < 3) {
		console.warn("Invalid moebius transform arguments " + z + " " + w);
		return null;
	}
	var identVector = [];
	for (var i = 0; i <= 3; i++) identVector.push(Complex["1"]);
	var wholeMatrixData = [];
	wholeMatrixData.push(identVector);
	for (var j = 0; j < 3; j++) {
		var row = [];
		row.push(z[j].mult( w[j]));
		row.push( z[j]); 
		row.push(w[j]);
		row.push(Complex["1"]);
		wholeMatrixData.push(row);
	}
	var M = new ComplexMatrix(wholeMatrixData);
	return new MoebiusTransform(M.subMatrix(1).determinant(),
		M.subMatrix(3).determinant(),
		M.subMatrix(0).determinant(),
		M.subMatrix(2).determinant());                 
}

MoebiusTransform.zoomTransform = function (w0, scale) {
	var zoom = new MoebiusTransform(new Complex(scale,0), w0,
			new Complex(-scale*w0.re, scale*w0.i), Complex["1"]);
	return new MoebiusTransform(Complex["1"], new Complex(0, -1),
			new Complex(0, -1), Complex["1"]).superpos(zoom);
}

MoebiusTransform.focusTransform = function (center) {
	if (center.isInfinity()) return new MoebiusTransform(Complex["0"], Complex["1"],
														Complex["1"], Complex["0"]);		
	return new MoebiusTransform(Complex["1"], center,
			new Complex(-center.re, center.i), Complex["1"]);
}

MoebiusTransform.fromXML = function (transformData) {
	var type = transformData.getAttribute("type");
	if (type == "identity") return MoebiusTransform.identity;
	if (type == "zoom") {
		var scale = parseFloat(transformData.getAttribute("scale"));
		if (isNaN(scale)) {
			scale = 1;
			console.warn("Invalid transform scale", transformData.getAttribute("scale"));
		}
		var w0;
		var w0Node = transformData.getElementsByTagName("cn")[0];
		if (w0Node) {
			w0 = Complex.fromXML(w0Node);
			if (!(w0 instanceof Complex)) {
				console.warn("Invalid transform argument", w0Node);
				w0 = Complex["0"];
				
			}
		} else {
			w0 = Complex["0"];
		}
		return MoebiusTransform.zoomTransform(w0, scale);
	}
	var trarr = [];
	for (var i = 0; i < transformData.childNodes.length; i ++)
		trarr.push(Complex.fromXML(transformData.childNodes[i]));
	if (type == "linear" && trarr.length >= 2) {
		return new LinearTransform(trarr[0], trarr[1]);
	} else if (trarr.length >=4) {
		return new MoebiusTransform(trarr[0], trarr[1], trarr[2], trarr[3]);
	} else {
		console.error("Data error. Incorrect 'transform' node.", transformData);
		return null;
		
	}

}


MoebiusTransform.identity = 
	new MoebiusTransform (Complex["1"], Complex["0"], Complex["0"], Complex["1"]);
MoebiusTransform.identity.apply = function(z) {	return z;};
MoebiusTransform.identity.invert = function() {return MoebiusTransform.identity;};
MoebiusTransform.identity.superpos = function (t) {return t;};
MoebiusTransform.identity.infinityImage = function() { return Complex["Infinity"];};
MoebiusTransform.identity.isIdentity = function () {return true;};

LinearTransform = function(a, b) {
	MoebiusTransform.call(this, a, b, Complex["0"], Complex["1"]);
};
LinearTransform.prototype = Object.create(MoebiusTransform.prototype);
var LTp = LinearTransform.prototype;
LTp.constructor = LinearTransform;
LTp.apply = function (z) {return z.mult(this.a).add(this.b);};
LTp.infinityImage = function() {return Complex["Infinity"]};
LTp.invert = function() {
	return new LinearTransform(Complex["1"].divBy(this.a), Complex.neg(this.b.divBy(this.a)));
};
LTp.isLinear = function() {return true};

//----------------------Test functions--------------------------------------
function getComplexValueByName (name) {
	var inputControlName = "test-transform-" + name;
	var re = Number(document.getElementById(inputControlName+"-re").value);
	var im = Number(document.getElementById(inputControlName+"-im").value);
	return new Complex(re, im);
};

function testTransform() {
	var t = new MoebiusTransform(getComplexValueByName("a"),
			getComplexValueByName("b"),
			getComplexValueByName("c"),
			getComplexValueByName("d"));
	currentTransform = t;
	transformUpdated = true;
	updateTextUI("abcd");

};

function setValueByName(name, z) {
	var inputControlName = "test-transform-" + name;
	document.getElementById(inputControlName+"-re").value = Math.round(z.re / Complex.epsilon)*Complex.epsilon;
	document.getElementById(inputControlName+"-im").value = Math.round(z.i/ Complex.epsilon)*Complex.epsilon;
}

function makeTransform() {
	var t = MoebiusTransform.byInitEndVectors([getComplexValueByName("z1"),
	                                           getComplexValueByName("z2"),
	                                           getComplexValueByName("z3")],
			[getComplexValueByName("w1"),
			 getComplexValueByName("w2"),
			 getComplexValueByName("w3")]);
	
	currentTransform = t;
	transformUpdated = true;
	updateTextUI("3p");

}

function updateTextUI() {
	var t = currentTransform;
	setValueByName("a", t.a);
	setValueByName("b", t.b);
	setValueByName("c", t.c);
	setValueByName("d", t.d);
	setValueByName("w1", t.apply(getComplexValueByName("z1")));
	setValueByName("w2", t.apply(getComplexValueByName("z2")));
	setValueByName("w3", t.apply(getComplexValueByName("z3")));
	var z = getComplexValueByName("z");
	var w = t.apply(z);
	document.getElementById("test-transform-w").innerHTML = w.toString(true);


	
}



