//Copyright (c) Anna Alekseeva 2013-2016

//-----------------Shaders----------------------------------
function colorToVector (c) {
	return new THREE.Vector3(c.r, c.g, c.b);
}
var colorStepsNum = 40;

var starGrayColorMapData = [
                        {part: 0, value: 0x666666},
                        {part: 0.1, value: 0x996666},
                        {part: 0.2, value: 0xcc9966},
                        {part: 0.3, value: 0xeecc66},
                        {part: 0.4, value: 0xeeee99},
                        {part: 0.5, value: 0xeeeeee},
                        {part: 0.6, value: 0x99eeee},
                        {part: 0.8, value: 0x6699ee},
                        {part: 1.0, value: 0x3366ee}
                        ];
var starColorMapData = [
                        {part: 0, value: 0x222222},
                        {part: 0.1, value: 0x332222},
                        {part: 0.15, value: 0x992222},
                        {part: 0.2, value: 0xcc3322},
                        {part: 0.25, value: 0xee9922},
                        {part: 0.3, value: 0xeecc33},
                        {part: 0.4, value: 0xeeee99},
                        {part: 0.5, value: 0xeeeeee},
                        {part: 0.6, value: 0x99eeee},
                        {part: 0.8, value: 0x6699ee},
                        {part: 1.0, value: 0x3366ee}
                        ];

var juliaColors = [];

var r = [];
var g =[];
var b=[];
        



function getHomoColorMap (data, length) {
	var res = [];
	var max = data[data.length - 1].part;
	var min = data[0].part;
	var colors = [];
	for (var c = 0; c < data.length; c++)
		colors.push(colorToVector(new THREE.Color(data[c].value)));
	console.log("colors", colors);
	for (var i = 0; i < length; i++ ){
		var part = min + (i / (length - 1))*(max - min);
		for (var j = 0; j < data.length - 1; j++) {
			if (data[j].part <= part && data[j+1].part > part){
				res.push(colors[j].clone().lerp(colors[j+1], (part - data[j].part)/(data[j+1].part - data[j].part)));
				break;
			}
		}
	}
	while (res.length < length) res.push(colors[colors.length - 1]);
	return res;
}

var signCode = [   		"r = c.x > 0.0 ? 0.8 : 0.2;",
                       		"g = c.y > 0.0 ? 0.8 : 0.2;",
                       		"b = 0.2;"
].join("\n");
var signMap = new ComplexShaderMap(signCode);
var curColorMap = getHomoColorMap(starColorMapData, colorStepsNum);
console.log("colorMap", curColorMap);
var absValueUniforms = {
		maxValue: {type: "f", value: 5.0}, 
		colorMap: {type: "v3v", value: curColorMap}//,
		//colorMapLength: {type: "i", value: colorStepsNum}
}
var absValueCode = [
                    //"float valuePart = c.x > maxValue ? 1.0 : c.x/maxValue;",
                    "float valuePart = scale > maxValue ? 1.0 : scale/maxValue;",
                    "float l=float(colorMapLength); ",
                    "float f=floor(l*valuePart);",
                    "int n = int(f);",
                    "vec3 cvec = colorMap[colorMapLength - 1];",
                    "for (int ij = 0; ij < colorMapLength; ij++){",
                    "if (ij == n){", 
                    "cvec = mix(colorMap[ij], colorMap[ij+1], l*valuePart - f);",
                    "};",
                    "};",
                    "b = cvec.z;",
                    "g = cvec.y;",
                    "r = cvec.x;"
                    ].join("\n");
var absValueMap = new ComplexShaderMap (absValueCode, true, absValueUniforms);
var chessBoardUniforms = { colors: {type: "v3v", value: 
	[colorToVector(new THREE.Color(0xcccc00)), colorToVector(new THREE.Color(0x3399cc))]},
		evenColor: {type: "c", value: new THREE.Color(0xcccc00)},
		oddColor: {type: "c", value: new THREE.Color(0x3399cc)}
};
var chessBoardCode = [
                      "float sum = floor(c.x) + floor(c.y);",
                      "float md = mod(sum, 2.0);",
                      "r = md == 0.0 ? colors[0].x : colors[1].x;",
                      "g = md == 0.0 ? colors[0].y : colors[1].y;",
                      "b = md == 0.0 ? colors[0].z : colors[1].z;"
                      ].join("\n");
