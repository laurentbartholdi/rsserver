//Common functions for RSCanvas and PlaneCanvas (processing shaders etc.)
//Use as CanvasCommns.[function].call(this, arguments);
InteractiveCanvas = function (canvas, materialData, canvasData) {
	this.canvasData = canvasData || {};
	this.configManager = this.canvasData.configManager || new ConfigManager(this.canvasData);
	this.bkgColor = this.configManager.getConfigValue("bkgColor") || new THREE.Color(0x333333);
	
	
	this.bitmapCash = {};
	
}
InteractiveCanvas.CAMERA_FOV = 45;
InteractiveCanvas.prototype = {
		constructor: InteractiveCanvas,
		
		updateSphereMaterial: function (materialData, forceUpdate) {
			if (materialData instanceof ComplexShaderMap) {
				if (materialData.initData && materialData.initData.xml ) {
					this.funcXML = materialData.initData.xml;
					if (this.legend && this.legend instanceof Legend) {
						var functionData = this.funcXML;
						if (functionData) {
							var cycles = functionData.getElementsByTagName("cycle");
							var legendData = [];
							if (cycles && cycles.length > 0) {
								for (var i = 0; i < cycles.length; i ++){
									var numbers = cycles[i].getElementsByTagName("cn");
									for (var j = 0; j < numbers.length; j++)
										legendData.push(Complex.fromXML(numbers[j]));
								}
									
							}
							var jColor = new THREE.Color();
							jColor.set(this.configManager.getConfigValue("juliaColor"));
							jColor.message = "Julia set"
							legendData.push(jColor);
							this.legend.update(legendData);
							this.updateLegendPosition();
						}
					}

				}
				if (!(this.object.material instanceof THREE.ShaderMaterial) )
					this.object.material = this.initShaderMaterial(this.object.geometry, materialData);
				if (forceUpdate) {
					this.object.material.fragmentShader = this.getFragmentShaderString(materialData);
					this.object.material.needsUpdate = true;
					this.object.material.complexShaderMap = materialData;
				} else {
					for (var s in materialData.uniforms) {
						if (!ComplexShaderMap.uniformsTypesMap[materialData.uniforms[s].type].array) {
							
							this.object.material.uniforms[s].value = materialData.uniforms[s].value;
							this.object.material.uniforms[s].needsUpdate = true;
						}
					}
				}
				this.configManager.updateMultiple(materialData.initData.config);
				this.somethingChanged = true;

			} else if(materialData instanceof BitmapFillData) {
				if (!(this.object.material instanceof THREE.MeshLambertMaterial) ) 
				{this.object.material = new THREE.MeshLambertMaterial()};
				
				if (!forceUpdate && materialData.hasOwnProperty("name")) {
					if (materialData.baseTransform instanceof MoebiusTransform && materialData.baseTransform.getDistance(this.currentTransform) > 1e-13) {
						var newData = this.chooseBitmap(materialData.name, this.currentTransform);
						if (newData) materialData = newData;
					}
				} else if (materialData.hasOwnProperty("name")) {
					this.cashBitmap(materialData);
				}
				
				this.initTextureMaterial(this.object.geometry, materialData, this.object.material);
				this.object.material.needsUpdate = true;
				this.somethingChanged = true;
				if (this.legend.update && !( this.legend.name && 
						this.object.material.name && 
						this.object.material.name == this.legend.name)) 
					this.legend.update();
			} 
			
		},
		cashBitmap: function (bitmapNode) {
			var materialData = bitmapNode instanceof BitmapFillData? bitmapNode : new BitmapFillData(bitmapNode);
			if (materialData.hasOwnProperty("name")) {
				if (!this.bitmapCash.hasOwnProperty(materialData.name)) this.bitmapCash[materialData.name] = [];
				var exists = false;
				for (var i = 0; i < this.bitmapCash[materialData.name].length; i++) {
					if (this.bitmapCash[materialData.name][i].baseTransform.getDistance(materialData.baseTransform) < 1e-13)
						exists = true;
				}
				if (!exists)
					this.bitmapCash[materialData.name].push(materialData);
			}			
		},
		
		chooseBitmap: function (name, transform) {
			if (!this.bitmapCash.hasOwnProperty(name)) {
				return null
			}
			var minDistance = Number.POSITIVE_INFINITY;
			var ind = -1;
			for (var i = 0; i < this.bitmapCash[name].length; i++) {
				var dist = this.bitmapCash[name][i].baseTransform.getDistance(transform);
				if (dist < minDistance) {
					minDistance = dist;
					ind = i;
				}
			}
			if (ind >= 0) return this.bitmapCash[name][ind];
			return null;
		},
		 getFragmentShaderString: function (complexShaderMap) {
	          	if (!complexShaderMap) {
	          		complexShaderMap = new ComplexShaderMap();
	          	}
	          	var fragmentShaderString = [
	          	                           	complexShaderMap.uniformsDeclaration,
	          	                           	"varying vec3 vLightFront;",

	          	                            //"varying vec3 vPosition;",
	          	                            "varying vec2 vC;",
	          	                            "varying float vScale;",
	          	                            "varying vec2 vZ;",
	          	                            "varying vec2 vW;",
	          	                            
	          	                            complexShaderMap.methods ? complexShaderMap.methods : "",

	          	                            "void main() {",
	          	                            "float r, g, b;",
	          	                            "vec2 c = vC;",
	          	                            "vec2 z = vZ;",
	          	                            "vec2 w = vW;",
	          	                            "float scale = vScale;",
	          	                            complexShaderMap.code,
	          	                            
	          	                            "gl_FragColor = vec4(r, g, b, 1.0);",
	          	                           	"gl_FragColor.xyz *= vLightFront;",
	          	                        	"}"
	          	                        ].join("\n");
	          	return fragmentShaderString;
	          },
	          
	          getVertexShaderString: function () {
	        	  var vertexShaderString = [
	        		                      	"attribute vec2 c;",
	        		                      	"attribute float scale;",
	        		                      	"attribute vec2 w;",
	        		                      	"attribute vec2 z;",
	        		                      	"varying vec3 vPosition;",
	        		                      	"varying vec3 vLightFront;",
	        		                      	"varying vec2 vC;",
	        		                      	"varying float vScale;",
	        		                      	"varying vec2 vZ;",
	        		                      	"varying vec2 vW;",
	        		                      	"uniform vec3 diffuse;",
	        		                      	"uniform vec3 ambient;",
	        		                      	"uniform vec3 emissive;",
	        		                      	"uniform vec3 ambientLightColor;",
	        		                      	"#if NUM_DIR_LIGHTS > 0",
	        		                        "struct DirectionalLight {",
	        		                         "   vec3 direction;",
	        		                         "   vec3 color;",
	        		                         "   int shadow;",
	        		                         "   float shadowBias;",
	        		                         "   float shadowRadius;",
	        		                         "   vec2 shadowMapSize;",
	        		                         "};",
	        		                         "uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];",
	        		                      	"#endif",

	        		                      	"void main() {",
	        		                      		"vec3 transformedNormal = normalMatrix * normal;",
	        		                      		"vLightFront = vec3( 0.0 );",
	        		                      		"#if (NUM_DIR_LIGHTS > 0)",
	        		                      			"for( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {",
	        		                      		
	        		                      				"vec4 lDirection = viewMatrix * vec4( directionalLights[ i ].direction, 0.0 );",
	        		                      				"vec3 dirVector = normalize( lDirection.xyz );",
	        		                      		
	        		                      				"float dotProduct = dot( transformedNormal, dirVector );",
	        		                      				"vec3 directionalLightWeighting = vec3( max( dotProduct, 0.0 ) );",
	        		                      		
	        		                      		
	        		                      				"vLightFront += directionalLights[ i ].color * directionalLightWeighting;",
	        		                      			"}",
	        		                      		
	        		                      		"#endif",
	        		                      		"vLightFront = vLightFront * diffuse + ambient * ambientLightColor + emissive;",
	        		                      		"vC =c;",
	        		                      		"vScale = scale;",
	        		                      		"vZ = z;",
	        		                      		"vW = w;",
	        		                      		"gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);",
	        		                      	 "}"
	        		                      ].join("\n");

	        	  	return vertexShaderString;
	  
	          },
	          initShaderMaterial: function(geom, shaderMap) {
	        		if (!shaderMap) shaderMap = new ComplexShaderMap();
	        		this.curShaderMap = shaderMap;
	        		this.updateComplexAttribute(geom, shaderMap);
	        		var uniforms = THREE.UniformsUtils.merge ([
	        			THREE.UniformsLib[ "lights" ],
	        		{
	        			diffuse: {type: "c", value: new THREE.Color( 0xffffff )}, 
	        			ambient: {type: "c", value: new THREE.Color( 0xffffff )},
	        			emissive: {type: "c", value: new THREE.Color( 0x000000 )}
	        				},
	        				shaderMap.uniforms]);

	        		                                           
	        		var shaderMaterial = new THREE.ShaderMaterial({
	        			  uniforms:uniforms,
	        			  vertexShader: this.getVertexShaderString(),
	        			  fragmentShader: this.getFragmentShaderString(shaderMap),
	        			  lights: true
	        			  });
	        		shaderMaterial.complexShaderMap = shaderMap;
	        		return shaderMaterial;
	        	},
	        	
	        	updateComplexAttribute: function(geom, shaderMap) {
	        		var posArr = geom.getAttribute("position");
	        			var numVerticies = posArr.count;
	        			if (!geom.getAttribute("c")) {
	        				geom.addAttribute("c", new THREE.BufferAttribute(new Float32Array(2*numVerticies), 2, false ));
	        				geom.addAttribute("scale", new THREE.BufferAttribute(new Float32Array(numVerticies), 1, false ));
	        				geom.addAttribute("z", new THREE.BufferAttribute(new Float32Array(2*numVerticies), 2, false ));
	        				geom.addAttribute("w", new THREE.BufferAttribute(new Float32Array(2*numVerticies), 2, false ));
	        			}
	        			var attr = geom.attributes;
	        			
	        			var curAttr = {};
	        			for (var i = 0; i < numVerticies; i++){
	        				this.getAttributeValues(posArr, i, curAttr);
	        				var c = curAttr.c;
	        				var w = new Complex(1/(c.r() + 1), 0);
	        				var z = c.mult(w);
	        				attr.scale.setX(i, curAttr.scale); 
	        				if ( shaderMap && shaderMap.polar ) {
	        					attr.c.setXY(i, c.r(), c.t());
	        					attr.z.setXY(i, z.r(), z.t());
	        					attr.w.setXY(i, w.r(), w.t());
	        				} else {
	        					attr.c.setXY(i, c.re, c.i);
	        					attr.z.setXY(i, z.re, z.i);
	        					attr.w.setXY(i, w.re, w.i);
	        				}
	        			}
	        			attr.c.needsUpdate = true;
	        			attr.scale.needsUpdate = true;
	        			attr.z.needsUpdate = true;
	        			attr.w.needsUpdate = true;
	        			return attr;

	        	},
	        	
	        	initTextureMaterial : function (geometry, data, material) {
	        		if (!(data instanceof BitmapFillData)) return null;
	        		material = material || new THREE.MeshLambertMaterial();
	        		var baseTransform = data.baseTransform || MoebiusTransform.identity;
	        		
	        		var surfaceTransform = this.getTransform().superpos(baseTransform.invert());
	        		var loader = new THREE.TextureLoader();
	        		var that_ = this;
		      		material.baseTransform = baseTransform;
	        		if (data.name) material.name = data.name;
	        		else material.name = undefined;
	        		loader.load(data.dataURL, function(texture) {
		      		  texture.wrapS = that_.textureWrapS; //THREE.RepeatWrapping;
		      		  texture.wrapT = that_.textureWrapT; //THREE.RepeatWrapping;
		      		  material.map = texture;
		      		  material.needsUpdate = true;
		      		  material.map.needsUpdate = true;
		      		  that_.somethingChanged = true;
	        			
	        		});
	      			 this.updateCustomUVs (geometry, this.getUV, {transform: surfaceTransform});
	      			 this.somethingChanged = true;
	      			 return material;
	        	},

	        	

	        	
	        	updateCustomUVs : function (geometry, getUVFunc, paramsArg) {
	        			var posAttr = geometry.getAttribute("position");
	        	 		var uvAttr = geometry.getAttribute("uv");
	        	 		var indicies = geometry.getIndex();
	        	 		
	        	 		var params = this.getUVOptions(paramsArg.transform);
	        	 		if (!indicies) {
	        	     		for (var i = 0; i < posAttr.count; i+=3) {
	        	     			var uvs = [];
	        	     			for (var di = 0; di < 3; di++) {
	        	     				uvs.push(getUVFunc(posAttr.getX(i+di), posAttr.getY(i+di), posAttr.getZ(i+di), params));
	        	     			}
	        	     			function checkBound2 (ind, name) {
	        	 					if (uvs[(ind + 1) % 3][name] - uvs[(ind + 2) % 3][name] > 0.5) {
	        	 						if (uvs[(ind + 2) % 3][name] > 1 - uvs[(ind + 1) % 3][name]) uvs[(ind + 1) % 3][name] -= 1;
	        	 						else uvs[(ind + 2) % 3][name] += 1
	        	 					} else if (uvs[(ind + 1) % 3][name] - uvs[(ind + 2) % 3][name] < -0.5) {
	        	 						if (uvs[(ind + 1) % 3][name] > 1 - uvs[(ind + 2) % 3][name]) uvs[(ind + 2) % 3][name] -= 1;
	        	 						else uvs[(ind + 1) % 3][name] += 1     						
	        	 					}
	        	     				
	        	     			}
	        	     			function getMissing (mainInd, ind, name) {
	        	     				var p = new THREE.Vector3(posAttr.getX(mainInd + ind), posAttr.getY(mainInd + ind), posAttr.getZ(mainInd + ind));
	        	     				var p1 = new THREE.Vector3(posAttr.getX(mainInd + (ind + 1) % 3), posAttr.getY(mainInd + (ind + 1) % 3), posAttr.getZ(mainInd + (ind + 1) % 3));
	        	     				var p2 = new THREE.Vector3(posAttr.getX(mainInd + (ind + 2) % 3), posAttr.getY(mainInd + (ind + 2) % 3), posAttr.getZ(mainInd + (ind + 2) % 3));
	        	     				
	        	     				var q = new THREE.Vector3();
	        	     				q.subVectors(p, p1);
	        	     				var q2 = new THREE.Vector3();
	        	     				q2.subVectors(p2, p1);
	        	     				var ql = q.length();
	        	     				var q2l = q2.length();
	        	     				var cos = q.dot(q2)/ql/q2l;
	        	     				var sin = Math.sqrt(1-cos*cos);
	        	     				var cv = new THREE.Vector3();
	        	     				cv.crossVectors(p, p2);
	        	     				if ( cv.dot(p1) < 0 ) sin = -sin;
	        	     				var altName = name == "u" ? "v" : "u";
	        	     				var dU = uvs[(ind + 2) % 3][name] - uvs[(ind + 1) % 3][name];
	        	     				var dV = uvs[(ind + 2) % 3][altName] - uvs[(ind + 1) % 3][altName];
	        	     				return uvs[(ind + 1) % 3][name] + ql/q2l*(dU*cos + dV*sin);
	        	     			}
	        	     			function checkBound (ind, name) {
	        	     				var d1 = uvs[ind][name] - uvs[(ind + 1) % 3][name];
	        	     				var d2 = uvs[ind][name] - uvs[(ind + 2) % 3][name];
	        	     				if (Math.abs(d1) > 0.5 && Math.abs(d2) > 0.5) {
	        	     					if (d1 > 0) uvs[ind][name] -= 1;
	        	     					else uvs[ind][name] += 1;
	        	     				}
	        	     			}
	        	     			
	        	     			for (var di = 0; di < 3; di ++) {
	        	     				if (isNaN(uvs[di].u)) {
	        	     					checkBound2(di, "u");
	        	     					uvs[di].u = getMissing(i, di, "u");
	        	     				}
	        	     				if (isNaN(uvs[di].v)) {
	        	     					checkBound2(di, "v");
	        	     					uvs[di].v = getMissing(i, di, "v");
	        	     				}
	        	     			}
	        	     			for (var di = 0; di < 3; di ++) {
	        	     				checkBound(di, "u");
	        	     				checkBound(di, "v");
	        	     				uvAttr.setX(i + di, uvs[ di].u);
	        	     				uvAttr.setY(i + di, uvs[ di].v);
	        	     			}
	        	     		}
	        	 		} else { //TODO avoid side effects on indexed array
	        	 			for (var i = 0; i < posAttr.count; i++) {
	        	 				var uv = getUVFunc(posAttr.getX(i), posAttr.getY(i), posAttr.getZ(i), params);
	        	 				if (isNaN(uv.u)) uv.u = 0;
	        	 				if (isNaN(uv.v)) uv.v = 0;
	        	 				uvAttr.setX(i, uv.u);
	        	 				uvAttr.setY(i, uv.v);
	        	 			}
	        	 		}
	        	 		geometry.attributes.uv.needsUpdate = true;/**/
	        	},
	        		
	        	
	        	init: function (canvas, materialData, canvasData) {
	        			this.canvas3d = canvas;
	        			this.aspect = this.canvas3d.width/this.canvas3d.height;
	        			
	        			//var lblm = new RSCanvas.LabelManager(this);
	        			
	        			
	        			
	        			
	        			//------------
	        			
	        			var sphGeom = this.getObjectGeometry();
	        			var sphMaterial = new THREE.MeshLambertMaterial({ color: 0x666666 }); 
	        			if (materialData) { 
	        				if (materialData instanceof ComplexShaderMap) {
	        					sphMaterial = this.initShaderMaterial(sphGeom, materialData);
	        				} else if(materialData instanceof BitmapFillData) {
	        					sphMaterial = this.initTextureMaterial(sphGeom, materialData);
	        				}
	        				else {
	        					sphMaterial = this.initShaderMaterial(sphGeom);
	        				}
	        			} else {
	        				sphMaterial = this.initShaderMaterial(sphGeom);
	        			}
	        			
	        			//!?
	        			this.object = new THREE.Mesh( sphGeom, sphMaterial );
	        			this.object.dynamic = true;
	        			//-------------------

	        			this.scene = new THREE.Scene();
	        			this.camera = new THREE.PerspectiveCamera( InteractiveCanvas.CAMERA_FOV, this.aspect, 0.1, 1000 );
	        			
	        			this.renderer = new THREE.WebGLRenderer({canvas: this.canvas3d});

	        			this.renderer.setSize( this.canvas3d.width, this.canvas3d.height );
	        			this.renderer.setClearColor(this.bkgColor);


	        			var light = new THREE.AmbientLight( 0x666666, 1. ); 
	        			var directionalLight = new THREE.DirectionalLight( 0xffffff, 0.8 );
	        			directionalLight.position.set( -2, 1, 1 );
	        			this.scene.add( directionalLight );
	        			this.scene.add( light );
	        			
	        			//!?    
	        			this.scene.add( this.object );
	        			//---------------------------
	        			
	        			var that = this;
	        			this.onTransformChanged = function (event) {
	        				if (that.object && that.object.material && that.object.material.name ) {
	        					var newData = that.chooseBitmap(that.object.material.name, that.getTransform());
	        					if (newData) that.updateSphereMaterial(newData, false);
	        				}
	        			}
	        			
	        			if (this.canvas3d) {
	        				this.canvas3d.addEventListener("transformChanged", this.onTransformChanged);
	        			}

	        		    
	        		    this.inited = true;	        		
	        	},
	        	parseData: function (data){
	        		if (typeof data === "string") data = parseXml(data);
	        		var ddata = data.getElementsByTagName("downdata");
	        		if (ddata.length > 0) data = data.getElementsByTagName("downdata")[0];
	        		ddata = data.getElementsByTagName("canvas");
	        		if (ddata.length > 0) data = data.getElementsByTagName("canvas")[0];
	        		var configParsed = false;
	        		var res = {};
	        		
	        		var configData = data.getElementsByTagName("config");
	        		if (configData && configData.length > 0){
	        			var newConfig = {};
	        			for (var i = 0; i < configData.length; i++) {
	        				ConfigManager.parseXMLNode(configData[i], newConfig);
	        			}
	        			var canvasFormatChanged = false;
	        			var legendChanged = false;
	        			var styleChanged = false;
	        			var shaderChanged = false;
	        			for (var f in newConfig)
	        				if (newConfig.hasOwnProperty(f)) {
	        					if (ConfigManager.checkFieldType(f) == "canvasFormat")
	        						canvasFormatChanged = true;
	        					if (f.substr(0, 6) == "legend" || f == "showLegend")
	        						legendChanged = true;
	        					if (ConfigManager.checkFieldType(f) == "style")
	        						styleChanged = true;
	        					if (ConfigManager.checkFieldType(f) == "shader")
	        						shaderChanged = true;
	        				}
	        			if (canvasFormatChanged || styleChanged || shaderChanged) {
	        				this.configManager.updateMultiple(newConfig);
	        				if (this.legend && legendChanged) this.updateLegendPosition();
	        				this.render();
	        			} 
	        			if (shaderChanged && this.object.material instanceof THREE.ShaderMaterial) {
	        				if(this.object.material.complexShaderMap instanceof ComplexShaderMap) {
	        					var newMap = updateJuliaMap(this.object.material.complexShaderMap, this.configManager);
	        					this.updateSphereMaterial(newMap, true);
	        				}
	        			}
	        			configParsed = true;
	        		}
	        		
	        		this.newDataLoaded = true;
	        		this.somethingChanged = true;
	        		
	        		return data;
	        	}
			
		
};
var icp = InteractiveCanvas.prototype;
icp.getSnapshot = function() {
	var snapshotXMLObj = this.getSnapshotElement();
	var rootObj = createEmptyNode("updata");
	if (this.serverId) rootObj.setAttribute("object", this.serverId);
	rootObj.appendChild(snapshotXMLObj);
	return xmlSerializer.serializeToString(rootObj);


};

