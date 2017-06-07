//Copyright (c) Anna Alekseeva 2013-2016
var DATA_IN_XML = true;

		var mainCanvasContainer;//not in use
		var mainShaderMap;//not in use
		var outputLine; //not in use
		var curDataObject;//not in use
		var inited = false;//not in use
		var winID = ""; //The id of the current window, obtained from the query-string (TODO only if it's not empty)
		var connection =  null; //A web-socket connection to communicate with rsserver
		var messageBlock, dataBlock, showDataBtn, hideDataBtn, logView, pageTitle; //Permanent page elements
		var mCCDOMElement; //The dynamic html-block, to add elements on the commands from the server 
		var pageDataXML; //XML element to store data about the page structure and send to server by request. Not implemented yet
		 
		function pageInit() {
			//Executes when the html-page is loaded
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
			winID = handshakeData.getAttribute("id");
			handshakeData = xmlSerializer.serializeToString(handshakeData);
			console.log("handshakeData", handshakeData);
			// open connection
			connection = new WebSocket('ws:' + window.location.host);		
			connection.onopen = function () {
				reportStatus("Connection successfully open");
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
			var outputLine = document.createElement('div'); //The output of the function formula
			outputLine.setAttribute("class", "output-line");
			outputLine.setAttribute("id", dataElement.getAttribute("id") + "_output");
			pageElement.appendChild(outputLine);
			pageElement.outputLine = outputLine;
			if (rscc && rscc.rsCanvas && rscc.rsCanvas.canvas3d ) {
				pageElement.rscc = rscc;
				rscc.rsCanvas.canvas3d.addEventListener("SnapshotSaved", sendData); //Burned when the 'submit' button pressed
			}
			else return "Error creating canvas";
			
			if (dataElement.hasChildNodes) {
				populateCanvas(pageElement, dataElement, dataElement.getAttribute("id"));
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
		
		function populateCanvas(container, dataElement, cId){
			var err = "";
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

			} else {
				err = "Invalid canvas container";
			}
			return err;
				
		};
		
		function getElementInfo (parentContainer, resEl) {
			//TODO add position attribute
			var err = "";
			var type = parentContainer.getAttribute("contains");
			if (!type) err = "Invalid element type";
			else {
				var resNode;

				if (type == "canvas") {
					if (parentContainer.rscc && parentContainer.rscc.rsCanvas && typeof parentContainer.rscc.rsCanvas.getSnapshotElement === "function") {
						resNode = parentContainer.rscc.rsCanvas.getSnapshotElement();
					} else {
						err = "Error getting canvas information";
					}
				} else { 
					resNode = createEmptyNode(type);
					switch (type) {
						case "button": {
							
							var btn = parentContainer.getElementsByTagName("input")[0];
							if (btn) {
								resNode.setAttribute("name", btn.getAttribute("value"));
							} else {
								err = "No button in button container"
							}
							
							break;
						} case "text": {
							var p = parentContainer.getElementsByTagName("p")[0];
							if (p) {
								var str = p.innerHTML;
								resNode.appendChild(document.createTextNode(str));
							} 
							break;
						} default: {
							err = "Type " + type + " is not valid"
						}
					}//switch type
				}// type != canvas
				if (resNode && typeof resNode.setAttribute === "function") {
					resNode.setAttribute("id", parentContainer.getAttribute("id"));
					resEl.appendChild(resNode);
				}

			} //type is present
			return err;
		}

		
		function objectsInit(dataStructureArg /*an array of lines*/) {
		//Not in use anymore, just parts of code for reference (or to be reused)
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
			
		//------Event handlers for permanet page elements-------------
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
				hideDataBtn.setAttribute("hidden", "true");
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
		//---------------------------------
			
			
			function addElement (dataNode, resEl) {
				console.log("Adding element ", dataNode);
				//returns error string or nothing, if everething is Ok
				//resEl - <updata> to send response to server. Description of created element should be added here
				//TODO create list of elements in an existing window
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
				//TODO
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
			
			function addElementsToCanvas(canvasId, dataElement, resEl) {
				
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
			var resEl = createEmptyNode("updata");

			if (!downDataEl) {
				sendError("No downdata element");
			} else {
				console.log(downDataEl);
				
				var action = downDataEl.getAttribute("action");
				var objID = downDataEl.getAttribute("object");
				if (!objID && action == "remove") {window.close();}
				else {
					var parentContainer = null;
					if (objID && (parentContainer = document.getElementById(objID))) {
					
						if (action == "create" && parentContainer.getAttribute("contains") == "canvas") {
							var error = populateCanvas(parentContainer, dataElement, objID);
							if (!error) {sendData({data:"<updata status='updated' object='"+objID+"'/>"})}
							else {sendError(error);}
	
						} else if (action == "remove") {
							parentContainer.parentNode.removeChild(parentContainer);
							sendData({data:"<updata status='removed' object='" + objID + "'/>"}); 
						} else if (action == "populate" || action == "update") {
							var type = parentContainer.getAttribute("contains");
							if (!type) sendError ("No valid object type with id " + objID);
							else {
								var error = "";
								var container = parentContainer; // backward compatibility
								switch(type) {
									case "canvas": {
										error = populateCanvas(container, downDataEl, objID);
										
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
											error = "No button with id '" + objID + "' found";
										}
										break;
										}
										default: {
											error = "Action 'populate' or 'update' is not valid for '" + type + "' object";
											break;
										}
									}
									if (!error) {
										resEl.setAttribute("status", "updated");
										resEl.setAttribute("object", objID);
										sendData({data:xmlSerializer.serializeToString(resEl)}); 
	
									}
									else {
										sendError(error);
									}
								}
							} else if (action == "request") {
								//TODO
								resEl.setAttribute("status", "info");
								resEl.setAttribute("object", objID);
								var er = getElementInfo (parentContainer, resEl);
								if (er) sendError (er)
								else {
									resEl.setAttribute("status", "info");
									sendData({data:xmlSerializer.serializeToString(resEl)});
								}
								//collecting info about given object
							}	
							
						} else if (action == "create") {
							 if ( downDataEl.getElementsByTagName("window").length > 0){
								//open new window
								//TODO allow multiple windows?
									var session = downDataEl.getAttribute("session");
									if (!session) sendError ("No session attribute");
									else {
										var id = downDataEl.getElementsByTagName("window")[0].getAttribute("id");
										window.open("http://" + window.location.host + "?session=" + session + (id ? ("&id=" + id):""));
									}
	
							} else	{
								//create an object, exsept window, in a window as parent
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
						} else if (action=="request") {
							//TODO
							var windowNode = resEl.appendChild(createEmptyNode("window"));
							var error = "";
							for (var e in mCCDOMElement.childNodes ) {
								
								if (mCCDOMElement.childNodes[e] instanceof Element && mCCDOMElement.childNodes[e].getAttribute("contains"))
									error = getElementInfo (mCCDOMElement.childNodes[e], windowNode);
							}
							if (error) sendError(error)
							else {
								resEl.setAttribute("status", "info");
								sendData({data:xmlSerializer.serializeToString(resEl)});
							} 
								
						} else {
								sendError ("No object with id " + objID + " found");
						}
					}
				}
			};
		
		function updateCanvas (configObj) {
			mainCanvasContainer.updateCanvas(configObj);
		}
		
		
		function applyMap(newData) {
			//Not in use
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