var chessBoardMap = new ComplexShaderMap(chessBoardCode, false, chessBoardUniforms);

var valueMethods = [	
	"vec3 complex2rgb(vec2 z){",
	"	float l = length(z);",
	"	float phi = atan(z.y, z.x);",
	"   vec3 c = vec3(phi < 0. ? phi/6.283185307 + 1. : phi/6.283185307,clamp(l, 0.0, 1.0), clamp(1./l, 0.0, 1.0));",
	 "   vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);",
	  "  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);",
	   " return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);",
	"}",
].join("\n");
var valueCode = ["vec2 z = c;",
                 /*"z = vec2(c.x*z.x - c.y*z.y, c.x*z.y + c.y*z.x);",
                 "z = vec2(c.x*z.x - c.y*z.y, c.x*z.y + c.y*z.x);",
                 "z = vec2(c.x*z.x - c.y*z.y, c.x*z.y + c.y*z.x);",
                 "z = vec2(c.x*z.x - c.y*z.y, c.x*z.y + c.y*z.x);",
                 "z = vec2(c.x*z.x - c.y*z.y, c.x*z.y + c.y*z.x);",
                 "z = vec2(c.x*z.x - c.y*z.y, c.x*z.y + c.y*z.x);",
                 "z = vec2(c.x*z.x - c.y*z.y, c.x*z.y + c.y*z.x);",
                 "z = vec2(c.x*z.x - c.y*z.y, c.x*z.y + c.y*z.x);",
                 "z = vec2(c.x*z.x - c.y*z.y, c.x*z.y + c.y*z.x);",
                 "z = vec2(c.x*z.x - c.y*z.y, c.x*z.y + c.y*z.x);",
                 "z = vec2(c.x*z.x - c.y*z.y, c.x*z.y + c.y*z.x);",
                 "z = vec2(c.x*z.x - c.y*z.y, c.x*z.y + c.y*z.x);",
                 "z = vec2(c.x*z.x - c.y*z.y, c.x*z.y + c.y*z.x);",
                 "z = vec2(c.x*z.x - c.y*z.y, c.x*z.y + c.y*z.x);",
                 "z = vec2(c.x*z.x - c.y*z.y, c.x*z.y + c.y*z.x);",
                 "z = vec2(c.x*z.x - c.y*z.y, c.x*z.y + c.y*z.x);",
                 "z = vec2(c.x*z.x - c.y*z.y, c.x*z.y + c.y*z.x);",
                 "z = vec2(c.x*z.x - c.y*z.y, c.x*z.y + c.y*z.x);",*/
                 "vec3 rgb = complex2rgb(z);",
                 "r = rgb.x;",
                 "g = rgb.y;",
                 "b = rgb.z;"].join("\n");
var valueMap = new ComplexShaderMap(valueCode, false, {}, valueMethods);

var mandelbrotIterationsNumber = 100;
var mandelbrotBound = 100.0;
var mandelbrotColorMap = getHomoColorMap(starColorMapData, mandelbrotIterationsNumber);
var mandelbrotUniforms = {
		bound: {type: "f", value: mandelbrotBound},
		colorMap: {type: "v3v", value: mandelbrotColorMap}
		
};
var mandelbrotCode = [
                      "vec3 cvec=colorMap[colorMapLength-1];",
                      "float rho2=c.x*c.x + c.y*c.y;",
                      "if (rho2 < bound) {",
                      	"int iter = colorMapLength;",
                      	"vec2 cIter = c;",
                      	"cvec = colorMap[0];",
                      	"bool runaway = false;",
                      	"for (int i = 0; i < colorMapLength; i++) {",
                      	"if (!runaway) {",
                      		"cIter = vec2(cIter.x*cIter.x - cIter.y*cIter.y + c.x, 2.0*cIter.x*cIter.y + c.y);",
                      		"if (cIter.x*cIter.x + cIter.y*cIter.y > bound) {",
                      			"iter = i;",
                      			"cvec = colorMap[colorMapLength - i -1];",
                      			"runaway = true;",
                      		"};",
                      	"};",
                      	"};",
                      	
                      "};",
                      
                      "b = cvec.z;",
                      "g = cvec.y;",
                      "r = cvec.x;"

                      ].join("\n");
