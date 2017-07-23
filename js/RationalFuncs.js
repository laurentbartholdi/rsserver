//Copyright (c) Anna Alekseeva 2013-2016

function leastCommonMultiple (args, l) {
	l = l || args.length;
	if (l < 1) return;
	if (l == 1) return args[0];
	if (l == 2) 
		return args[0]*args[1]/greatestCommonDivisor(args[0], args[1]);
	return leastCommonMultiple([leastCommonMultiple(args, l-1), args[l-1]]);
}
function greatestCommonDivisor (a, b) {
	var c, m, n;
	n = a > b? a : b;
	m = a > b? b : a;
	c = n % m; 
	while (c > 0) {
		n = m;
		m = c;
		c = n % m;
	}
	return m;
}

function vectorToComplex(v) {
	return new Complex(v.x, v.y);
}
function complexToVector(c) {
	return new THREE.Vector2(c.re, c.i);
}
function roundTo(x, par) {
	if (par) return Math.round(x/par)*par;
	return Math.round(x);
}

function getOutputDomElement(dataObject, node, precision) {
	if (dataObject.num && dataObject.den) {
		var res;
		res = node || document.createElement("div");
		var isPolyNum = nonZeroMembersNumber (dataObject.num) > 1;
		var isPolyDen = nonZeroMembersNumber (dataObject.den) > 1;
		var denTrivial = !isPolyDen && vectorToComplex(dataObject.den[0]).equals(Complex["1"]);
		
		res.innerHTML = "f(z) = " + ((isPolyNum && !denTrivial)? "(" : "");
		getPolyString("z", dataObject.num, res, precision);
		res.innerHTML += ((isPolyNum && !denTrivial) ? ")" : "") + (denTrivial ? "" : (" / " +   (isPolyDen ? "(" :"")));
		if (!denTrivial) {
			getPolyString("z", dataObject.den, res, precision);
			if (isPolyDen ) res.innerHTML += ")";
		}
		return res;
	}
}
function getZPowerHTML(argName, power, node) {
	var resHTML = power == 0 ? "" : (argName + (power == 1 ? "" : ("<sup>") + power + "</sup>"));
	node.innerHTML += resHTML;
	//console.log("geZPowerHTML", power, argName, node,resHTML);
}
function maxNonZeroPower (coefs) {
	var power = coefs.length - 1;
	for (var i = power; i >= 0; i--) {
		var a = vectorToComplex(coefs[i]);
		if ((Complex.optimized ? a.r(): a.r) > Complex.epsilon) {
			return i;
		}
	}	
	return 0;
}

	
function nonZeroMembersNumber (coefs) {
	var power = coefs.length - 1;
	var res = 0;
	for (var i = power; i >= 0; i--) {
		var a = vectorToComplex(coefs[i]);
		if ((Complex.optimized ? a.r(): a.r) > Complex.epsilon) {
			res++;
		}
	}	
	return res;

}
function getPolyString(argName, coefs, node, precision) {
	var power = coefs.length - 1;
	var firstFound = false;
	for (var i = power; i >= 0; i--) {
		var a = vectorToComplex(coefs[i]);
		if ((Complex.optimized ? a.r(): a.r) > Complex.epsilon) {
			var isComplex = Math.abs(a.re) > Complex.epsilon && Math.abs(a.i) > Complex.epsilon;
			var isNegativ = !isComplex && (a.re < -Complex.epsilon || a.i < -Complex.epsilon);
			if (isNegativ) { a = Complex(-a.re,-a.i); node.innerHTML += (firstFound ? " - " : "-"); } else node.innerHTML += (firstFound ? " + " : "");
			if (!a.equals(Complex["1"]) || i==0) node.innerHTML += (isComplex ? "(" : "") + a.toString(true, precision) + (isComplex ? ")" : "");
			getZPowerHTML(argName, i, node);
			firstFound = true;
		}
	}	
}

