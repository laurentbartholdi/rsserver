//Copyright (c) Anna Alekseeva 2013-2016
var DATA_IN_XML = true;

		var mainCanvasContainer;//, infoIC;
		var mainShaderMap;
		var outputLine;
		var curDataObject;
		var inited = false;
		var connection =  null;
		var messageBlock, dataBlock, showDataBtn, hideDataBtn;
		var mCCDOMElement;
		var pageDataXML;
		 
		function pageInit() {
			console.log("page init launched");
			pageDataXML = document.createElement("rspage");

			//var testObj = JSON.parse('{"key1": "strval1", "ke2":0.1, "key3": [1, 2, 3], "ke4": false}');
			//console.log("JSON.parse",testObj);
			mCCDOMElement = document.getElementById('main-canvas-container');

			mCCDOMElement.parentElement.appendChild(createLogView());
			
			window.WebSocket = window.WebSocket || window.MozWebSocket;
			 
			// if browser doesn't support WebSocket, just show some notification and exit
			if (!window.WebSocket) {
				reportStatus('Sorry, but your browser doesn\'t '
				+ 'support WebSockets.', 'error');
				return;
			}
			// open connection
			connection = new WebSocket('ws:' + window.location.host);		
			connection.onopen = function () {
				reportStatus("Connection open sucsesfully");
			};
			 
			connection.onerror = function (error) {
				// just in there were some problems with conenction...
				reportStatus('Sorry, but there\'s some problem with your '
						+ 'connection or the server is down.', "error");
			};
			 
			connection.onmessage = function (message) {
				reportStatus("Data received" , "data", message.data);
				console.log("onmessage");
				onNewData(message.data);

			};
			
		}
			
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
			var dataObject = parseJuliaData(dataStructure); //in DataParser.js
			curDataObject = dataObject;
			mainShaderMap = initJuliaMap(dataStructure, true); //in RationalFuncs.js
			/*TODO styles-n-config*/
			mainCanvasContainer = new RSCanvasContainer(
						document.getElementById('main-canvas-container'), 
						mainShaderMap, {width: 1000, height: 800}, "main");
			//mainCanvasContainer.rsCanvas.rsCanvasId = 'main';
			
			outputLine = document.createElement('div');
			mCCDOMElement.appendChild(outputLine);
			getOutputDomElement(dataObject, outputLine, 3);
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
			
			
			
			function addElement (dataNode) {
				
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
		
		function onNewData(data) {
			console.log("on new data "+data);
			var parsedConfig = {flags: {shader: false, canvasFormat: false, style: false}};
			var xmlel = parseXml(data);
			console.log(xmlel);
			var arr;
			if (xmlel && xmlel.getElementsByTagName("parsererror").length == 0 ) {
				DATA_IN_XML = true;
				arr = xmlToStrings(xmlel);
			} else {
				arr = data.split("\n");
				DATA_IN_XML = false;
			}

			if (!inited) objectsInit(arr);
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
			//TODO do something with arcs and points...
			if (parsedConfig.flags.shader) applyMap(arr);
			if (parsedConfig.flags.canvasFormat) updateCanvas(parsedConfig); 
			if (parsedConfig.flags.style) mainCanvasContainer.rsCanvas.updateStyle(parsedConfig); 
			mainCanvasContainer.rsCanvas.parseData(data);

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