var mandelbrotMap = new ComplexShaderMap(mandelbrotCode, false, mandelbrotUniforms);


var juliaData13 = [
"FUNCTION 0. 0. 0. 0. 0. 0. 0. 0. 0.30789240450753436 6.0152917044142162 -20.475816711813557 -25.925324552303728 78.24741584661507 27.909526223768339 -129.58974592903056 20.784538562962315 118.37323665219498 -86.830785207675902 -53.955794245378087 106.59656614547917 0.26300742130383992 -70.622950700033059 13.505019079222286 26.413784845555799 -6.675214517621491 -4.340647022167162 1.0 0.0 1. 0. -6.3247854823785072 4.340647022167162 11.402444867764377 -25.673979420450138 5.7459408702694716 66.554020861951884 -61.788972147334505 -95.801827521643531 123.82079903668222 69.914923303584487 -129.31774095487197 -4.4733621643695773 74.474991285622195 -37.057431164250289 -17.704785071245755 28.212300787424216 -0.30789240450753352 -6.0152917044142153 0. 0. 0. 0. 0. -0. 0. 0.",
"CYCLES 0. 0. 0 1 Infinity any 1 1 1 0 2 1",
"IMAGE 1000 6",
"POINTS 3",
"0 0 1 2.0 0+0i",
"0 0 -1 2.0 infty",
"1 0 0 2.0 1+0i",
"ARCS 0"];
var juliaData13_ = [
"FUNCTION 0. 0. 0. 0. -48.238523396263687 -89.683334081191859 -282.82502815993655 788.08808787695557 2762.7675707508233 -1433.0927619313384 -6759.4134500560585 -1372.2000763056258 6809.7662668555486 7299.0240229205565 -1727.1700096578707 -9615.3483664488758 -2348.6147359544166 6019.348705054188 2339.7994534347426 -1652.8345192378067 -882.02262910962827 -59.656838283206994 133.81347680297776 143.83786504922526 2.1376084900817034 -27.48278461287526 -2.0189609510572804 1.0859508745015549 -2.0189609510571835 1.085950874501586 24.108883873663515 13.365423244354005 -46.252698894775662 -190.93471617537116 -436.40997222604642 768.81024496107636 2668.7987450649603 -1041.1708258578915 -6316.9126161518152 -1358.3685107075376 7070.639477170289 6741.2237638510724 -2336.3751134774893 -9705.1542813854139 -2580.987940879274 6396.178897376727 2718.6014976430879 -1515.2047423718807 -813.44878551887837 -198.42858701634913 48.238523396280442 89.683334081211541 0. 0. 0. 0.",
"CYCLES 0. 0. 0 1 1. 0. 1 1 Infinity any 2 1",
"IMAGE 1000 5"];

var juliaData3 = [
"FUNCTION 1.0 0.0 0.0 0.0 0.0 0.0 2.0 0.0 0.0 0.0 0.0 0.0 0.0 0.0 0.0 0.0 0.0 0.0 0.0 0.0 0.0 0.0 0.0 0.0 0.0 0.0 0.0 0.0 0.0 0.0 0.0 0.0 0.0 0.0 0.0 0.0 3.0 0.0 0.0 0.0 0.0 0.0 0.0 0.0 0.0 0.0 0.0 0.0 0.0 0.0 0.0 0.0 0.0 0.0 0.0 0.0 0.0 0.0 0.0 0.0 0.0 0.0 0.0 0.0",
"CYCLES 1.0 0.0 0 1 -0.5 0.866025404 1 1 -0.5 -0.866025404 2 1",
"IMAGE 1000 200"
                 	];
var juliaData4 = [
"FUNCTION 1.0 0.0 0.0 0.0 0.0 0.0 0.0 0.0 3.0 0.0 0.0 0.0 0.0 0.0 0.0 0.0 4.0 0.0 0.0 0.0",
"CYCLES 1.0 0.0 0 1 0.0 1.0 1 1 -1.0 0.0 2 1 0.0 -1.0 3 1",
"IMAGE 1000 20"
                 	];