function makePolyArgsInit(argN, argD, degree)
{
    var res = "const vec2 " + argN + 0 + argD + 0 + " = vec2(1.0,0.0);\n";
    res += "vec2 " + argN + "1" + argD + "0 = " + argN + ";\n";
    res += "vec2 " + argN + "0" + argD + "1 = " + argD + ";\n";
    for (var j = 2; j <= degree; j++)
	res += "vec2 " + argN + j + argD + "0 = complexMul(" + argN + (j>>1) + argD + "0, " + argN + ((j+1)>>1) + argD + "0);\n";
    for (var j = 2; j <= degree-1; j++)
	res += "vec2 " + argN + "0" + argD + j + " = complexMul(" + argN + "0" + argD + (j>>1) + ", " + argN + "0" + argD + ((j+1)>>1) + ");\n";
    for (var j = 1; j <= degree-2; j++)
	res += "vec2 " + argN + j + argD + (degree-1-j) + " = complexMul(" + argN + j + argD + "0, " + argN + "0" + argD + (degree-1-j) + ");\n";
    for (var j = 1; j <= degree-3; j++)
	res += "vec2 " + argN + j + argD + (degree-2-j) + " = complexMul(" + argN + j + argD + "0, " + argN + "0" + argD + (degree-2-j) + ");\n";
    return res;
}
function makeEvalPoly(argN, argD, resName, resNameX, resNameY, resNameZ, coefs, degree)
{
    var res = resNameX + " = ";
    for (var j = 0; j <= degree-1; j++)
	res += (j > 0 ? " + " : "") + "complexMul(" + getComplexString(coefs[j]) + ", " + argN + j + argD + (degree-1-j) + ")";
    res += ";\n";
    res += resNameY + " = ";
    for (var j = 1; j <= degree-1; j++)
	res += (j > 0 ? " + " : "") + "complexMul(" + getComplexString(coefs[j].clone().multiplyScalar(j)) + ", " + argN + (j-1) + argD + (degree-1-j) + ")";
    res += ";\n";
    res += resNameZ + " = complexMul(" + getComplexString(coefs[degree].clone().multiplyScalar(degree)) + ", " + argN + (degree-1) + argD + "0);\n";
    res += resName + " = complexMul(" + argN + "0" + argD + "1, " + resNameX + ") + complexMul(" + getComplexString(coefs[degree]) + ", " + argN + degree + argD + "0);\n";
    return res;
}

function getCheckCycleLoopStringNums(varName, cycle) {
	var res = "";
	for (var i = 0; i < cycle.length; i++) {
		//if (cycle[i].x > 1e35||cycle[i].y > 1e35)
		//res += "else if (spheredist(" + varName + ",vec2(float(" + cycle[i].x + "),float("+ cycle[i].y + "))) < .001) {\n" +
		res += "else if (distance(" + varName + ",vec2(" + getFloatString(cycle[i].x) + ","+ getFloatString(cycle[i].y) + ")) < .001) {\n" +
				"j = " + (i + 1)*50 +"\n;" +
						"break;\n}\n";
	}
	return res;
}
function getFloatString(n) {
	var s = n.toString();
	if (s.indexOf(".") == -1 && s.indexOf("e") == -1)
		s += ".0";
	return s;
}
function getComplexString(coef) {
        var res = "vec2(" + getFloatString(coef.x) + ", " + getFloatString(coef.y) + ")";
        return res;
}
function getColorString(c/*THREE.Color*/) {
	return "vec3(" + getFloatString(c.r) + ", " 
	+ getFloatString(c.g) + ", "+ getFloatString(c.b) + ")";
}

function mergeSettingsObjects (baseObj, newObj) {
	var changed = false;
	for (var f in newObj)
		if (newObj.hasOwnProperty(f))
			{if (baseObj.hasOwnProperty(f) && baseObj[f] != newObj[f])
				changed = true;
				baseObj[f] = newObj[f];
			}
	return changed;	
}
function getConstUniforms (data, keys) {
	var res = {};
	//console.log("getConstUniforms");
	for (var i = 0; i < keys.length; i++){
		res[keys[i]] = {};
		res[keys[i]].type = ConfigManager.getFieldValueType(keys[i]);
		res[keys[i]].value = data[keys[i]] || ConfigManager.getDefaultValue(keys[i]);
		res[keys[i]].constant = true;
		//console.log(keys[i], res[keys[i]].value);
	}
	return res;
}

var ComplexShaderMap = function (code, polar, uniforms, methods) {
	this.code = code;
	this.polar = polar ? true : false;
	this.uniforms = uniforms ? uniforms : {};
	this.uniformsDeclaration = uniforms ? getUniformsDeclaration(uniforms) : "";
	this.methods = methods ? methods : "";
	//makes a GLSL string declaring variables given in argument
	
	function getUniformsDeclaration(uniforms) {
		var res = "";
		for (var name in uniforms) {
			res += (uniforms[name].constant ? "const " : "uniform ") + ComplexShaderMap.uniformsTypesMap[uniforms[name].type].glsl + " " +
					name + (uniforms[name].constant ? ("= " + (uniforms[name].type == "f" ? getFloatString(uniforms[name].value):uniforms[name].value)) : "") +
					(ComplexShaderMap.uniformsTypesMap[uniforms[name].type].array ? 
							(" [" + (ComplexShaderMap.uniformsTypesMap[uniforms[name].type].piece > 1 ? 
									(uniforms[name].value.length/ComplexShaderMap.uniformsTypesMap[uniforms[name].type].piece):
										(uniforms[name].value.length)) + "]"): "") + ";\n"; 
			if (ComplexShaderMap.uniformsTypesMap[uniforms[name].type].array) {
				res += "const int " + name + "Length = " + (ComplexShaderMap.uniformsTypesMap[uniforms[name].type].piece > 1 ? 
						(uniforms[name].value.length/ComplexShaderMap.uniformsTypesMap[uniforms[name].type].piece):
							(uniforms[name].value.length)) + ";\n";
			}
		}
		return res;
		
	};
	this.updateUniformsDeclaration = function() {
		this.uniformsDeclaration = getUniformsDeclaration(this.uniforms);
	};

};

