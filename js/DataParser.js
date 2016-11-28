//Copyright (c) Anna Alekseeva 2013-2016

function parseQueryString(){
	var queryString = window.location.search;
	//var handShakeData = createEmptyNode("window");
	var res = {};
	if (queryString) {
		queryString = queryString.substring(1);
		var params = queryString.split("&");
		for (var i = 0; i < params.length; i++){
			var keyValue = params[i].split("=");
			res[keyValue[0]] = keyValue[1];
		}
			
	}
	return res;
}

var parseXml;

if (typeof window.DOMParser != "undefined") {
    parseXml = function(xmlStr) {
        return ( new window.DOMParser() ).parseFromString(xmlStr, "text/xml");
    };
} else if (typeof window.ActiveXObject != "undefined" &&
       new window.ActiveXObject("Microsoft.XMLDOM")) {
    parseXml = function(xmlStr) {
        var xmlDoc = new window.ActiveXObject("Microsoft.XMLDOM");
        xmlDoc.async = "false";
        xmlDoc.loadXML(xmlStr);
        return xmlDoc;
    };
} else {
    throw new Error("No XML parser found");
}
function createEmptyNode (name){
	return (parseXml("<"+name+"/>", "text/xml")).getElementsByTagName(name)[0];
}
var xmlSerializer = new XMLSerializer();

function parseQueryStringToXMLAttributes (node) {
	var queryObj = parseQueryString();
	for (var f in queryObj) {
		if (queryObj.hasOwnProperty(f)) node.setAttribute(f, queryObj[f]);
	}
}
function attributesToQueryString(node){
	var res = [];
	var a = node.attributes;
	for (var f in a ) {
		if (a.hasOwnProperty(f)) res.push(f + "=" + a[f]);
	}
	return res.join("&");
}

function xmlToStrings (xmlElement, res) {
	if (typeof xmlElement === "string") xmlElement = parseXml(xmlElement);
	res = res || [];
	var rootName = xmlElement.nodeName;
	console.log("xmlToStrings", rootName);
	//xmlElement = xmlElement.childNodes[0];
	if (xmlElement.getElementsByTagName("function").length > 0) {
		xmlElement = xmlElement.getElementsByTagName("function")[0];
		
		if (xmlElement.getAttribute("type") == "newton") {
			var rootsXml = xmlElement.getElementsByTagName("cn");
			var degree = xmlElement.getAttribute("degree");
			if (rootsXml.length > 0) {
				var roots = [];
				if (degree > rootsXml.length) {
					roots = getSymmetricRoots(degree - rootsXml.length);
				}
				for (var i = 0; i < rootsXml.length; i++) {
					roots.push(Complex.fromXML(rootsXml[i]));
				}
				makeNewtonDataStructure(roots, res);
			} else {
				makeSymmetricNewtonDataStructure(degree, res);
			}
			
		} else if (xmlElement.getAttribute("type") == "newton-random") {
			var degree = xmlElement.getAttribute("degree");
			var roots = [];
			for (var i = 0; i < degree; i++) {
				roots.push(Complex.random());
			}
			makeNewtonDataStructure(roots, res);
			var sp = "POINTS";
			for (var i = 0; i < roots.length; i++)
				sp += " " + roots[i].toSimpleString();
			res.push(sp);
			console.log("newton-random", res);
			
		} else if (xmlElement.getAttribute("type") == "identity"){
			res.push("FUNCTION 0 0 1 0 1 0 0 0");
			res.push("CONFIG Iterations 1");
		} 
		else {
		
			var s = "FUNCTION";
			var deg = xmlElement.getAttribute("degree");
			var numer = xmlElement.getElementsByTagName("numer")[0];
			s += parseArrayOfComplex(numer.getElementsByTagName("cn"), deg);
			var denom = xmlElement.getElementsByTagName("denom")[0];
			s += parseArrayOfComplex(denom.getElementsByTagName("cn"), deg);
			coefs = denom.getElementsByTagName("cn");
			res.push(s);
			var cycles = xmlElement.getElementsByTagName("cycle");
			s = "CYCLES";
			for (var j = 0; j < cycles.length; j ++) {
				s += parseCycle(cycles[j], s);
			}
			res.push(s);
		}
		
	}
	if (xmlElement.getElementsByTagName("options").length > 0) {
		var newConfigs = xmlElement.getElementsByTagName("options")[0].getElementsByTagName("config");
		if (newConfigs.length > 0) {
			var s = "CONFIG";
		}
		for (var i = 0; i < newConfigs.length; i++) {
			s += " " + newConfigs[i].getAttribute("key") + " " + newConfigs[i].getAttribute("value");
		}
		res.push(s);
		
	}
	
	function parseArrayOfComplex(coefs, deg) {
		console.log("parseArrayOfComplex", coefs, deg);
		var s = "";
		if (!deg) deg = coefs.length - 1;
		var i = 0;
		for (i = 0; i < coefs.length; i++)
			{s += " " + Complex.fromXML(coefs[i]).toSimpleString();};
		while (i <= deg) {
			s += " 0. 0.";
			i++;
		}
		return s;
		
	}
	function parseCycle(cyclel) {
		console.log("parseCycle", cyclel);
		var s = "";
		var points = cyclel.getElementsByTagName("cn");
		var l = cyclel.getAttribute("length") || points.length;
		if (!l) l = 1;
		console.log("parseCycle", cyclel, l);

		for (var i = 0; i < l; i++) {
			s += " " + Complex.fromXML(points[i]).toSimpleString() + " " + (i+1) + " " + l;
		}
		return s;
	}
	return res;
}