function makeNewtonDataStructure(roots) {
	var funcs = [];
	var newCoefs = [];
	var N = roots.length;
	funcs[0]= Complex["1"];
	console.log(roots);
	for (var l = 0; l < N; l++) {
		for (var k = 0; k <= l; k++) {
			newCoefs[k] = Complex.neg(roots[l]).mult(funcs[k]).add(k == 0 ? Complex["0"]:funcs[k-1]); 
		}
		newCoefs[l+1] = Complex["1"];
		console.log(l, newCoefs, funcs[0]);
		for (var j = 0; j <= l+1; j++) {
			funcs[j] = newCoefs[j];
		}
	}
	console.log(funcs);
	var den = [];
	var num = [];
	for (var i = 0; i < N; i++) {
		num[i] = funcs[i].multiplyScalar(i-1);
		den[i] = funcs[i+1].multiplyScalar(i+1);
	}
	den[N] = Complex["0"];
	num[N] = funcs[N].multiplyScalar(N-1);
	var res = [];
	res[0] = "FUNCTION";
	for (var m = 0; m <= N; m++) {
		res[0] += " " + roundTo(num[m].re, 1e-14).toString();
		res[0] += " " + roundTo(num[m].i, 1e-14).toString();
	}
	for (var o = 0; o <= N; o++) {
		res[0] += " " + roundTo(den[o].re, 1e-14).toString();
		res[0] += " " + roundTo(den[o].i, 1e-14).toString();
	}
	res[1] = "CYCLES";
	for (var p = 0; p < N; p++) {
		res[1] += " " + roots[p].re.toString() + " " + roots[p].i.toString();
		res[1] += " " + p + " 1";
	}
	res[2] = "IMAGE 1024 200";
	return res;
	
}



//----------------------hv test ----------------------------------
var hvtestIterationsNumber = 500;
var hvtestUniforms = {
		Iterations: {type: "i", value: hvtestIterationsNumber, constant: true},
		
};

var hvtestMethods = [	
"// Color parameters",
"float R = 0.0;",
"float G = 0.43;",
"float B = 1.;",
"",
"vec2 complexMul(vec2 a, vec2 b) {",
"	return vec2( a.x*b.x -  a.y*b.y,a.x*b.y + a.y * b.x);",
"}",
"vec2 complexDiv(vec2 a, vec2 b) {",
"	return vec2( a.x*b.x +  a.y*b.y,-a.x*b.y + a.y * b.x)/dot(b,b);",
"}",
"float spheredist(vec2 w1, vec2 w2) {",
"	return 2.*distance(w1, w2)/sqrt((1.+dot(w1,w1))*(1.+dot(w2, w2)));",
"}",
"vec3 color(vec2 c, bool Julia, vec2 JuliaC, float falloff, float scale) {",
"	vec2 z = Julia ?  c : vec2(0.0,0.0);",
"	vec2 add =  (Julia ? JuliaC : c);",
"    vec2 z2 = complexMul(z, z);",
"    vec2 n, d, dn, dd;",
"     float dz=0.002/scale;",
"	int j = Iterations;",
"	//int j = 1;",
"	for (int i = 0; i <= Iterations; i++) {",
"		if (dot(z,z)> 1000.0) { break; }",
"		z = complexMul(z,z) + add;",
/*"        z2 = complexMul(z, z);",
" 			n = 2.0*complexMul(z2, z) + vec2( -1.0, 0.0);",
"         d = z2*3.0;",
"         dn = 6.0*z2;",
"          dd = 6.0*z;",
"         dz*=(1.+dot(z,z))*distance(complexMul(dn,d),complexMul(dd,n));",
"		dz /= (dot(d,d)+dot(n,n));",
"		z = complexDiv(n, d);",*/
"		j = i; ",
/*"		if (dz> spheredist(z,c)) { break; }",
"		else if(spheredist(z,.5*vec2(1.0, sqrt(3.0))) < 1e-4) {" ,
"			j = 5;",
"        break;",
"        }",
"		else if(spheredist(z,  vec2 (-1.0, 0.0))<1e-4) {" ,
"			j = 100;",
"        break;",
"        }",	
"		else if(spheredist(z, .5*vec2(1.0, -sqrt(3.0)))<1e-4) {" ,
"			j = 200;",
"        break;",
"        }",*/	
"	}",
"	",
"	if (j < Iterations) {",
"		// The color scheme here is based on one",
"		// from the Mandelbrot in Inigo Quilez's Shader Toy:",
"		float co = float( j) + 1.0 - log2(.5*log2(dot(z,z)));",
"		co = sqrt(max(0.,co)/256.0);",
"		return falloff*vec3( .5+.5*cos(6.2831*co+R),.5+.5*cos(6.2831*co + G),.5+.5*cos(6.2831*co +B) );",
"	}  else {",
"		// Inside ",
"		return vec3(0.05,0.01,0.02);",
"		//return vec3(1.0,0.01,0.02);",
"	}",
"}"
].join("\n");