//Correspondence between three.js shader material uniforms types and GLSL types
ComplexShaderMap.uniformsTypesMap = {
		i: {glsl: "int"},
		f: {glsl: "float"},
		v2: {glsl: "vec2"},
		v3: {glsl: "vec3"},
		v4: {glsl: "vec4"},
		m4: {glsl: "mat4"},
		c: {glsl: "vec3"},
		iv1: {glsl: "int", array: true},
		iv: {glsl: "ivec3", array: true, piece: 3},
		fv1: {glsl: "float", array: true},
		fv: {glsl: "vec3", array: true, piece: 3},
		v2v: {glsl: "vec2", array: true},
		v3v: {glsl: "vec3", array: true},
		v4v: {glsl: "vec4", array: true},
		m4v: {glsl: "mat4", array: true}
};

var complexToColorString_ = 	"vec3 complex2rgb(vec2 n, vec2 d){ \n" +
"	float nl = length(n);\n" +
"	float dl = length(d);\n" +
//!!!!!!!!!!!!!!!!
"	float theta = atan(2.*dl*nl, nl*nl - dl*dl)/1.570796327;//float(!isNaN(z))*length(z) + float(isNaN(z))*.5; \n"+
"	float phi = atan(n.y*d.x - n.x*d.y, dot(n, d));//float(!isNaN(z))*atan(z.y, z.x); \n"+
"   vec3 c = vec3(phi < 0. ? phi/6.283185307 + 1. : phi/6.283185307,clamp(2.-theta, 0.0, 1.0), clamp(theta, 0.0, 1.0)); \n" +
 "   vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);\n" +
  "  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);\n" +
   " return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);\n" +
"}";

var complexToColorString = 	"vec3 complex2rgb(vec2 n, vec2 d){\n"+ // n/d is a normalized P1 point
"  vec3 p = vec3(2.*dot(n,d),2.*(n.y*d.x-n.x*d.y),dot(d,d)-dot(n,n));\n"+  // project to sphere in R^3
"  return smoothstep(-0.5,1.0,p*mat3(vec3(1.0,0.0,0.0),vec3(-0.5,0.866025,0.0),vec3(-0.5,-0.866025,0.0)))+p.z*vec3(1.0,1.0,1.0);\n"+ // combination of red at 1, green at omega, blue at omega^2, white at 0, and black at infinity
"}";


var complexToColorString__ = 	"vec3 complex2rgb(vec2 n, vec2 d){ \n"+ // n/d is a normalized P1 point
"    float nl = length(n);\n" +
"    float dl = length(d);\n" +
"    float theta = atan(2.*dl*nl, nl*nl - dl*dl)/1.570796327;//float(!isNaN(z))*length(z) + float(isNaN(z))*.5; \n"+
"    float phi = atan(n.y*d.x - n.x*d.y, dot(n, d)) / 6.283185307;\n"+
"    vec3 c = vec3(phi,nl/(nl+dl),clamp(2.0*dl/(nl+dl),0.0,1.0)); //clamp(2.-theta, 0.0, 1.0), clamp(theta, 0.0, 1.0)); \n" +
"    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);\n" +
"    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);\n" +
"    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);\n" +
"}";


