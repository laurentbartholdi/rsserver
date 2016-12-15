//Copyright (c) Anna Alekseeva 2013-2016

var port = process.argv[3] || 1729;
var serverUrl = process.argv[2] || "127.0.0.1";
var tcpPort = process.argv[4] || 1728;
 
var http = require("http");
var path = require("path"); 
var fs = require("fs"); 
var net = require("net");
var xml2js = require("xml2js");

var tcpSocket = null;



var tcpSocketServer = net.createServer(function(c) { //'connection' listener
	console.log('tcp client connected');
	tcpSocket = c;
	var clist = getConnectionsList();
	if (clist) c.write(clist);
	c.on('end', function() {
	    console.log('tcp client disconnected');
	    tcpSocket = null;
	});
	c.on('data', function(data){
		processDownData(data, function(id, data, err){
			console.log("downdata processed", id, err, data);
			if (!err || err == "null") {
				if (id) {				
					if (id instanceof Array){//broadcast to several connections
						for (var i = 0; i < id.length; i ++) {
							if (connections[id[i]] != null) {
								connections[id[i]].send(data, {binary: false});
							}//if
						}//for
					}// id is array
					else if (connections[id] != null) {
						connections[id].send(data, {binary: false});
					}// valid connection id
				} else {
					for (var w in connections)
						if (connections.hasOwnProperty(w) && connections[w] != null)
							connections[w].send(data, {binary: false});

				} //id is empty
			} //no error
			else {
				displayError(err);
				
			}
		});
		
	} );
  c.pipe(process.stdout);
});
tcpSocketServer.listen(tcpPort, function() { 
  console.log('TCP server is running at localhost, port', tcpPort);
});

var WebSocketServer = require('ws').Server;
var now = new Date();
console.log(now + " Creating WebSocket server at URL " + serverUrl);

var server = http.createServer( function(req, res) {
	var filename = require('url').parse(req.url).pathname || "index.html";
	 
	if (filename == "/") filename = "/index.html";
	var ext = path.extname(filename);
	var localPath = __dirname;
 	var validExtensions = {
		".html" : "text/html",			
		".js": "application/javascript", 
		".css": "text/css",
		".txt": "text/plain",
		".jpg": "image/jpeg",
		".gif": "image/gif",
		".png": "image/png",
		".ico": "image/x-icon"
	};
	var isValidExt = validExtensions[ext];
 
	if (isValidExt) {
		
		localPath += filename;
		fs.exists(localPath, function(exists) {
			if(exists) {
				//console.log("Serving file: " + localPath);
				getFile(localPath, res, isValidExt);
			} else {
				console.log("File not found: " + localPath);
				res.writeHead(404);
				res.end();
			}
		});
 
	} else {
		console.log("Invalid file extension detected: " + ext);
	}
 
}).listen(port, serverUrl);

var wss = new WebSocketServer({server: server}); 
console.log("WebSocket server is running. Type http://" + serverUrl.toString() + ":" + port + "/ in a browser to start.");

wss.on('connection', function(ws) {
	console.log((new Date()) + ' Connection from origin ' + ws.origin + '.');

	addConnection (ws);
    ws.on('message', function(message) {
	  console.log("message received", message);
	  processUpData(ws.id, message, function(result) {
		  console.log("going to send to tcp: " + result);
		  if (tcpSocket) tcpSocket.write(result + "\n");});
         
    });
 
    ws.on('close', function(message) {
    	removeConnection (ws);
        //Remove the disconnecting client from the list of clients
    });
     
});

//-------------Managing connections-------------
var activeWebSocket = null;
var connections = [];