var hvtestCode = [
	"vec3 v = vec3(0.0,0.0,0.0);",
	"v = color(c, true, vec2(0.28693186889504513, 0.014286693904085048), 1.0, scale);",
	"r = pow(v.x, 1./2.2);",
	"g = pow(v.y, 1./2.2);",
	"b = pow(v.z, 1./2.2);"
].join("\n");
var hvtestMap = new ComplexShaderMap(hvtestCode, false, hvtestUniforms, hvtestMethods);

//-----------Julia test------------------------------------------------------
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


function initJuliaMap() {
	/*	var NewtonData = makeNewtonDataStructure([new Complex(1, 0), 
    new Complex(0, 1),
    new Complex(-1, 0),
    new Complex(0, -1),
    new Complex(0.5, 0.5)]);*/
	/*var NewtonData = makeNewtonDataStructure([new Complex(1, 0), 
    new Complex(-0.5, 0.5*Math.sqrt(3)),
    new Complex(-0.5, -0.5*Math.sqrt(3))]);*/
	var NewtonData = makeNewtonDataStructure([Complex.Polar(1, 0), 
                                              Complex.Polar(1.0, 0.4*Math.PI),
                                              Complex.Polar(1.0, 0.8*Math.PI),
                                              Complex.Polar(1.0, 1.2*Math.PI),
                                              Complex.Polar(1.0, 1.6*Math.PI)]);
	/*var NewtonData = makeNewtonDataStructure([Complex.Polar(1, 0), 
                                              Complex.Polar(1.2, 0.5*Math.PI),
                                              Complex.Polar(1.0, Math.PI),
                                              Complex.Polar(1.0, 1.6*Math.PI)]);*/
	//var jData = parseJuliaData(NewtonData);
	var jData = parseJuliaData(juliaData13);
	var juliatestUniforms = {
			Iterations: {type: "i", value: jData.maxiter, constant: true},
			
	};
	
	var juliatestMethods = [	
	"// Color parameters",
	"const float actualInfinity = 10.;",
	"float R = 0.0;",
	"float G = 0.43;",
	"float B = 1.;",
	"",
	//"bool isInff(float a) {",
	//"	return a > actualInfinity || a < -actualInfinity;",
	//"}",
	"vec3 complex2rgb(vec2 z){",
	"	float l = length(z);",
	"	float phi = atan(z.y, z.x);",
	"   vec3 c = vec3(phi < 0. ? phi/6.283185307 + 1. : phi/6.283185307,clamp(l, 0.0, 1.0), clamp(1./l, 0.0, 1.0));",
	 "   vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);",
	  "  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);",
	   " return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);",
	"}",
	"bool isInf(vec2 v) {",
	"	return v.x > actualInfinity || v.x < -actualInfinity || v.y > actualInfinity || v.y < -actualInfinity;",
	"}",
	"vec2 complexMul(vec2 a, vec2 b) {",
	"	return vec2( a.x*b.x -  a.y*b.y,a.x*b.y + a.y * b.x);",
	"}",
	"vec2 complexDiv(vec2 a, vec2 b) {",
	"	return vec2( a.x*b.x +  a.y*b.y,-a.x*b.y + a.y * b.x)/dot(b,b);",
	"}",
	"float spheredist(vec2 w1, vec2 w2) {",
	//"	if (isInf(w1) && isInf(w2)) {return 0.0;}",/**/
	//"	/*else */if (isInf(w1)) {return 2.0/sqrt(1.+dot(w2,w2));}",
	//"	else if (isInf(w2)){return 2.0/sqrt(1.+dot(w1, w1));}",
	//"	else {return 2.*distance(w1, w2)/sqrt((1.+dot(w1,w1))*(1.+dot(w2, w2)));}",/**/
	/**/"	return 2.*distance(w1, w2)/sqrt((1.+dot(w1,w1))*(1.+dot(w2, w2)));",/**/
	"}",
	"vec3 color(vec2 c, float scale) {",
	"	vec2 z = c;",
	"    vec2 z2 = complexMul(z, z);",
	"    vec2 n, d, dn, dd;",
	" float absz2;",
	"     float dz=0.002/scale;",
	"	int j = 1;",
	"	for (int i = 0; i <= Iterations; i++) {",
	"absz2 = dot(z,z);",
	"if (absz2 > actualInfinity) {return vec3(0.0);}",
	"if (absz2 < 1.) {",
	getEvalPolyLoopNums("z", "n", jData.num),
	getEvalPolyLoopNums("z", "d", jData.den),
	//getEvalPolyLoopNums("z", "dn", jData.dnum),
	//getEvalPolyLoopNums("z", "dd", jData.dden),
	//"         dz*=(1.+absz2)*distance(complexMul(dn,d),complexMul(dd,n));",
	"}",
	"else {",
	"vec2 iz = vec2(z.x, -z.y)/absz2;",
	getEvalPolyLoopInverseNums("iz", "n", jData.num),
	getEvalPolyLoopInverseNums("iz", "d", jData.den),
	//getEvalPolyLoopInverseNums("iz", "dn", jData.mund),
	//getEvalPolyLoopInverseNums("iz", "dd", jData.nedd),
	//"         dz*=(1.+1./absz2)*distance(complexMul(dn,d),complexMul(dd,n));",
	"}",
	//"		dz /= (dot(d,d)+dot(n,n));",
	"		z = complexDiv(n, d);",
	"		j = i; ",
	//"		if (dz> spheredist(z,c)) { ",
	//"j= 0;",
	//"return vec3 (.8);",
	//"}",
	//"break; }",
	//getCheckCycleLoopStringNums("z", jData.cycle),
	"	}",
	"       return complex2rgb(z);",

	"	",
	"	if (j < Iterations) {",
	"		// The color scheme here is based on one",
	"		// from the Mandelbrot in Inigo Quilez's Shader Toy:",
	//"		float co = float( j);// + 1.0 - log2(.5*log2(dot(z,z)));",
	//"		float co = dot(z,z);",
	//"		co = sqrt(max(0.,co)/256.0);",
	//"		return vec3( .5+.5*cos(6.2831*co+R),.5+.5*cos(6.2831*co + G),.5+.5*cos(6.2831*co +B) );",
	"       return complex2rgb(z);",
	"	}  else {",
	"		// Inside ",
	"		//return vec3(0.05,0.01,0.02);",
	"		return vec3(1.0,0.01,0.02);",
	"	}",
	"}"
	].join("\n");
	
	var juliatestCode = [
	              	"vec3 v = vec3(0.0,0.0,0.0);",
	              	"v = color(c, scale);",
	              	"r = pow(v.x, 1.);//2.2);",
	              	"g = pow(v.y, 1.);//2.2);",
	              	"b = pow(v.z, 1.);//2.2);"
	              ].join("\n");
	juliatestMap = new ComplexShaderMap(juliatestCode, false, juliatestUniforms, juliatestMethods);
}
var juliatestMap;
//--------------------------------------------------------------------------
function updateComplexAttribute(geom, shaderMap, attr){
	if (!attr) {
		attr = {};
	}
	var newArray = false;
	if (!attr.c) {
		attr.c = {type: "v2", value:[]};
		attr.scale = {type: "f", value: []};
		newArray = true;
	}
	
	
	for (var i = 0; i < geom.vertices.length; i++){
		var c0 = CU.localToComplex(geom.vertices[i]);
		var c = currentTransform.apply(c0);
		var scale = currentTransform.scale(c);
		var vec = shaderMap.polar ? new THREE.Vector2(c.r, c.t):
			new THREE.Vector2(c.re, c.i);
		if (newArray) {
			attr.c.value.push(vec);
			attr.scale.value.push(scale);
			}
		else {
			attr.c.value[i] = vec;
			attr.scale.value[i] = scale;
			}
	}
	attr.c.needsUpdate = true;
	attr.scale.needsUpdate = true;
	return attr;
}


