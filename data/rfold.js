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
			if (a.equals(Complex["-1"])) node.innerHTML += (i==0 ? (firstFound ? " - 1" : "-1") : (firstFound ? " - " : "-")) 
			else node.innerHTML += ((firstFound && !isNegativ) ? " + " : "") + ((a.equals(Complex["1"]) && i > 0) ? "" : ( (isComplex ? "(" : "") + a.toString(true, precision) + (isComplex ? ")" : "")));
			getZPowerHTML(argName, i, node);
			firstFound = true;
		}
	}	
}


function makePowerVarsDeclaration(argName, power){
	var res = "";
	for (var j=1; j<=power; j++) {
		res += "vec2 " + argName + j + ";\n";
	}
	return res;
}

function makePolynomArgsDeclaration(argName1, argName2, power) {
	var res = makePowerVarsDeclaration(argName1, power);
	res += makePowerVarsDeclaration(argName2, power);
	for (var j = 1; j <= power-1; j++) {
		res += "vec2 " + argName1 + argName2 + j + ";\n";
	}
	return res;
	
}
function makePowerVarsInit(argName, power, exitVarName){
	var res= argName + "1 = float(!" + exitVarName + ")*" + argName + ";\n";
	for (var j=2; j<=power; j++) {
		res += argName + j + " = complexMul(" + argName + (j-1) + ", " + argName + "1);\n";
	}
	return res;
}
function makePolynomArgsInit(argName1, argName2, power, exitVarName) {
	exitVarName = exitVarName ? exitVarName : "isinfinity";
	var res = makePowerVarsInit(argName1, power, exitVarName);
	res += makePowerVarsInit(argName2, power, exitVarName);
	for (var j = 1; j < power; j++) {
		res += argName1 + argName2 + j + " = complexMul(" + argName1 + j + ", " + argName2 + (power - j) + ");\n";
	}
	return res;
}
function makeEvalPoly(argName1, argName2, resName, coefs) {
	var power = coefs.length - 1;
	var res = resName + " = complexMul(vec2(" + getFloatString(coefs[power].x) +
		", " + getFloatString(coefs[power].y) + "), " + argName1 + power + ");\n";
	for (var k = power - 1; k >= 1; k --) {
		res += resName + " = " + resName + " + complexMul(vec2(" + getFloatString(coefs[k].x) +
		", " + getFloatString(coefs[k].y) + "), " + argName1 + argName2 + k + ");\n";
	}
	res += resName + " = " + resName + " + complexMul(vec2(" + getFloatString(coefs[0].x) +
	", " + getFloatString(coefs[0].y) + "), " + argName2 + power + ");\n";
	return res;
}

/** /function getEvalPolyLoopNums(varName, resName, coefs) {
var l = coefs.length - 1;
var res = resName + " = vec2(float(" + coefs[l].x + "), float(" + coefs[l].y + "));\n";
for (var i = l - 1; i >=0; i--) {
	res += resName + " = complexMul(" + varName + "," + resName + ") +" +
			" vec2(float(" + coefs[i].x + ") ,float(" + coefs[i].y + "));\n";
}
return res;
}/**/
/** /function getEvalPolyLoopNums(varName, resName, coefs) {
	var l = coefs.length - 1;
	var res = resName + " = vec2(" + getFloatString(coefs[l].x) + ", " + getFloatString(coefs[l].y) + ");\n";
	for (var i = l - 1; i >=0; i--) {
		res += resName + " = complexMul(" + varName + "," + resName + ") +" +
				" vec2(" + getFloatString(coefs[i].x) + " ," + getFloatString(coefs[i].y) + ");\n";
	}
	return res;
	}/**/

/**/function getEvalPolyLoopNums(varName, resName, coefs) {
	var l = coefs.length - 1;
	var res = resName + " = ";//vec2(" + getFloatString(coefs[l].x) + ", " + getFloatString(coefs[l].y) + ");\n";
	for (var i = 0; i <l; i++) {
		res +=  "vec2(" + getFloatString(coefs[i].x) + ", " + getFloatString(coefs[i].y) + ") + complexMul(";
				
	}
	res += " vec2(" + getFloatString(coefs[l].x) + " ," + getFloatString(coefs[l].y) + ")";
	for (var j = 0; j < l; j++)
		res += "," + varName + ")";
	res += ";\n";
	return res;
	}/**/