function addConnection (ws) {
	activeWebSocket = ws;
	var id = ws.id || getNewWsId();
	ws.id = id;
	connections[id] = ws;
	connectionsNum ++;
	
}
var connectionsNum = 0;
function getNewWsId () {
	var s = "rs" + connectionsNum;
	var curIdNum = connectionsNum;
	while (connections.hasOwnProperty(s)) {
		curIdNum ++;
		s = "rs" + curIdNum;
	}
	return s;
	
}
function getConnectionId (ws) {
	if (ws.id) return ws.id;
	ws.id = getNewWsId();
	return ws.id;
}
function removeConnection (ws) {
	console.log ("Closing connection " + ws.id);
	var dataObj = {updata: {$: {status: "removed", session: ws.session, object: ws.window}}};
	var str = xmlBuilder.buildObject(dataObj).replace(/"/g, "'") + "\n"; 
	if (tcpSocket) tcpSocket.write(str);
	connections[ws.id] = null;
	connectionsNum --;
	if (activeWebSocket == ws) {
		if (connectionsNum > 0) {
			for (var s in connections){
				if (connections.hasOwnProperty(s) && connections[s] != null ) {
					activeWebSocket = connections[s];
					break;
				}
			}
				
		} else {
			activeWebSocket = null;
		}
	} 
	
}
//----------------------------------------------------------------------------

//--------------Managing sessions and objects ids-----------------------------
//Every connection has a .session, .window and .objects properties.
//Window id (.window property) must be unique inside the session.
//.objects property contains the list of the ids of the objects in the window. 
//Each object id must be unique inside the session
//The connection.id property is for internal use only

function isWindowIdNew(session, id) {
	for (var w in connections)
		if (connections.hasOwnProperty(w) && connections[w] && connections[w].session == session && connections[w].window == id )
			return false;
	return true;
}
function generateWindowId (session) {

	return generateObjectId(session, "w");
}

var maxSessionId = 0;
function generateSessionId() {
	var res = "";
	while(!isSessionIdNew(res="s" + (++maxSessionId))) {}
	return res;
}
function isSessionIdNew(id) {
	for (var w in connections){
		if (connections.hasOwnProperty(w) && connections[w] && connections[w].session == id)
			return false;
	}
	return true;
	
}

function isObjectIdNew(session, id, tempUsedIds) {
	for (var w in connections) {
		if (connections.hasOwnProperty(w) && connections[w] && connections[w].session == session) {
			if (connections[w].window == id) return false;
			if ( connections[w].objects ) {
				for (var o in connections[w].objects)
					if (connections[w].objects.hasOwnProperty(o) && connections[w].objects[o] == id)
						return false;
			}
		}
	}
	if (tempUsedIds)
		for (var i in tempUsedIds)
			if (tempUsedIds[i] == id) return false;
	return true;

}

function generateObjectId(session, type, tempUsedIds) {
	var i = 0;
	var res = "";
	while (!isObjectIdNew(session, res = type + (i++), tempUsedIds)){};
	return res;
	
}
//--------------------------------
var xmlBuilder = new xml2js.Builder({headless: true, renderOpts:{pretty: false}});
var xmlParser = new xml2js.Parser({explicitArray: true, explicitCharkey: true, emptyTag: "empty"});
function processDownData(data, callback){
	xmlParser.parseString(data, function (err, resultObj){
		if (err || !resultObj) err = err || "Invalid xml or parsing error"; 
		else {
			var sId = ""; 
			var id = "";
			if (!err) {		
				if (!resultObj ) err = "invalid xml " + data;
				else if (!resultObj.downdata || resultObj.downdata == "empty" || resultObj.downdata[0] == "empty") err = ("invalid xml tag (downdata expected) or empty element" + data);//throw console.error("invalid xml tag (downdata expected) " + data);
				else if (!resultObj.downdata || !resultObj.downdata.$) {
					err = "No attributes"
				} else if( !resultObj.downdata.$.session)  {
					if( !(resultObj.downdata.$.action == "request"))//only 'request' action is valid without session attribute
						err = "No session id attribute";
				} 
				else {
					var a = resultObj.downdata.$;
					a.action = a.action || "create";
					if (!(a.action == "create" || a.action == "update" || a.action == "populate" || a.action == "remove" || a.action == "request"))
						err = "Invalid action attribute " + a.action;
					var curSessionConnections = {};
					var curSessionConnectionsNum = 0;
					for (var w in connections)
						if (connections.hasOwnProperty(w) && connections[w] && connections[w].session == a.session) {
							curSessionConnections[w] = connections[w];
							curSessionConnectionsNum ++;
						}
					if (curSessionConnectionsNum == 0) {
						err = "No connections for session " + a.session + " open";
					}
					else if (!a.object) {
						//The only valid cases without object attribute are to create new window or request info about all session windows
						if (a.action == "create" && resultObj.downdata.hasOwnProperty("window") && resultObj.downdata.window)
						{
							if (resultObj.downdata.window == "empty") resultObj.downdata.window = { $:""};
							for (var w in curSessionConnections)
								if (curSessionConnections.hasOwnProperty(w) && curSessionConnections[w])
									{id = w;}
							if (id == "") err = "No registered session " + a.session;
						} //create new window in given session
						else if (a.action == "request") {
							id = [];
							for (var w in curSessionConnections)
								if (curSessionConnections.hasOwnProperty(w) && curSessionConnections[w])
									{id.push(w)}
							
							
						} //request without object attribute
						else err = "No object attribute";
								
					} //no object attribute 
					else {
						for (var w in curSessionConnections)
						
							if (curSessionConnections[w].window == a.object) {
								id = w;
								if (a.action == "remove") a.object = "";//signal to client to close entire window
							}
							else if (curSessionConnections[w].objects) {
								for (var o in curSessionConnections[w].objects )
									if (curSessionConnections[w].objects[o] == a.object)
										id = w;
							}
						console.log("Connection id", id);
						if (id == "") err = "No registered object " + a.object;
						else if (a.action == "create"){
							var usedIds = [];
							for (var f in resultObj.downdata) {
								if (f != "$" && resultObj.downdata.hasOwnProperty(f) && resultObj.downdata[f]) {
									if (resultObj.downdata[f] instanceof Array) {
										for (var ff in resultObj.downdata[f]){
											if (resultObj.downdata[f].hasOwnProperty(ff) && resultObj.downdata[f][ff]) {
												if (resultObj.downdata[f][ff] == "empty") resultObj.downdata[f][ff] = {$: {id: ""}};
												err = checkObjectID(a.session, resultObj.downdata[f][ff], f, usedIds);
											}
										}
									} else {
										if (resultObj.downdata[f][ff] == "empty") resultObj.downdata[f] = {$: {id: ""}};

										err = checkObjectID(a.session, resultObj.downdata[f], f, usedIds);
									}
								}
							}
						}//action == create
					}
				}
			}
		}
		var resStr ="";
		if (resultObj) resStr = xmlBuilder.buildObject(resultObj)
		else err = "Unknown xml parsing error";
		callback(id, resStr, err);
	});
}

function checkObjectID(session, object, type, tempUsedIds) {
	var err="";
	if (object.$ && object.$.id) {
		if (!isObjectIdNew(session, object.$.id)) err = "Id " + object.$.id + " is already in use";
	} else {
		if (!object.$) object.$ = new Object();
		if (!object.$) err = object + "is not an object"; 
		else object.$.id = generateObjectId(session, type, tempUsedIds);
	}
	tempUsedIds.push(object.$.id);
	return err;

}

function processUpData (id, message, callback) {
	xmlParser.parseString(message, function (err, resultObj) {
		if (!err) {
			if (!resultObj) {
				err = "Error parsing updata";
				
			}
			else if (!resultObj.updata) {
				if (resultObj.error) err = resultObj.error
				else err = "invalid xml tag (updata expected) or empty element";
				
			} else { 
				if (!resultObj.updata.$) resultObj.updata.$ = {};
				var a = resultObj.updata.$;
				var ws = connections[id];
				if (resultObj.updata.hasOwnProperty("window") && (!a.status || a.status == "created"))
				{
					//TODO process a case when a window is removed
					if (!a.session) a.session = generateSessionId();
					ws.session = a.session;
					a.status = "created";
					var wId = a.id || a.object || a.window;
					if (!wId) {
						wId = generateWindowId(a.session);
					} else if (!isWindowIdNew(a.session, wId)) {
							err = "Window id " + wId + " is already in use";
						
					}
					ws.window = wId;
					resultObj.updata.window = {$ : {id: wId}};
					
				
				}
				else {
					//TODO process info

					if (!a.status) a.status = "updated";
					a.session = ws.session;
					if (!a.object) {
						if (a.status == "created" || a.status == "info") a.object = ws.window;
						else err = "Object id not defined";
						
					}
					if (a.status == "created") {
						if (!ws.objects) ws.objects = [];
						for (var f in resultObj.updata) {
							if (f != "$" && resultObj.updata.hasOwnProperty(f) && resultObj.updata[f]) {
								if (resultObj.updata[f] instanceof Array) {
									for (var o in resultObj.updata[f]) {
										if (o != "$" && resultObj.updata[f].hasOwnProperty(o) && resultObj.updata[f][o]) {
											if (!resultObj.updata[f][o].$ || !resultObj.updata[f][o].$.id)
												err = "No id for created object " + f;
											else ws.objects.push(resultObj.updata[f][o].$.id);
										}										
									}
								} else {
									if (!resultObj.updata[f].$ || !resultObj.updata[f].$.id)
										err = "No id for created object " + f;
									else ws.objects.push(resultObj.updata[f].$.id);
								}
							}
						}
					}
					if (a.status == "updated" || a.status == "removed") {
						if (!ws.objects) err = "No registered objects for session " + ws.session + ", window " + ws.window;
						else {
							var i = ws.objects.indexOf(a.object);
							if (i < 0) err = "No object " + a.object + " is registered in session " + ws.session + ", window " + ws.window;
							else if (a.status == "removed") ws.objects.splice(i, 1);
						}
					}
				}
			}
		}
		if (err) displayError(err);
		else {
			callback(xmlBuilder.buildObject(resultObj).replace(/"/g, "'").replace(/>empty</g, "><"));
		}

		
	});
}
function getConnectionsList() {

	if (true) {
		var list = {updata: {session: []}};
		for (var w in connections) 
			if (connections.hasOwnProperty(w) && connections[w]) {
				var sessionItem = {"$":{}, "window": []};
				for (var i = 0; i < list.updata.session.length; i++) {
					if (list.updata.session[i].$ && list.updata.session[i].$.id == connections[w].session)
						sessionItem = list.updata.session[i];
				}
				if (!sessionItem.$.id) {
					
					sessionItem.$.id = connections[w].session;
					list.updata.session.push(sessionItem);
				}
				sessionItem.window.push({"$" : {"id" : connections[w].window}});
			}
		var str = xmlBuilder.buildObject(list);
		return (str.replace(/"/g, "'") + "\n");
		
	} else {
		return "<updata/>";
	}
}
function displayError(err) {
	console.error(err);
	if (err.substring(0, 7) != "<updata") err = "<updata status='error'>" + err + "</updata>\n";
	if (tcpSocket) tcpSocket.write(err);
	
}


process.stdin.setEncoding('utf8');
//TODO config changing in command line
process.stdin.on('readable', function() {
  var chunk = process.stdin.read();
  if (chunk !== null) {
	  parseCommand(chunk);
  }
});

process.stdin.on('end', function() {
  process.stdout.write('end');
});
function parseCommand (line /*String*/) {
	//TODO chanche active connection
	 if (line.charAt(line.length-1) == "\n") line = line.slice(0, -1);
	 //var sp_ind = line.indexOf(" ");
	 var command = cutCommand(line, 0);
	 //sendOutput("parseCommand", command);
	 //if (sp_ind > -1) command = line.slice(0, sp_ind) 
	 //else command = line;
	 if (command == "config") {
		 updateConfig (line);
	 } else if (command == "help" || command == "h" || command == "?") {
		 showHelp();
		 
	 } else
	 {
		 sendOutput("Unknown command", command);
	 }
	 
	  //var parts = line.split(" ");
	  //parts = removeElements(parts, ""," ", "\n");
	  //if (parts[0] == "config") updateConfig (parts);
	
}
function removeElements(arr) {
    var what, a = arguments, L = a.length, ax;
    while (L > 1 && arr.length) {
        what = a[--L];
        while ((ax= arr.indexOf(what)) !== -1) {
            arr.splice(ax, 1);
        }
    }
    return arr;
}
function showHelp() {
	//TODO
	sendOutput("Here should be help. " + arguments[0] + "\n");
}
function sendOutput() {
	var argsString = Array.prototype.join.call(arguments, '\n');
	process.stdout.write(argsString +  '\n');
	//console.log(argsString);
}

function cutCommand(line, index){
	//console.log("cutCommand", line, index);
	if (index == undefined) index = 0;
	var i = 0;
	var sp_index = 0;
	var sp_index_old = 0;
	while (i <= index && sp_index > -1) {
		sp_index_old = sp_index;
		sp_index = line.indexOf(" ", sp_index_old+1);
		i++;
	}
	var res;
	if (sp_index > -1) res = line.slice(sp_index_old, sp_index);
	else res = line.slice (sp_index_old);
	//console.log("cutCommand", index, i, sp_index_old, sp_index, res);
	if (res.charAt(0) == " ") res = res.slice(1);
	return res;
} 

function updateConfig (line) {
	var action = cutCommand (line, 1);
	switch (action) {
	case "get":
		var key = cutCommand(line, 2);
		sendOutput(key + " requested");
		activeWebSocket.send(line);
		break;
	case "set":
		if (activeWebSocket) {
			sendOutput("sending new config values");
			activeWebSocket.send(line);
		} else {
			sendOutput("no open socket");
		}
		break;
	case "help":
	case "?":
		showHelp("config");
		break;
	case "load":
		//break;
	case "save":
		//break;
		default :
			sendOutput("Unknown config command", action);
		showHelp("config");
	}


}

var filesLoaded = 0;

function getFile(localPath, res, mimeType) {
	var contents = fs.readFileSync(localPath);//TODO how to load multiple javasccript files
	//res.setHeader("Content-Length", contents.length);
	res.setHeader("Content-Type", mimeType);
	res.statusCode = 200;
	res.end(contents, mimeType, function() {});
	console.log("Loaded: ", localPath);
	/*
	fs.readFile(localPath, function(err, contents) {
		if(!err) {
			res.setHeader("Content-Length", contents.length);
			res.setHeader("Content-Type", mimeType);
			res.statusCode = 200;
			res.end(contents);
		} else {
			res.writeHead(500);
			res.end();
		}
	});*/
}