var sphereShaderAttributes = {};

function initShaderMaterial(geom, shaderMap) {
	if (!shaderMap) shaderMap = new ComplexShaderMap();
	sphereShaderAttributes = {
			c: {type: "v2", value: []},
			scale: {type: "f", value: []}};
	updateComplexAttribute(geom, shaderMap, sphereShaderAttributes);
	var uniforms = THREE.UniformsUtils.merge ([
		THREE.UniformsLib[ "lights" ],
	{
		diffuse: {type: "c", value: new THREE.Color( 0xffffff )}, 
		ambient: {type: "c", value: new THREE.Color( 0xffffff )},
		emissive: {type: "c", value: new THREE.Color( 0x000000 )}
			},
			shaderMap.uniforms]);

	                                           
	                                       
	var shaderMaterial = new THREE.ShaderMaterial({
		  attributes: sphereShaderAttributes,
		  uniforms:uniforms,
		  vertexShader: vertexShaderString,//document.getElementById('vertexShader').textContent,
		  fragmentShader: getFragmentShaderString(shaderMap),//document.getElementById('fragmentShader').textContent,
		  lights: true
		  });
	shaderMaterial.complexShaderMap = shaderMap;
	return shaderMaterial;
}


var vertexShaderString = [
	//"attribute vec3 aLocalPosition;",
	"attribute vec2 c;",
	"attribute float scale;",
	"varying vec3 vPosition;",
	"varying vec3 vLightFront;",
	"varying vec2 vC;",
	"varying float vScale;",
	"uniform vec3 diffuse;",
	"uniform vec3 ambient;",
	"uniform vec3 emissive;",
	"uniform vec3 ambientLightColor;",
	"#if MAX_DIR_LIGHTS > 0",
		"uniform vec3 directionalLightColor[ MAX_DIR_LIGHTS ];",
		"uniform vec3 directionalLightDirection[ MAX_DIR_LIGHTS ];",
	"#endif",

	"void main() {",
		"vec3 transformedNormal = normalMatrix * normal;",
		"vLightFront = vec3( 0.0 );",
		"#if MAX_DIR_LIGHTS > 0",
			"for( int i = 0; i < MAX_DIR_LIGHTS; i ++ ) {",
		
				"vec4 lDirection = viewMatrix * vec4( directionalLightDirection[ i ], 0.0 );",
				"vec3 dirVector = normalize( lDirection.xyz );",
		
				"float dotProduct = dot( transformedNormal, dirVector );",
				"vec3 directionalLightWeighting = vec3( max( dotProduct, 0.0 ) );",
		
		
				"vLightFront += directionalLightColor[ i ] * directionalLightWeighting;",
			"}",
		
		"#endif",
		"vLightFront = vLightFront * diffuse + ambient * ambientLightColor + emissive;",
//		"vLightFront = vLightFront + ambient;",
	
		//"vPosition = aLocalPosition;",
		"vC =c;",
		"vScale = scale;",
		"gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);",
	 "}"
].join("\n");


function getFragmentShaderString (complexShaderMap) {
	if (!complexShaderMap) {
		complexShaderMap = new ComplexShaderMap();
	}
	var fragmentShaderString = [
	                           	complexShaderMap.uniformsDeclaration,
	                           	"varying vec3 vLightFront;",

	                            //"varying vec3 vPosition;",
	                            "varying vec2 vC;",
	                            "varying float vScale;",
	                            complexShaderMap.methods ? complexShaderMap.methods : "",

	                            "void main() {",
	                            "float r, g, b;",
	                            "vec2 c = vC;",
	                            "float scale = vScale;",
	                            complexShaderMap.code,
	                            
	                            "gl_FragColor = vec4(r, g, b, 1.0);",
	                           	"gl_FragColor.xyz *= vLightFront;",
	                        	"}"
	                        ].join("\n");
	return fragmentShaderString;
}
