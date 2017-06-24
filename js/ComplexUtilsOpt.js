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
			if (sph.theta == Math.PI*.5) c = Complex["Infinity"];
			else
				c = Complex.Polar(
					2*PROJECTION_SPHERE_RADIUS*Math.tan(0.5*(sph.theta + Math.PI*.5)), 
					sph.phi);
			if (transform) c = transform.apply(c);
			return c;
		},
		complexToTexture: function (c, transform) {
			var uv = sphericalToUV(CU.projectToSphere(c, transform));
			return new THREE.Vector2(
					2*textureSize*uv.u, 
					textureSize*uv.v);
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
			} else if (z2.equals(Cmolex["Infinity"])) {
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
	this.a = a;
	this.b = b;
	this.c = c;
	this.d = d;
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
		
		isIdentity: function () {
			return this.a.equals(this.d) && 
				this.b.equals(Complex["0"]) && 
				this.c.equals(Complex["0"]);
		},

		//for human reading
		toString : function() {
			return "Moebius transformation: " +
					"a=" + this.a.toString(true) + " " +
					"b=" + this.b.toString(true) + " " +
					"c=" + this.c.toString(true) + " " +
					"d=" + this.d.toString(true);
			
			
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