icp.getSnapshotElement = function () {
	var snapshotXMLObj = createEmptyNode("canvas");
	snapshotXMLObj.setAttribute("static", "false");
	if (this.configManager.getConfigValue("reportImage")) {
		this.somethingChanged = true;
		this.render();
		var imgData = this.canvas3d.toDataURL();
		snapshotXMLObj.appendChild(document.createTextNode(imgData));
	} else {
		if (this.object.material instanceof THREE.ShaderMaterial) { //shadermap
			if (this.funcXML) {
				snapshotXMLObj.appendChild(this.funcXML.cloneNode(true));
			}
		} else {
			snapshotXMLObj.appendChild(createEmptyNode("bitmap"));
		}
	}
	return snapshotXMLObj;
};

icp.render = function () {
	if (this.somethingChanged) {
		this.renderer.render(this.scene, this.camera);
		this.somethingChanged = false;
		if (this.labelManager) this.labelManager.checkLabels(true);
		
	}

};

icp.onCanvasResize = function () {
	this.camera.aspect = this.canvas3d.width / this.canvas3d.height;
	this.camera.updateProjectionMatrix();
	this.renderer.setSize( this.canvas3d.width, this.canvas3d.height );
	if (this.legend) this.updateLegendPosition();
	this.renderer.render();

};

