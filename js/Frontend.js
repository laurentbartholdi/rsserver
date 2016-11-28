//Copyright (c) Anna Alekseeva 2013-2016
var DATA_IN_XML = true;

		var mainCanvasContainer;//, infoIC;
		var mainShaderMap;
		var outputLine;
		var curDataObject;
		var inited = false;
		var connection =  null;
		var messageBlock, dataBlock, showDataBtn, hideDataBtn, logView, pageTitle;
		var mCCDOMElement;
		var pageDataXML;
		 
		function pageInit() {
			console.log("page init launched");
			pageDataXML = document.createElement("window");

			mCCDOMElement = document.getElementById('elements-container');
			pageTitle = mCCDOMElement.appendChild(document.createElement("h1"));
			pageTitle.innerHTML = document.title;
			pageDataXML.appendChild(document.createElement("head")).innerHTML = document.title;
			
			logView = createLogView();

			mCCDOMElement.parentElement.appendChild(logView);
			
			window.WebSocket = window.WebSocket || window.MozWebSocket;
			 
			// if browser doesn't support WebSocket, just show some notification and exit
			if (!window.WebSocket) {
				reportStatus('Sorry, but your browser doesn\'t '
				+ 'support WebSockets.', 'error');
				return;
			}
			
			
			var handshakeData = createEmptyNode("updata");
			handshakeData.appendChild(createEmptyNode("window"));
			
			parseQueryStringToXMLAttributes(handshakeData);
			handshakeData = xmlSerializer.serializeToString(handshakeData);
			console.log("handshakeData", handshakeData);
			// open connection
			connection = new WebSocket('ws:' + window.location.host);		
			connection.onopen = function () {
				reportStatus("Connection open sucsesfully");
				connection.send(handshakeData);
			};
			 
			connection.onerror = function (error) {
				reportStatus('Sorry, but there\'s some problem with your '
						+ 'connection or the server is down.', "error");
			};
			 
			connection.onmessage = function (message) {
				reportStatus("Data received" , "data", message.data);
				
				onNewData(message.data);

			};
			
		}


		function addCanvas (dataElement, pageElement) {
			if (dataElement.nodeName != "canvas") return "Invalid node name '" + dataElement.nodeName + "', expecting 'canvas'"; 
			var surfaceData = {}
			var canvasData = {};
			
			function attributesToObject(names, node, obj) {
				for (var i = 0; i < names.length; i ++) {
					if (node.hasAttribute(names[i])) obj[names[i]] = node.getAttribute(names[i]);
				}
			}
			attributesToObject(["width", "height", "color", "geometry", "name"], dataElement, canvasData); 
			canvasData.bkgColor = canvasData.color||"#333333";//; //backward compatibility
			var rscc = new RSCanvasContainer(
					pageElement, 
					surfaceData, 
					canvasData, 
					dataElement.getAttribute("id") + "_internal");
			var outputLine = document.createElement('div');
			outputLine.setAttribute("class", "output-line");
			outputLine.setAttribute("id", dataElement.getAttribute("id") + "_output");
			pageElement.appendChild(outputLine);
			pageElement.outputLine = outputLine;
			if (rscc && rscc.rsCanvas && rscc.rsCanvas.canvas3d ) {
				pageElement.rscc = rscc;
				rscc.rsCanvas.canvas3d.addEventListener("SnapshotSaved", sendData);
			}
			else return "Error creating canvas";
			
			if (dataElement.hasChildNodes) {
				populateCanvas(pageElement, dataElement);
			}
			
			return ""; //no errors
			
		}
		function getCanvasDataFromXML(dataElement) {
			//extracts function and configs from xml element
			//dataElement - canvas or downdata
			//returns an object that can be passed to InitJuliaMap() and getOutputDomELement
			var dataStructure = xmlToStrings(dataElement); //in DataParser.js
			var dataObject = parseJuliaData(dataStructure);  //in DataParse.js
			//TODO precess bitmap
			return dataObject;
			
		}
		
		function populateCanvas(container, dataElement){
			if (container.getAttribute("contains") == "canvas" && container.rscc && container.rscc.rsCanvas){
				if (dataElement.getElementsByTagName("function").length > 0) {
					var dataStructure = xmlToStrings(dataElement); //in DataParser.js
					var dataObject = getCanvasDataFromXML(dataElement);
					var surfaceData = initJuliaMap(dataStructure, /*Old map?*/{},true);
					surfaceData.updateUniformsDeclaration();
					container.rscc.rsCanvas.updateSphereMaterial(surfaceData, true);
					getOutputDomElement(dataObject, container.outputLine, 3);
				}
				container.rscc.rsCanvas.parseData(dataElement);
				/** /
				function applyMap(newData) {
					console.log("apply map");
					var newMap = initJuliaMap(newData, mainShaderMap);
					
					mainShaderMap = newMap;
					mainShaderMap.updateUniformsDeclaration();
					mainCanvasContainer.rsCanvas.updateSphereMaterial(mainShaderMap, true);
					curDataObject = parseJuliaData(newData);
					getOutputDomElement(curDataObject, outputLine, 3);
					
				}				 /**/
			} else {
				sendError("Invalid canvas container");
			}
				
		};

		
		function objectsInit(dataStructureArg /*an array of lines*/) {
		//!!!
			var dataStructure;
			var xmlel = parseXml(dataStructureArg.join(""));
			console.log(xmlel);
			if (xmlel && xmlel.getElementsByTagName("parsererror").length == 0 ) {
				console.log("!!!!!!!!!!!!!! arr", arr);
				DATA_IN_XML = true;
				dataStructure = xmlToStrings(xmlel);
			} else {
				dataStructure = dataStructureArg ;
				console.log("!!!!!!!!! no xml");
				DATA_IN_XML = false;
			}

			if (!dataStructureArg) {
				reportStatus("objectsInit: No data structure received", "error");
				return;
			}
			console.log("objectsInit", dataStructureArg);
		
		//TODO use in populating canvas
		var dataObject = parseJuliaData(dataStructure); //in DataParser.js
		curDataObject = dataObject;
		mainShaderMap = initJuliaMap(dataStructure, true); //in RationalFuncs.js
		//TODO that's how canvas is created!
		mainCanvasContainer = new RSCanvasContainer(
					document.getElementById('elements-container'), 
					mainShaderMap, {width: 1000, height: 800}, "main"/*idArg*/);
		//mainCanvasContainer.rsCanvas.rsCanvasId = 'main';
		
		outputLine = document.createElement('div');
		mCCDOMElement.appendChild(outputLine);
		getOutputDomElement(dataObject, outputLine, 3);
		//TODO that's when data sends
		mainCanvasContainer.rsCanvas.canvas3d.addEventListener("SnapshotSaved", sendData);
		
		inited = true;
			
	}
			
			
			var showData = function() {
				if (dataBlock)
					dataBlock.removeAttribute('hidden');
				if (hideDataBtn)
					hideDataBtn.removeAttribute('hidden');
				if (showDataBtn)
					showDataBtn.setAttribute('hidden', 'true');
			}
			var hideData = function() {
				if (dataBlock)
					dataBlock.setAttribute('hidden', 'true');
				if (hideDataBtn)
					hideDataBtn.setAttribute('hidden', 'true');
				if (showDataBtn)
					showDataBtn.removeAttribute('hidden');
			}
			var clearDataBlock = function() {
				if (dataBlock) {
					dataBlock.innerHTML = "";
					dataBlock.setAttribute("hidden", "true");
				}
				if (showDataBtn)
					showDataBtn.setAttribute("hidden", "true");
				if (hideDataBtn)
					hideDataBtn.setAttribute("hidden", "true")
			}
			
			var showDataBlock = function(){
				if(showDataBtn && hideDataBtn && hideDataBtn.getAttribute("hidden")) showDataBtn.removeAttribute("hidden");
			}
			function createLogView() {
				var logView = document.createElement('div');
				logView.setAttribute("id", "log_view");
				messageBlock = document.createElement("div");
				logView.appendChild(messageBlock);
				messageBlock.setAttribute("id", "messages");
				messageBlock.innerHTML = "Waiting for connection...";
				dataBlock = document.createElement("div");
				dataBlock.setAttribute("id", "data_view");
				dataBlock.setAttribute("hidden", "true");
				dataBlock.innerHTML = "test data";
				showDataBtn = document.createElement("button");
				var showBtn = showDataBtn;
				showBtn.setAttribute("id", "show_data_btn");
				//showBtn.setAttribute("disabled", "true");
				showBtn.addEventListener("click", showData);
				showBtn.appendChild(document.createTextNode("Show data"));
				hideDataBtn = document.createElement("button");
				var hideBtn = hideDataBtn;
				hideBtn.setAttribute("hidden", "true");
				hideBtn.addEventListener("click", hideData);
				hideBtn.appendChild(document.createTextNode("Hide data"));
				logView.appendChild(showBtn);
				logView.appendChild(hideBtn);
				logView.appendChild(dataBlock);
				clearDataBlock();
				return logView;
				
				
			}
			
			
			
			function addElement (dataNode, resEl) {
				console.log("Adding element ", dataNode);
				//returns error string or nothing, if everething is Ok
				//resEl - <updata> to send response to server. Description of created element should be added here
				//TODO create listed elements in an existing window
				var parentId = dataNode.getAttribute("canvas");
				var type = dataNode.nodeName;
				var err = "";
				if (parentId)  err = addElementToCanvas(parentId, dataNode, resEl);
				else {
					//parent is entire window
					if (type == "head") {
							
								if (dataNode.hasChildNodes()) {
									pageTitle.innerHTML = dataNode.childNodes[0].nodeValue;
									document.title = dataNode.childNodes[0].nodeValue;//
								} else {
									pageTitle.innerHTML = "";
									document.title = Titles.TITLE;
								}
						
					} else {
						
						var newContainer = document.createElement("div");
						newContainer.setAttribute("class", "element-container");
						var elID = dataNode.getAttribute("id");
						if (!elID) err = "No id attribute in a " + type + " node";
						else {
							newContainer.setAttribute("id", elID);
							newContainer.setAttribute("contains", type);
							switch (type) {								
								case "text":
									if (dataNode.hasChildNodes()) {
										newContainer.innerHTML = "<p class='server-text'>" + dataNode.childNodes[0].nodeValue + "</p>";
										
									} else {
										newContainer.innerHTML = "";
									}
									break;
								case "canvas":
									addCanvas(dataNode, newContainer);
									break;
								case "button":
									var newBtn = document.createElement("input");
									newBtn.setAttribute("type", "button");
									var btnLabel = elID;
									if (dataNode.hasAttribute("name")) btnLabel = dataNode.getAttribute("name");
									newBtn.setAttribute("value", btnLabel);
									newBtn.addEventListener(
											"click", 
											function (event) {
												sendData({data: "<updata status='button-click' object='" + elID + "'/>"});
											}, 
											true);
									newContainer.appendChild(newBtn);
									break;
								default:
									err = "The object of type " +  type + " can't be attached to a window"
							}
						}
					if (err == "") mCCDOMElement.appendChild(newContainer);
					}
				}
				resEl.appendChild(dataNode.cloneNode(true));
				if (!err || err == "null") pageDataXML.appendChild(dataNode.cloneNode(true));
				return err;
			}
			function addElementToCanvas(canvasId, dataNode, resEl) {
				var type = dataNode.nodeName;
				//the object should be attached to a canvas
				switch (type) {
				case "head":
					//break;
				case "point":
					//break;
				case "arc":
					//break;
				case "line":
					return "Sorry, this functionality is not implemented yet";
					break;
				default:
					return "The object of type " +  type + " can't be attached to a canvas"
				}
				
			}
			function removeCavas (id) {
				
			}
			
		function sendData (event) {
			//TODO send valid xml only
			if (connection) {
				connection.send(event.data);
				reportStatus("Data sent ", "data", event.data);
			}
			else reportStatus("Connection is not defined", "error");
		}
		function sendError(message) {
			reportStatus(message, "error");
			if (connection) connection.send("<updata status='error'><error>" + message + "</error></updata>");
		}
		
		function onNewData(data) {
			console.log("on new data "+data);
			var parsedConfig = {flags: {shader: false, canvasFormat: false, style: false}};
			var xmlel = parseXml(data);
			console.log("" + xmlel);
			var arr;
			if (xmlel && xmlel.getElementsByTagName("parsererror").length == 0 ) {
				DATA_IN_XML = true;
				arr = xmlToStrings(xmlel);
			} else {
				sendError("XML parse error " + xmlel.getElementsByTagName("parsererror")[0]);
			}
			var downDataEl = xmlel.getElementsByTagName("downdata")[0];
			if (!downDataEl)
				sendError("No downdata element");
			else {
				console.log(downDataEl);
				
				var action = downDataEl.getAttribute("action");
				switch (action) {
				case "create":
					if (downDataEl.getElementsByTagName("window").length > 0)
						{
						//open new window
						//TODO allow multiple windows?
							var session = downDataEl.getAttribute("session");
							if (!session) sendError ("No session attribute");
							else {
								var id = downDataEl.getElementsByTagName("window")[0].getAttribute("id");
								window.open("http://" + window.location.host + "?session=" + session + (id ? ("&id=" + id):""));
							}
						}
					else {
						var resEl = createEmptyNode("updata");
						var error = "", i = 0;
						while (downDataEl.childNodes.length > i && !error){							
							console.log(downDataEl.childNodes, i);
							error = addElement(downDataEl.childNodes[i++], resEl);
						}
						if (error) {
							sendError(error);
						} else {
							resEl.setAttribute("status", "created");
							sendData({data:xmlSerializer.serializeToString(resEl)});
						}
					}
					break;
				case "populate":
					if (downDataEl.hasAttribute("object")) {
						var objID = downDataEl.getAttribute("object");
						var container = document.getElementById(objID);
						console.log("container", container);
						if (!container) sendError ("No object with id " + objID + " found");
						else {
							var type = container.getAttribute("contains");
							if (!type) sendError ("No valid object type with id " + objID);
							else {
								switch(type) {
									case "canvas": {
										populateCanvas(container, downDataEl);
										
										break;
									}
									case "text": {
										if (downDataEl.hasChildNodes() && downDataEl.childNodes[0].nodeValue) {
											container.innerHTML = "<p class='server-text'>" + downDataEl.childNodes[0].nodeValue + "</p>";										
										} else {
											container.innerHTML = "";
										}
										break;
									}
									case "button": {
										var btn = container.getElementsByTagName("input")[0];
										if (btn) {
											if (downDataEl.hasChildNodes() && downDataEl.childNodes[0].nodeValue) {
												btn.setAttribute("value", downDataEl.childNodes[0].nodeValue)
											} else {
												btn.setAttribute("value", objID);
											}
											
										} else {
											sendError("No button with id '" + objID + "' found")
										}
										break;
									}
									default: {
										sendError ("Action 'populate' is not valid for '" + type + "' object");
										break;
									}
								}
							}
						}
						
					} else {
						sendError("No 'object' attribute");
					}
					break;
				case "update":
					//break;
				case "remove":
					sendError("Sorry, this functionality is not implemented yet");

					break;
				default:
					sendError("Invalid action attribute " + action);
				}
				
			}
			//TODO reuse this code, allowing multiple canvases and other elements
			//------------
			/*if (!inited) objectsInit(arr);
			else {
				var line;
				for (var i = 0; i < arr.length; i++) {
					line = arr[i].split(" ");
					switch (line[0].toLowerCase()) {
					case "function":
					case "cycles": {
						parsedConfig.flags.shader = true;
						break;
					}
					case "config": {
						switch (line[1].toLowerCase()) {
						case "get": {
							var val = mainCanvasContainer.configManager.getConfigValueString(line[2]);
							if (connection)
								connection.send(val);
							//sendData (new Event({data: line[1] + " " + val}));
						}
						case "save":
						case "load": {
							break;
						}
						case "set":
							ConfigManager.parseString(line, parsedConfig);	
							console.log("frontend parser", parsedConfig, parsedConfig.flags);
						}
					}
					
					}
				}
			}
			//----------------------------------
			//TODO do something with arcs and points...
			if (parsedConfig.flags.shader) applyMap(arr);
			if (parsedConfig.flags.canvasFormat) updateCanvas(parsedConfig); 
			if (parsedConfig.flags.style) mainCanvasContainer.rsCanvas.updateStyle(parsedConfig); 
			mainCanvasContainer.rsCanvas.parseData(data);*/

		}
		
		function updateCanvas (configObj) {
			mainCanvasContainer.updateCanvas(configObj);
		}
		
		
		function applyMap(newData) {
			console.log("apply map");
			var newMap = initJuliaMap(newData, mainShaderMap);
			
			mainShaderMap = newMap;
			mainShaderMap.updateUniformsDeclaration();
			mainCanvasContainer.rsCanvas.updateSphereMaterial(mainShaderMap, true);
			curDataObject = parseJuliaData(newData);
			getOutputDomElement(curDataObject, outputLine, 3);
			
		}
		function reportStatus(message, type, data){
			type = type || "log";
			console.log(messageBlock, message, type, data);
			if (messageBlock)
			messageBlock.innerHTML = "<p "+ (type.toLowerCase().charAt(0)=="e"? " style='color:red'":"")+">"+
				message + "</p>";
			if (data) {
				if (dataBlock) 
					dataBlock.innerHTML = "<pre>" +data.replace(/</g, "&lt;").replace(/>/g, "&gt;") +"</pre>";
					showDataBlock();
			} else { clearDataBlock();}
		}
console.log("Frontend loaded");