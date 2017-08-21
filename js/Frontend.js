//Copyright (c) Anna Alekseeva 2013-2017
var DATA_IN_XML = true;

		var winID = ""; //The id of the current window, obtained from the query-string (TODO only if it's not empty)
		var connection =  null; //A web-socket connection to communicate with rsserver
		var messageBlock, dataBlock, showDataBtn, hideDataBtn, logView, pageTitle; //Permanent page elements
		var mCCDOMElement; //The dynamic html-block, to add elements on the commands from the server 
		var pageDataXML; //XML element to store data about the page structure and send to server by request.
		var templates = [];
		
		var DEBUG = 0;
		 
		function pageInit() {
			//Executes when the html-page is loaded
			console.log("page init launched");
			pageDataXML = document.createElement("window");
			//console.log(Complex.parseFunction("3+4i"));
			mCCDOMElement = document.getElementById('elements-container');
			//pageTitle = mCCDOMElement.appendChild(document.createElement("h1"));
			pageTitle = document.createElement("h1");
			pageTitle.innerHTML = document.title;
			pageDataXML.appendChild(document.createElement("head")).innerHTML = document.title;
			
			logView = createLogView();

			mCCDOMElement.parentElement.appendChild(logView);
			mCCDOMElement.parentNode.insertBefore(pageTitle, mCCDOMElement);
			
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
			  
			if (handshakeData.hasAttribute("debug")) {
				DEBUG = handshakeData.getAttribute("debug");
				handshakeData.removeAttribute("debug");
			}
			console.log(DEBUG, DEBUG == 1);
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
		
		function adopt (child, newParent) {
			if (child) {
				if( child.parentNode) 
					child.parentNode.removeChild(child);
				if (newParent && (typeof newParent.appendChild === "function")) 
					newParent.appendChild(child);
			}
		}
		
		function halm (oldElement, newElement) {
			if (oldElement.nodeType == 1) {
				if (!newElement) 
					newElement = document.createElement(oldElement.nodeName);
				for (var f = 0; f < oldElement.attributes.length; f++) {
					
						newElement.setAttribute(oldElement.attributes[f].name, oldElement.attributes[f].value)
				};
				for (var i = 0; i < oldElement.childNodes.length; i++)
					newElement.appendChild(halm(oldElement.childNodes[i]));
			} else if (oldElement.nodeType == 3)
					newElement = document.createTextNode(oldElement.nodeValue);
		
			return newElement;			
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
			attributesToObject(["width", "height", "color", "geometry", "name", "static"], dataElement, canvasData); 
			canvasData.bkgColor = canvasData.color||"#333333"; //backward compatibility
			canvasData.geometry = canvasData.geometry || "sphere";
			if (!canvasData.hasOwnProperty("static")) canvasData["static"] = false;
			canvasData["static"] = ConfigManager.parseBool(canvasData["static"]);
			if (!canvasData["static"]) {
				var rscc;
				if (canvasData.geometry == "sphere")
					{rscc = new RSCanvasContainer(
							pageElement, 
							surfaceData, 
							canvasData, 
							dataElement.getAttribute("id") + "_internal");
					}
				else {
					rscc = new PlaneCanvasContainer(
							pageElement, 
							surfaceData, 
							canvasData, 
							dataElement.getAttribute("id") + "_internal");
					
				}
				var outputLine = document.createElement('div'); //The output of the function formula
				outputLine.setAttribute("class", "output-line");
				outputLine.setAttribute("id", dataElement.getAttribute("id") + "_output");
				pageElement.appendChild(outputLine);
				pageElement.outputLine = outputLine;
				if (rscc && rscc.rsCanvas 
						&& rscc.rsCanvas.canvas3d ) {
					pageElement.rscc = rscc;
					rscc.rsCanvas.canvas3d.addEventListener("SnapshotSaved", sendData); //Burned when the 'submit' button pressed
					rscc.rsCanvas.canvas3d.addEventListener("transformChanged", onCanvasUpdated);
					if (rscc.rsCanvas instanceof RSCanvas ) {
						
						rscc.rsCanvas.canvas3d.addEventListener("selectedPointsChanged", onCanvasUpdated);
						rscc.rsCanvas.canvas3d.addEventListener("arcsChanged", onCanvasUpdated);
						rscc.rsCanvas.canvas3d.addEventListener("linesChanged", onCanvasUpdated);
						rscc.rsCanvas.canvas3d.addEventListener("rotationChanged", onCanvasUpdated);
					} 
				
				} 
				else return "Error creating canvas";
				
				if (dataElement.hasChildNodes) {
					populateCanvas(pageElement, dataElement, dataElement.getAttribute("id"));
				}
			} else {
				pageElement.rscc = document.createElement("div");
				var img = document.createElement("img");
				if (canvasData.width) img.setAttribute("width", canvasData.width);
				if (canvasData.height) img.setAttribute("height", canvasData.width);
				pageElement.rscc.img = img;
				pageElement.appendChild(img);
				var bmp = dataElement.getElementsByTagName("bitmap")[0];
				if (bmp && bmp.hasChildNodes) img.setAttribute("src", bmp.firstChild.nodeValue);
			}
			
			return ""; //no errors
			
		}
		function getCanvasDataFromXML(dataElement) {
			//extracts function and configs from xml element
			//dataElement - canvas or downdata
			//returns an object that can be passed to InitJuliaMap() and getOutputDomELement
			var dataStructure = xmlToStrings(dataElement); //in DataParser.js
			var dataObject = parseJuliaData(dataStructure);  //in DataParse.js
			//TODO process bitmap
			return dataObject;
			
		}
		function onCanvasUpdated(event) {
			
			var updata = createEmptyNode("updata");
			if (event.detail) {
				updata.setAttribute("status", event.detail.action || "updated");
				updata.setAttribute("object", event.detail.object);
				if (event.detail.ui) updata.setAttribute("ui", "true");
				if (Array.isArray(event.detail.data))
					for (var i = 0; i < event.detail.data.length; i ++)
						updata.appendChild(event.detail.data[i]);
				else if (event.detail.data) updata.appendChild(event.detail.data);
				createSendEvent(event.target, updata);
			} else {
				console.error("No detail for selectedPointsChanged or arcsChanged event");
			}
		}
		
		function createSendEvent(target, updata) {
			var evt=new CustomEvent("SnapshotSaved", {data: "",  __exposedProps__ : { data : "r"}});
			evt.data = xmlSerializer.serializeToString(updata);
			if (evt.data)
				target.dispatchEvent(evt);
			
		}
		
		function populateCanvas(container, dataElement, cId){
			var err = "";
			if (container.getAttribute("contains") == "canvas" && container.rscc){
				if (container.rscc.rsCanvas){
					if (dataElement.getElementsByTagName("function").length > 0) {
						var dataStructure = xmlToStrings(dataElement); //in DataParser.js
						var dataObject = getCanvasDataFromXML(dataElement);
						var surfaceData = initJuliaMap(dataStructure, /*Old map?*/{},true);
						surfaceData.updateUniformsDeclaration();
						container.rscc.rsCanvas.updateSphereMaterial(surfaceData, true);
						getOutputDomElement(dataObject, container.outputLine, 3);
					} else if (dataElement.getElementsByTagName("bitmap").length > 0) {
						var bitmaps = dataElement.getElementsByTagName("bitmap");
						for (var i = 0; i < bitmaps.length; i++) {
							container.rscc.rsCanvas.cashBitmap(bitmaps[i]);
						}
						var dataObject = new BitmapFillData(bitmaps[0]);
						container.rscc.rsCanvas.updateSphereMaterial(dataObject);
						container.outputLine.innerHTML = "";
					}
					var configElements = dataElement.getElementsByTagName("config");
					if (configElements.length > 0) {
						var cfg = {};
						for (var i = 0; i < configElements.length; i++) {
							ConfigManager.parseXMLNode(configElements[i], cfg);
						}
						container.rscc.updateCanvas(cfg);
					}
					var eq = dataElement.getElementsByTagName("equation")[0]; 
					if (eq) {
						if (eq.firstChild)
							container.outputLine.innerHTML = eq.firstChild.nodeValue;
						else container.outputLine.innerHTML = "";
					}
					container.rscc.rsCanvas.parseData(dataElement);
	
				} else if(container.rscc.img) {
					var img = container.rscc.img;
					if (dataElement.getElementsByTagName("bitmap").length > 0 &&
							dataElement.getElementsByTagName("bitmap")[0].hasChildNodes()) {
						img.setAttribute("src", dataElement.getElementsByTagName("bitmap")[0].firstChild.nodeValue)
					}
					var configs = dataElement.getElementsByTagName("config");
					for (var i = 0; i < configs.length; i++) {
						if (configs[i].getAttribute("key") == "width")
							img.setAttribute("width", configs[i].getAttribute("value"));
						if (configs[i].getAttribute("key") == "height")
							img.setAttribute("height", configs[i].getAttribute("value"));
							
					}
				} else {
					err = "Invalid canvas container";
				}
			} else {
				err = "Invalid canvas container";
			}
			return err;
				
		};
		
		function getElementInfo (parentContainer, resEl) {
			var err = "";
			var type = parentContainer.getAttribute("contains");
			if (!type) err = "Invalid element type";
			else {
				var resNode;

				if (type == "canvas") {
					if (parentContainer.rscc && parentContainer.rscc.rsCanvas && typeof parentContainer.rscc.rsCanvas.getSnapshotElement === "function") {
						resNode = parentContainer.rscc.rsCanvas.getSnapshotElement();
					} else if (parentContainer.rscc && parentContainer.rscc.img) {
						var img = parentContainer.rscc.img;
						resNode = createEmptyNode("canvas");
						resNode.setAttribute("geometry", "plane");
						var bmp = createEmptyNode("bitmap");
						bmp.appendChild(document.createTextNode(img.getAttribute("src")));
						resNode.appendChild(bmp);
						if (img.getAttribute("width")) resNode.setAttribute("width", img.getAttribute("width"));
						if (img.getAttribute("height")) resNode.setAttribute("height", img.getAttribute("height"));
						
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
				console.log("getElementInfo", type, parentContainer, parentContainer.getAttribute("id"))

			} //type is present
			return err;
		}

		
			
		//------Event handlers for permanent page elements-------------
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
			/** /
			var crashBtn = document.createElement("button");
			crashBtn.appendChild(document.createTextNode("crash"));
			crashBtn.addEventListener("click", function(evt){sendData({data: "<updata/>"});});
			logView.appendChild(crashBtn); /**/
			return logView;
			
			
		}
		//---------------------------------
			
			
			function addElement (dataNode, resEl) {
				console.log("Adding element ", dataNode);
				//returns error string or nothing, if everything is Ok
				//resEl - <updata> to send response to server. Description of created element should be added here
				var type = dataNode.nodeName;
				var err = "";
				
				if (type == "head") {
						
							if (dataNode.hasChildNodes()) {
								pageTitle.innerHTML = dataNode.childNodes[0].nodeValue;
								document.title = dataNode.childNodes[0].nodeValue;//
							} else {
								pageTitle.innerHTML = "";
								document.title = Titles.TITLE;
							}
					
				} else if (type == "template") {
					var butWhy = document.createElement("div");
					halm(dataNode, butWhy); //don't ask
					var wrappers = butWhy.getElementsByClassName("wrapper");	
					for (var i = 0; i < wrappers.length; i++) {
						var id = wrappers[i].getAttribute("content-id");
						if (!id) err += "No content id for html wrapper"
						else {
							adopt(document.getElementById(id), wrappers[i]);
						}
					}
					var replace = ConfigManager.parseBool(butWhy.getAttribute("replace"));
					var containersLive = mCCDOMElement.getElementsByClassName("element-container");
					var containers = [];
					for (var i = 0; i < containersLive.length; i++)
						containers.push(containersLive[i]);
					if (replace) {
						while (mCCDOMElement.hasChildNodes()) mCCDOMElement.removeChild(mCCDOMElement.firstChild);
						templates = [];
					}
					templates.push(dataNode);
					while (butWhy.hasChildNodes()) {
						var item = butWhy.firstChild;
						butWhy.removeChild(item);
						mCCDOMElement.appendChild(item);
					}
					for (var i = 0; i < containers.length; i++){
						if (!containers[i].parentNode) {
							adopt(containers[i], mCCDOMElement);
						}
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
											sendData({data: "<updata status='button-click' ui='true' object='" + elID + "'/>"});
										}, 
										true);
								newContainer.appendChild(newBtn);
								break;
							default:
								err = "The object of type " +  type + " can't be attached to a window"
						}
					}
					if (err == "") {
						var wrappers = mCCDOMElement.getElementsByClassName("wrapper");
						var wrapperFound = false;
						for (var i = 0; i < wrappers.length; i ++)
							if (wrappers[i].getAttribute("content-id") == elID) {
								wrappers[i].appendChild(newContainer);
								wrapperFound = true;
							}
						console.log(wrapperFound);
						if (!wrapperFound) mCCDOMElement.appendChild(newContainer);
					}
				}
				
				resEl.appendChild(dataNode.cloneNode(true));
				if (!err || err == "null") pageDataXML.appendChild(dataNode.cloneNode(true));
				return err;
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
			//TODO send parsing errors from canvas
			reportStatus(message, "error");
			if (connection) connection.send("<updata status='error'><error>" + message + "</error></updata>");
		}
		
		function onNewData(data) {
			if (DEBUG >1) console.log("on new data "+data);
			var xmlel = parseXml(data);
			console.log(xmlel);
			var arr;
			if (xmlel && xmlel.getElementsByTagName("parsererror").length == 0 ) {
				DATA_IN_XML = true;
				try {
					arr = xmlToStrings(xmlel);
				} catch (e) {
					sendError("Invalid XML");
				}
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
				if (!objID && action == "remove") {window.close();}//TODO ststus ok
				else {
					var parentContainer = null;
					if (objID && (parentContainer = document.getElementById(objID))) {
					
						if (action == "create" && parentContainer.getAttribute("contains") == "canvas") {
							var error = populateCanvas(parentContainer, downDataEl, objID);
							if (!error) {
								if (parentContainer.rscc && 
										//parentContainer.rscc instanceof RSCanvasContainer && 
										parentContainer.rscc.rsCanvas) {
									var news = parentContainer.rscc.rsCanvas.readNewElements();
									if (news.length > 0) {
										resEl.setAttribute("status", "created");
										resEl.setAttribute("object", objID);
										//TODO status ok
										for (var ii = 0; ii< news.length; ii++)
											resEl.appendChild(news[ii]);
										sendData({data:xmlSerializer.serializeToString(resEl)});
									} else {
										sendData({data:"<updata status='updated' object='" + objID + "'/>"}); //no new objects found
									}
								} else sendData({data:"<updata status='updated' object='" + objID + "'/>"}); //not Riemann Sphere canvas
							}
							else {sendError(error);}
	
						} else if (action == "remove") {
							parentContainer.parentNode.removeChild(parentContainer);
							//TODO status ok
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
										//TODO status ok
										resEl.setAttribute("status", "updated");
										resEl.setAttribute("object", objID);
										if (type != "canvas") getElementInfo(container, resEl);
										sendData({data:xmlSerializer.serializeToString(resEl)}); 
	
									}
									else {
										sendError(error);
									}
								}
							} else if (action == "request") {
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
									//TODO status ok
									resEl.setAttribute("status", "created");
									sendData({data:xmlSerializer.serializeToString(resEl)});
								}
								
							}
						
								
						} else {
							var containers = document.getElementsByClassName("element-container");
							var elementInCanvas = false;
							for (var i = 0; i < containers.length; i++) {
								if (containers[i].getAttribute("contains") == "canvas") {
									if (containers[i].rscc && containers[i].rscc.rsCanvas &&
											containers[i].rscc.rsCanvas instanceof RSCanvas &&
											containers[i].rscc.rsCanvas.hasObject(objID)) {
										
										elementInCanvas = true;
										var tp = containers[i].rscc.rsCanvas.hasObject(objID);
										switch (action) {
										case "remove": {
											if (tp == "point" || tp == "arc" || tp == "line")
												containers[i].rscc.rsCanvas.removeObject(objID);
											else sendError("Removing of " + tp + " is not implemented yet");
											break;
										}
										case "request": {
											var infoEl = containers[i].rscc.rsCanvas.getObjectInfo(objID);
											resEl.setAttribute("status", "info");
											resEl.setAttribute("object", containers[i].rscc.rsCanvas.serverId);
											resEl.appendChild(infoEl);
											sendData({data:xmlSerializer.serializeToString(resEl)});
											break;
											
										}
										case "populate":
										case "update": {
											if (tp == "point") {
												containers[i].rscc.rsCanvas.updatePoint(downDataEl);
											} else if (tp == "arc") {
												containers[i].rscc.rsCanvas.updateArc(downDataEl);
											} else sendError("No action " + action + " available for " + tp);
											break;
										}
										default : {
											sendError("No action " + action + " available for object inside a canvas");
										}
										}										
									}
								}
							}
							if (!elementInCanvas) {
							 if (action=="request") {
								var windowNode = resEl.appendChild(createEmptyNode("window"));
								var error = "";
								var containers = mCCDOMElement.getElementsByClassName("element-container");
								for (var j = 0; j < containers.length; j++ ) {
									console.log("container", j, containers[j]);
									if (containers[j] instanceof Element)
										error = getElementInfo (containers[j], windowNode);
								}
								for (var i = 0; i < templates.length; i++){
									console.log("template", i, templates[i]);
									windowNode.appendChild(templates[i]);
							 }
								if (error) sendError(error)
								else {
									resEl.setAttribute("status", "info");
									sendData({data:xmlSerializer.serializeToString(resEl)});
								} 
								
								
							} else sendError ("No object with id " + objID + " found");
						}
					}
				}
			}
		};
		
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