icp.getUVOptions = function (tr) {
	return {transform: tr};
}
//------------

BitmapFillData = function (data, transform, name) {
	if (data instanceof Node) {
		var dataNode = data.getElementsByTagName("data")[0] || data;
		for (var i = 0; i < dataNode.childNodes.length; i++) {
			if (dataNode.childNodes[i].nodeType == 3) this.dataURL = dataNode.childNodes[i].nodeValue;
		}
		var trXML =  data.getElementsByTagName("transform")[0]; 
		if (trXML) {
			this.baseTransform = MoebiusTransform.fromXML(trXML);
		} else {
			this.baseTransform = MoebiusTransform.identity;
		}
		var name_ = data.getAttribute("name");
		if (name_) this.name = name_;
		
	} else {
		this.dataURL = data;
		if (transform instanceof MoebiusTransform)
			this.baseTransform = transform;
		else this.baseTransform = MoebiusTransform.identity;
		if (name) this.name = name;
	}
	
}

BitmapFillData.prototype = {
		constructor: BitmapFillData,
		toXML: function () {
			var res = createEmptyNode("bitmap");
			var dataNode = createEmptyNode("data");
			if (this.name) dataNode.addAttribute("name", this.name);
			dataNode.textContent = this.dataURL;
			res.appendChild(dataNode);
			res.appendChild(this.baseTransform.toXML());
			return res;
		}
}



