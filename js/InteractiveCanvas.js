//Common functions for RSCanvas and PlaneCanvas (processing shaders etc.)
//Use as CanvasCommns.[function].call(this, arguments);
InteractiveCanvas = function (canvas, materialData, canvasData) {
	this.canvasData = canvasData || {};
	this.configManager = this.canvasData.configManager || new ConfigManager(this.canvasData);
	this.bkgColor = this.configManager.getConfigValue("bkgColor") || new THREE.Color(0x333333);
	
}
InteractiveCanvas.CAMERA_FOV = 45;
InteractiveCanvas.prototype = {
		constructor: InteractiveCanvas,
		
		updateSphereMaterial: function (materialData, rebuildShader) {
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
				if (rebuildShader) {
					this.object.material.fragmentShader = this.getFragmentShaderString(materialData);
					this.object.material.needsUpdate = true;
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

			} else {
				this.object.material.complexTextureImage.update(this, materialData);
				this.object.material.map.needsUpdate = true;
			}
			
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
	        	  console.log("initShaderMaterial", shaderMap);
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
	        		console.log(shaderMaterial.fragmentShader);
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
	        	
	        	init: function (canvas, materialData, canvasData) {
	        			this.canvas3d = canvas;
	        			this.aspect = this.canvas3d.width/this.canvas3d.height;
	        			
	        			//var lblm = new RSCanvas.LabelManager(this);
	        			
	        			
	        			
	        			
	        			//------------
	        			
	        			var sphGeom = this.getObjectGeometry();
	        			var sphMaterial = new THREE.MeshLambertMaterial({ color: 0x666666 }); 
	        			if (materialData) { 
	        				console.log(materialData, materialData instanceof ComplexShaderMap);
	        				if (materialData instanceof ComplexShaderMap) {
	        					console.log("ShaderMap created", materialData)
	        					sphMaterial = this.initShaderMaterial(sphGeom, materialData);
	        				} else if (materialData instanceof TextureImage){
	        					console.log("TextureImage", materialData);
	        					sphMaterial = new THREE.MeshLambertMaterial({
	        						map : new THREE.Texture(materialData.textureCanvas)
	        						//map : new THREE.Texture(document.getElementById("test-canvas"))
	        					});
	        					sphMaterial.complexTextureImage = materialData;
	        					sphMaterial.needsUpdate = true;
	        					sphMaterial.map.needsUpdate = true;
	        				} else sphMaterial = this.initShaderMaterial(sphGeom);
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
	        			for (var f in newConfig)
	        				if (newConfig.hasOwnProperty(f)) {
	        					if (ConfigManager.checkFieldType(f) == "canvasFormat")
	        						canvasFormatChanged = true;
	        					if (f.substr(0, 6) == "legend" || f == "showLegend")
	        						legendChanged = true;
	        					if (ConfigManager.checkFieldType(f) == "style")
	        						styleChanged = true;
	        				}
	        			if (canvasFormatChanged || styleChanged) {
	        				this.configManager.updateMultiple(newConfig);
	        				if (this.legend && legendChanged) this.updateLegendPosition();
	        				this.render();
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
	spapshotXMLObj.setAttribute("static", "false");
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