function parseJuliaData(data, resObj) {
	var res = resObj || {};
	var index = -1;
	var line = [];
	var functionParsed = false;
	var cyclesParsed = false;
	var imageParsed = false;
	var configParsed = false;
	while ((!functionParsed || !cyclesParsed || !imageParsed) 
			&& (++index) < data.length) {
		line = data[index].split(" ");
		if (line[0] == "FUNCTION") {
			parseFunctions(line, res);
			functionParsed = true;
		}
		if (line[0] == "CYCLES") {
			parseCycles(line, res);
			cyclesParsed = true;
		}
		/*if (line[0] == "IMAGE") {
			parseImage(line, res);
			imageParsed = true;
		}*/
		if (line[0].toLowerCase() == "config") {
			res.config = res.config || {};
			ConfigManager.parseString(data[index], res.config);
			configParsed = true;
		}
	}
	if (!functionParsed) console.warn("No FUNCTION entry");
	if (!cyclesParsed) console.warn("No CYCLES entry");
	if (!configParsed) console.warn("No CONFIG entry");
	//if (!imageParsed) console.warn("No IMAGE entry");
	
	console.log("Julia data parsed", res);
    
    return res;
}

function parseFunctions (line, res) {
	res.degree = Math.floor((line.length-1)/4)-1;
	res.num = [];
	res.den = [];
	res.dnum = [];
	res.dden = [];
	res.mund = [];
	res.nedd = [];

	for (var i = 0; i <= res.degree; i++) {
	    res.num.push(new THREE.Vector2(parseFloat(line[1+2*i]),parseFloat(line[1+2*i+1])));
	    res.den.push(new THREE.Vector2(parseFloat(line[1+2*(res.degree+1)+2*i]),parseFloat(line[1+2*(res.degree+1)+2*i+1])));
	}
	console.log (res.degree, res.num, res.den);
	//?????
	var v0 = new THREE.Vector2();
	res.mund.push(v0);
	res.nedd.push(v0);
	for (var i = 0; i < res.degree; i++) {
	    res.dnum.push(res.num[i+1].clone().multiplyScalar(i+1));
	    res.dden.push(res.den[i+1].clone().multiplyScalar(i+1));
	    res.mund.push(res.num[i].clone().multiplyScalar(i-res.degree));
	    res.nedd.push(res.den[i].clone().multiplyScalar(i-res.degree));
	}
	res.dnum.push(v0);
	res.dden.push(v0);
}
function parseCycles(line, res) {
	res.cyclelen = (line.length-1)/4;
	res.cycle = [];
	res.cyclenext = [];
	res.cycleperiod = [];
	for (var i = 0; i < res.cyclelen; i++) {
	    if (line[1+4*i ] == "Infinity")
//	    	res.cycle.push(Complex["Infinity"]);
    	res.cycle.push(new THREE.Vector2(1.01e10, 1.01e10));
	    else
	    	res.cycle.push(new THREE.Vector2(
	    			parseFloat(line[1+4*i]),
	    			parseFloat(line[1+4*i+1])));
	    res.cyclenext.push(parseInt(line[1+4*i+2]));
	    res.cycleperiod.push(parseInt(line[1+4*i+3]));
	}

}
function parseImage(line, res) {
	res.dz0 = 4./parseFloat(line[1]);
	res.maxiter = parseInt(line[2]);
}
