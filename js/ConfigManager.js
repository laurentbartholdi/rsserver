//Copyright (c) Anna Alekseeva 2013-2016

var ConfigManager = function (defaults) {
	this.resetConfig();
	if (defaults) {
		for (var f in defaults) {
			if (defaults.hasOwnProperty(f))
				this.configObj[f] = defaults[f];
		}
	}
}

ConfigManager.prototype = {
		constructor: ConfigManager,
		resetConfig: function () {
			var str = JSON.stringify(ConfigManager.defaultConfig);
			console.log("ConfigManager.defaultConfig", str);
			this.configObj = JSON.parse(str);			
		},
		getConfigValue: function (key){
			var res, present = false;;
			if (this.configObj.hasOwnProperty(key)) {
				res = this.configObj[key];
				present = true;
			}			
			/*else if (this.defaultConfig.hasOwnProperty(key)) {
				res = this.defaultConfig[key];
				present = true;
			}*/
			if (present) {
				if (ConfigManager.getFieldValueType(key) == "color")
					return new THREE.Color(res);
				return res;
			}
			return ConfigManager.getDefaultValue(key);			
		},
		getConfigValueString: function (key){
			var val = this.getConfigValue(key);
			if (ConfigManager.getFieldValueType(key) == "color")
				return "0x" + val.getHexString();
			return val.toString();
		},
		
		updateMultiple: function (newConfigs) {
			var updatedFields = [];
			for (var f in newConfigs)
				if (newConfigs.hasOwnProperty(f)) {
					this.setConfigValue(f, newConfigs[f], true);
					updatedFields.push(f);
				}
			this.invalidateConfig(updatedFields);
		},

		setConfigValue: function (key, value, silent) {
			console.log("setConfigValy", key, value);
			var oldValue = this.configObj[key];
			this.configObj[key] = value;
			if (oldValue != value && !silent) this.invalidateConfig(key);
		},
		resetConfigValue: function (key, silent) {
			setConfigValue(key, ConfigManager.defaultConfig[key], silent);
		},
		
		invalidateConfig: function(fields) {
		//TODO
			
		}
		
		
		
};



ConfigManager.parseString = function(arg, res) {
	var res = res || {};
	var arr = arg.constructor === Array ? arg : arg.split(" ");
	console.log("ConfigManager: parsing string", arg, arr);
	if (arr[0].toLowerCase() == "config") {
		arr.shift();
	} else {
		console.warn("ConfigManager: invalid string to parse", arg);
		return;
	}
	if (!res.flags) res.flags = {canvasFormat: false, style: false, shader: false};

	if (arr[0].toLowerCase() == "set") arr.shift();
	var jsonstring = "{";
	var i = 0;
	var a = "";
	while (i < arr.length) {
		a = arr[i++];
		while (a == "" || a == " ") a = arr[i++];
		jsonstring += "\"" + a + "\":";
		a = arr[i++];
		while (a == "" || a == " ") a= arr[i++];
		if (i > arr.length) console.warn("ConfigManager: incomplete string to parse", arg);
		jsonstring += "\"" + a + "\",";
	}
	if (jsonstring.charAt(jsonstring.length-1) == ",") jsonstring = jsonstring.slice(0, -1);
	jsonstring += "}";
	var resObj = JSON.parse(jsonstring);
	for (var f in resObj) {
		if (resObj.hasOwnProperty(f)){
			res[f] = ConfigManager.parseField(f, resObj[f]);
			var g = ConfigManager.checkFieldType(f);
			if (g) res.flags[g] = true;
		}
	}
	console.log("Config parsed",arg, res);
	return res;
};

ConfigManager.parseXMLNode = function (node, res) {
	if (!node.nodeName || node.nodeName.toLowerCase() != "config" || !node.hasAttributes()) console.error ("Data error. Invalid config node.", node);
	
	else {
		var res = res || {};
		if (!res.flags) res.flags = {canvasFormat: false, style: false, shader: false};
		var key = node.attributes.key.nodeValue;
		var val = node.attributes.value.nodeValue;
		return ConfigManager.parseString(["config", key, val], res);
	}
}

ConfigManager.checkFieldType = function (key){
	for (var g in ConfigManager.typeObjects)
		if (ConfigManager.typeObjects.hasOwnProperty(g))
			for (var f in ConfigManager.typeObjects[g]) 
				if (f.toLowerCase() == key.toLowerCase()) return g;
};
ConfigManager.getFieldValueType = function (key) {
	var g = ConfigManager.checkFieldType(key);
	if (g) return ConfigManager.typeObjects[g][key];
	return undefined;
};

ConfigManager.parseField = function(key, valString) {
	var type = ConfigManager.getFieldValueType(key);
	if (type) {
		switch (type.charAt(0)) {
		case "f":
			return parseFloat(valString);
		case "i":
			return parseInt(valString);
		case "c":
			return ConfigManager.parseColor(valString);
		case "b": 
			return ConfigManager.parseBool(valString);
		case "s":
			default: return valString;
		}
	}
	return valString;
};

ConfigManager.parseColor = function (valString) {
	var n = parseInt(valString);
	if (isNaN(n)) return new THREE.Color(valString);
	else return new THREE.Color(n);
}

ConfigManager.parseBool = function(valString) {
	if (!isNaN(valString)) return Boolean(valString);
	var vs = valString.toLowerCase().trim();
	if (vs == "true" || vs == "yes" || vs == "y") return true;
	return false;
};


ConfigManager.getDefaultValue = function(key) {
	if (ConfigManager.defaultConfig.hasOwnProperty(key)) {
		if (ConfigManager.getFieldValueType(key) == "color")
			return new THREE.Color(ConfigManager.defaultConfig[key]);
		return ConfigManager.defaultConfig[key];
	}
	console.warn("ConfigManager: invalid key " + key);
	return null;
};
ConfigManager.defaultConfig = {width: 800, height: 600, bkgColor: 0x333333,
		actualInfinity: 1.e35, 
		pixelSize: .002, 
		juliaColor: 0x999999,
		Iterations: 1000,
		minIterNum: 8,
		minIterNumJulia: 3,
		runAwayRadius: .5, 
		convergeEpsilon: 1e-12,
		commonCyclePeriod: 1,
		showGrid: true,
		showDynamicGrid: true,
		showAbsGrid: true,
		showAbsDynamicGrid: true,
		showLabels: true,
		showArcs: true
		};
ConfigManager.canvasFormatFields = {width : "f", height: "f", 
		bkgColor: "color", 
		showGrid: "bool", showLabels: "bool", showAbsGrid: "bool", 
		showDynamicGrid: "bool", showAbsDynamicGrid: "bool",
		showArcs: "bool"};
ConfigManager.shaderFields = {
		actualInfinity: "f", 
		pixelSize: "f", 
		juliaColor: "color",
		Iterations: "i",
		minIterNum: "i",
		minIterNumJulia: "i",
		runAwayRadius: "f", 
		convergeEpsilon: "f",
		commonCyclePeriod: "i"};
ConfigManager.styleFields = {gridLineColor: "color", markerSize: "f"};
ConfigManager.typeObjects = {canvasFormat: ConfigManager.canvasFormatFields,
		style: ConfigManager.styleFields, shader: ConfigManager.shaderFields};