function initJuliaMap(dataStructure, oldMap, settings) {//checkTriggers) {
///	var checkJulia = typeof(checkTriggers) == "boolean" ? checkTriggers : (checkTriggers.checkJulia === undefined ? false : checkTriggers.checkJulia);
	settings = settings || {};
	var checkJulia = settings.hasOwnProperty("checkJulia") ? settings.checkJulia : true;
	var jData = {};
	if (oldMap) mergeSettingsObjects(jData, oldMap.initData);
	parseJuliaData(dataStructure, jData);
	if (!jData.hasOwnProperty("config")) jData.config = {};
	mergeSettingsObjects(jData.config, settings);
	
	var juliatestUniforms = getConstUniforms(jData.config, ["Iterations", 
			"actualInfinity", "pixelSize", "minIterNum", "minIterNumJulia", 
			"runAwayRadius", "convergeEpsilon"]);
	juliatestUniforms.commonCyclePeriod = {
			type: "i", 
			value:(jData.cycleperiod ? (jData.cycleperiod.length ? (leastCommonMultiple(jData.cycleperiod) || 1) : 1):1), 
			constant: true
	};
	//console.log("cyclePeriod", jData.cycleperiod);
	var juliaColor = jData.config.juliaColor || new THREE.Color(0x999999);
	//console.log("jData ", jData);
	var juliatestMethods = jData.degree > 1 ? [	
	"// Color parameters",
	complexToColorString,

	"vec2 complexMul(vec2 a, vec2 b) {",
	"	return vec2(a.x*b.x-a.y*b.y,dot(a.xy,b.yx));",
	"}",
	"vec2 complexDiv(vec2 a, vec2 b) {", // unused
	"	return vec2(dot(a,b),a.y*b.x-a.x*b.y)/dot(b,b);",
	"}",

	"vec3 color(vec2 c, vec2 z, vec2 w , float scale) {", // scale unused
	"  float lambda = inversesqrt(dot(z,z)+dot(w,w));",
	"  vec2 n0 = z*lambda;",
	"  vec2 d0 = w*lambda;", // n0/d0 is the beginning point, normalized
	//"  return complex2rgb(n0,d0);", // test sphere color
	"  vec2 n = n0, d = d0, nx, dx, ny, dy, nz, dz, t;",
	"  float dz2 = pixelSize/scale/(1.+ dot(c, c));",
	"  dz2 *= dz2;", // we store |dz|^2 to avoid square roots
	"  for (int i = 0; i < Iterations; i++) {",
	makePolyArgsInit("n", "d", jData.degree),
	makeEvalPoly("n", "d", "n", "nx", "ny", "nz", jData.num, jData.degree),
	makeEvalPoly("n", "d", "d", "dx", "dy", "dz", jData.den, jData.degree), 
	"    lambda = inversesqrt(dot(n,n)+dot(d,d));",
	"    t = complexMul(ny,d)+complexMul(nz,dx)-complexMul(dy,n)-complexMul(dz,nx);",
        "    float lambda2 = lambda*lambda;",
	"    n *= lambda;",
	"    d *= lambda;", // n/d is new point, normalized
        "    float lambda4 = lambda2*lambda2;",
	"    dz2 *= dot(t,t);",
        "    dz2 *= lambda4;",
        "    t = complexMul(d,n0)-complexMul(n,d0);", // distance to n0/d0
        "    if (dz2 > dot(t,t)) return " + getColorString(juliaColor) + ";",
        "    if (" + (juliatestUniforms.commonCyclePeriod.value == 1 ? "" : "(i - commonCyclePeriod*(i/commonCyclePeriod) == 0) && ") + "dz2 < convergeEpsilon) return complex2rgb(n,d);",
	"  }",
	"  return complex2rgb(n,d);", // unknown, this is our best guess
	"}"
	].join("\n") : 
		[	
			"// Color parameters",
			complexToColorString,

			"vec2 complexMul(vec2 a, vec2 b) {",
			"	return vec2(a.x*b.x-a.y*b.y,dot(a.xy,b.yx));",
			"}",
			"vec2 complexDiv(vec2 a, vec2 b) {", // unused
			"	return vec2(dot(a,b),a.y*b.x-a.x*b.y)/dot(b,b);",
			"}",

			"vec3 color(vec2 c, vec2 z, vec2 w , float scale) {", // scale unused
			"  float lambda = inversesqrt(dot(z,z)+dot(w,w));",
			"  vec2 n0 = z*lambda;",
			"  vec2 d0 = w*lambda;", // n0/d0 is the beginning point, normalized
			"  return complex2rgb(n0,d0);", // test sphere color
			"}"
			].join("\n");
//console.log(juliatestMethods, juliatestUniforms);	
	var juliatestCode = [
	 	              	"vec3 v = vec3(0.0,0.0,0.0);",
	 	              	"v = color(c, z, w, scale);",
	 	              	"r = v.x;",
	 	              	"g = v.y;",
	 	              	"b = v.z;"
	 	              ].join("\n");
	var resMap = new ComplexShaderMap(juliatestCode, false, juliatestUniforms, juliatestMethods);
	resMap.initData = jData;
	//console.log("data.xml", resMap.initData.xml);
	return resMap;

}