/**/function getEvalPolyLoopInverseNums(varName, resName, coefs) {
	var l = coefs.length - 1;
	var res = resName + " = ";//vec2(" + getFloatString(coefs[l].x) + ", " + getFloatString(coefs[l].y) + ");\n";
	for (var i = l; i >0; i--) {
		res +=  "vec2(" + getFloatString(coefs[i].x) + ", " + getFloatString(coefs[i].y) + ") + complexMul(";
				
	}
	res += " vec2(" + getFloatString(coefs[0].x) + " ," + getFloatString(coefs[0].y) + ")";
	for (var j = 0; j < l; j++)
		res += "," + varName + ")";
	res += ";\n";
	return res;
	}/**/

/** /function getEvalPolyLoopInverseNums(varName, resName, coefs) {
	var res = resName + " = vec2(" + getFloatString(coefs[0].x) + "," + getFloatString(coefs[0].y) + ");\n";
	for (var i = 1; i < coefs.length; i++) {
		res += resName + " = complexMul(" + varName + "," + resName + ") + vec2(" + getFloatString(coefs[i].x) + "," + getFloatString(coefs[i].y) + ");\n";
	}
	return res;
}/**/

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
	console.log("getConstUniforms");
	for (var i = 0; i < keys.length; i++){
		res[keys[i]] = {};
		res[keys[i]].type = ConfigManager.getFieldValueType(keys[i]);
		res[keys[i]].value = data[keys[i]] || ConfigManager.getDefaultValue(keys[i]);
		res[keys[i]].constant = true;
		console.log(keys[i], res[keys[i]].value);
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
					name + (uniforms[name].constant ? ("= " + (uniforms[name].type == "f" ? getFloatString(uniforms[name].value):
																							((ComplexShaderMap.uniformsTypesMap[uniforms[name].type].glsl.substr(0, 3) == "vec" || 
																									ComplexShaderMap.uniformsTypesMap[uniforms[name].type].glsl.substr(0, 3) == "mat")? 
																											(getVectorDeclarationString(uniforms[name])) :
																										
																										uniforms[name].value))) : "") +
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
		function getVectorDeclarationString(data) {
			//console.log("prcessing vector", data);
			var s = ComplexShaderMap.uniformsTypesMap[data.type].glsl + "(";
			for (var ij = 0; ij < data.value.length; ij++) {
				//console.log(ij, data.value[ij],  getFloatString(data.value[ij]), s);
				s += getFloatString(data.value[ij]) + ((ij < data.value.length -1) ? ", " : ")");
			}

			return s;
			
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

var complexToColorString = 	"vec3 complex2rgb(vec2 z){ \n" +
"	float l = float(!isNaN(z))*length(z) + float(isNaN(z))*.5; \n"+
"	float phi = float(!isNaN(z))*atan(z.y, z.x); \n"+
"   vec3 c = vec3(phi < 0. ? phi/6.283185307 + 1. : phi/6.283185307,clamp(l, 0.0, 1.0), clamp(1./l, 0.0, 1.0)); \n" +
 "   vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);\n" +
  "  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);\n" +
   " return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);\n" +
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
	juliatestUniforms.invInfinity = {
			type: "f",
			value: 1./(jData.config.actualInfinity || ConfigManager.getDefaultValue("actualInfinity")),
			constant: true
	}
	console.log("cyclePeriod", jData.cycleperiod);
	console.log("jData", jData);
	var juliaColor = jData.config.juliaColor || new THREE.Color(0x999999);
	var juliatestMethods_ = [	
	"// Color parameters",
	"bool isInf(vec2 v) {",
	"	return v.x > actualInfinity || v.x < -actualInfinity || v.y > actualInfinity || v.y < -actualInfinity;",
	"}",
	"bool isNaN(float val)",
	"{",
	  "return (val <= 0.0 || 0.0 <= val) ? false : true;",
	"}",
	"bool isNaN(vec2 v) {",
	" return isNaN(v.x) || isNaN(v.y);",
	"}",
	complexToColorString,
	"vec2 complexMul(vec2 a, vec2 b) {",
	"	return vec2( a.x*b.x -  a.y*b.y,a.x*b.y + a.y * b.x);",
	"}",
	"vec2 complexDiv(vec2 a, vec2 b) {",
	"	return vec2( a.x*b.x +  a.y*b.y,-a.x*b.y + a.y * b.x)/dot(b,b);",
	"}",

	"vec3 color(vec2 c, vec2 z, vec2 w, float scale) {",
	" 	vec2 n = z;",
	"   vec2 d = w;",
	"   float lambda;",
	"  bool isinfinity = false;",
	makePolynomArgsDeclaration("n", "d", jData.num.length - 1),
	"	for (int i = 0; i <= Iterations; i++) {",
	makePolynomArgsInit("n", "d", jData.num.length - 1),
	makeEvalPoly("n", "d", "n", jData.num),
	makeEvalPoly("n", "d", "d", jData.den), 
	" isinfinity = isinfinity || isNaN(n) || isNaN(d) || isInf(n) || (abs(d.x) + abs(d.y)) < 1e-35;",
	"lambda = 2./(abs(n.x) + abs(n.y) + abs(d.x) + abs(d.y));",
	"n *= lambda;",
	"d *= lambda;",
	"	}",
	"       return float(!isinfinity)*complex2rgb(complexDiv(n, d));",
	"}"
	].join("\n");
	var nMax = jData.num[jData.num.length - 1];
	var dMax = jData.den[jData.den.length - 1];
	var abs2dMax = dMax.x*dMax.x + dMax.y*dMax.y;
	var checkInfinity = (abs2dMax > 1e-35);
	var infinityImage = new THREE.Vector2();
	if (checkInfinity) {
		infinityImage.setX (nMax.x*dMax.x + nMax.y*dMax.y);
		infinityImage.setY (nMax.y*dMax.x - nMax.x*dMax.y);
		infinityImage.divideScalar(abs2dMax);
		if (infinityImage.length > juliatestUniforms.actualInfinity.value) checkInfinity = false;
	}
	//TODO do something with infinity point 
	checkInfinity = false;
	if (checkInfinity) {
		juliatestUniforms.infinityImage = {
				type: "v2",
				value: [infinityImage.x, infinityImage.y],
				constant: true
		}
	};
	var juliatestMethods = [	
	                    	"// Color parameters",
	                    	"bool isInf(vec2 v) {",
	                    	"	return v.x > actualInfinity || v.x < -actualInfinity || v.y > actualInfinity || v.y < -actualInfinity;",
	                    	"}",
	                    	"bool isNaN(float val)",
	                    	"{",
	                    	  "return (val <= 0.0 || 0.0 <= val) ? false : true;",
	                    	"}",
	                    	"bool isNaN(vec2 v) {",
	                    	" return isNaN(v.x) || isNaN(v.y);",
	                    	"}",
	                    	"vec3 complex2rgb(vec2 z){",
	                    	"	float l = float(!isNaN(z))*length(z) + float(isNaN(z))*.5;",
	                    	"	float phi = float(!isNaN(z))*atan(z.y, z.x);",
	                    	"   vec3 c = vec3(phi < 0. ? phi/6.283185307 + 1. : phi/6.283185307,clamp(l, 0.0, 1.0), clamp(1./l, 0.0, 1.0));",
	                    	 "   vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);",
	                    	  "  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);",
	                    	   " return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);",
	                    	"}",
	                    	"vec2 complexMul(vec2 a, vec2 b) {",
	                    	"	return vec2( a.x*b.x -  a.y*b.y,a.x*b.y + a.y * b.x);",
	                    	"}",
	                    	"vec2 complexDiv(vec2 a, vec2 b) {",
	                    	"	return vec2( a.x*b.x +  a.y*b.y,-a.x*b.y + a.y * b.x)/dot(b,b);",
	                    	"}",

	                    	"vec3 color(vec2 c, vec2 z, vec2 w, float scale) {",
	                    	" 	vec2 n = z;",
	                    	"   vec2 d = w;",
	                    	"    vec2 dn, dd, czdiff, dernum;",
	                    	"  vec2 nfinal =n;",
	                    	"vec2 dfinal= d;", 
	                    	"vec2 complex1 = vec2(1., 0.);",
	                    	"   float lambda;",
	                    	"  bool isinfinity = false;",
	                    	"  bool isJulia = false;",
	                    	"  bool isFatou = false;",
	                    	"  bool finish = false;",
	                    	" float floatFinish = 0.;",
	                    	" float floatUnFinish = 1.;",
	                    	" float absz2 = dot(c, c);",
	                    	"  float absdn2inv, absn2, absd2;",
	                    	"  float factorc = 1./(1.+ absz2);",
	                    	"     float dz2=pixelSize/scale*factorc;",
	                    	"  dz2 *= dz2;",
	                    	"  float dz2factor;",
	                    	makePolynomArgsDeclaration("n", "d", jData.num.length - 1),
	                    	//"	float j = 0.;",
	                    	"	for (int i = 0; i <= Iterations; i++) {",
	                    	makePolynomArgsInit("n", "d", jData.num.length - 1, "finish"),
	                    	makeEvalPoly("n", "d", "dn", jData.dnum),
	                    	makeEvalPoly("n", "d", "dd", jData.dden),
	                    	makeEvalPoly("n", "d", "n", jData.num),
	                    	makeEvalPoly("n", "d", "d", jData.den), 
	                    	(!checkInfinity ? " isinfinity = isinfinity || isNaN(n) || isNaN(d) || isInf(n) || (abs(d.x) + abs(d.y)) < invInfinity;": ""),
	                    	(checkInfinity ? " isinfinity = isNaN(n) || isNaN(d) || isInf(n) || (abs(d.x) + abs(d.y)) < invInfinity;": ""),
	                    	"floatUnFinish = float(!finish);",
	                    	"floatFinish = float(finish);",
	                    	"d = floatUnFinish*d + floatFinish*complex1;",
	                    	"lambda = floatUnFinish/(abs(n.x) + abs(n.y) + abs(d.x) + abs(d.y));",
	                    	"n *= lambda;",
	                    	"d *= lambda;",
	                    	//!!!!!!!!!!!!!!!!!!!!!
	                    	//"lambda = floatUnFinish/(abs(dn.x) + abs(dn.y) + abs(dd.x) + abs(dd.y));",
	                    	
	                    	"dn *= lambda;",
	                    	"dd *= lambda;",
	                    	"dernum = complexMul(dn,d)-complexMul(dd,n);",
	                    	"absn2 = dot(n,n);",
	                    	"absd2 = dot(d,d);",
	                    	"absdn2inv = floatUnFinish/(absn2 + absd2);",
	                    	//"czdiff= n - complexMul(c,d);",
	                    	"dz2factor = absdn2inv*(1. + absz2);",
	                    	"dz2factor *= dz2factor;",
	                    	"dz2 *= dz2factor*dot(dernum, dernum);",
	                    	"nfinal = floatFinish*nfinal + floatUnFinish*n;",
	                    	"dfinal = floatFinish*dfinal + floatUnFinish*d;",
	                    	//"	isJulia = isJulia ||(	 i > 3 && dz2 > dot(czdiff, czdiff)*factorc*absdn2inv ); ",
	                    			"	isJulia = isJulia ||(	 i > minIterNumJulia && dz2 > runAwayRadius ); " ,
	                    			"isFatou = isFatou || (i > minIterNum " + 
	                    			(juliatestUniforms.commonCyclePeriod.value > 1 ?  "&& (i - commonCyclePeriod*(i/commonCyclePeriod) == 0) ":"") + " && dz2 < convergeEpsilon);",
	                    			//"j += float(!isFatou);",
	                    	"absz2 = floatUnFinish*absn2/absd2;",
	                    	"finish = finish || " + (!checkInfinity ? "isinfinity || ": "") + "isJulia || isFatou;",
	                    	"	}",
	                    	"       return float(!isJulia)*complex2rgb(complexDiv(nfinal, dfinal))+float(isJulia)*"+getColorString(juliaColor)+";",
	                    	"}"
	                    	].join("\n");
	
	var juliatestCode = [
	 	              	"vec3 v = vec3(0.0,0.0,0.0);",
	 	              	"v = color(c, z, w, scale);",
	 	              	"r = v.x;",
	 	              	"g = v.y;",
	 	              	"b = v.z;"
	 	              ].join("\n");
	var resMap = new ComplexShaderMap(juliatestCode, false, juliatestUniforms, checkJulia ? juliatestMethods : juliatestMethods_);
	resMap.initData = jData;
	return resMap;

}

