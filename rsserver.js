//Copyright (c) Anna Alekseeva 2013-2016
/*On the GAP side:
 * gap
 * LoadPackage("scscp");
 * cs:=InputOutputTCPStream("localhost", 1728);
 * WriteLine( cs, "FUNCTION -1.0 0.0 0.0 0.0 1.0 0.0 1.0 0.0 0.0 0.0 0.0 0.0\nCYCLES 0.0 0.0 1 2 -1.0 0.0 0 2 Infinity any 2 1" );
 * ReadLine( cs);//blocks, if there no endOfLine character found
 */
var port = process.argv[3] || 1729;
var serverUrl = process.argv[2] || "127.0.0.1";
var tcpPort = process.argv[4] || 1728;
//is it really in use?
var defaultDataFileName = process.argv[5] | "/data/example.data";
 
var http = require("http");
var path = require("path"); 
var fs = require("fs"); 
var net = require("net");
var xml2js = require("xml2js");

var tcpSocket = null;
var activeWebSocket = null;
var connections = [];
var tcpSocketServer = net.createServer(function(c) { //'connection' listener
  console.log('tcp client connected');
	tcpSocket = c;
  c.on('end', function() {
    console.log('tcp client disconnected');
  });
	c.on('data', function(data){
		getTargetId(data, function(id, data, err){
			console.log("data from tcp client received", id, data, err); 
			if (err) {
				tcpSocket.write("<error>" + err + "</error>");
			} else if ( id && (connections[id] != null)) {
				connections[id].send(data, {binary: false});
			} else if (activeWebSocket != null)
				activeWebSocket.send(data, {binary: false});
		});
		
	} );
  c.pipe(process.stdout);
});
tcpSocketServer.listen(tcpPort, function() { //'listening' listener
  console.log('TCP server is running at localhost, port', tcpPort);
});


var WebSocketServer = require('ws').Server;
var now = new Date();
console.log(now + " Creating WebSocket server at URL " + serverUrl);

var server = http.createServer( function(req, res) {

	var filename = req.url || "index.html";
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
				getFile(localPath, res, ext);
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
	activeWebSocket = ws;
	addConnection (ws);
	//connections.push(ws);
    ws.on('message', function(message) {
	  console.log("message received", message);//, clients.indexOf(ws));
	  if (tcpSocket != null) {
		  
		  addConnectionIdToMessage(ws.id, message, function(result) {
			  console.log("going to send to tcp: " + result);
			  tcpSocket.write(result);});
		 
		  
	  }
         
    });
 
    ws.on('close', function(message) {
    	//if (activeWebSocket == ws) activeWebSocket = null;
    	removeConnection (ws);
        //Remove the disconnecting client from the list of clients
    });
     
    //ws.send('FUNCTION -1.0 0.0 0.0 0.0 1.0 0.0 1.0 0.0 0.0 0.0 0.0 0.0\nCYCLES 0.0 0.0 1 2 -1.0 0.0 0 2 Infinity any 2 1');
   //ws.send('FUNCTION 0.0 1.0 0.0 0.0 1.0 0.0 1.0 0.0 0.0 0.0 0.0 0.0\n'+
	//'CYCLES Infinity any 0 1');
   //ws.send("<function degree='2'><nom><cn re='-1' im='0'/><cn /><cn re='1' im='0'/></nom><denom degree='0'><cn re='1' im='0'/></denom><cycle length='1'><cn name='infinity'/></cycle><cycle length='2'><cn /><cn re='-1' im='1'/></cycle></function>");
  //ws.send("<function degree='2'><nom><cn name='1'/><cn /><cn name='i'/></nom><denom degree='0'><cn name='1'/></denom><cycle length='1'><cn name='infinity'/></cycle><cycle length='2'><cn /><cn re='-1' im='1'/></cycle></function>");
   ws.send("<function type='newton' degree='6'/>");
});

function addConnection (ws) {
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

var xmlBuilder = new xml2js.Builder({headless: true});
function addConnectionIdToMessage (id, message, callback) {
	xml2js.parseString(message, function (err, resultObj) {
		if (!err) {
			if (!resultObj) err = "Error parsing updata";
			else if (!resultObj.updata) err = "invalid xml tag (updata expected) or empty element";
			if (!resultObj.updata.$) resultObj.updata.$ = {};
			resultObj.updata.$.session = id;
		}
		if (err) console.error(err);
		else callback(xmlBuilder.buildObject(resultObj));

		
	});
}
//getTargetId(data, function(id, data){
function getTargetId(data, callback){
	xml2js.parseString(data, function (err, resultObj){
		//TODO uncought exception for <downdata />
		if (err || !resultObj) console.error("Invalid xml or parsing error", err, resultObj); 
		else {
		console.log("parsing data", data, resultObj, err, resultObj.downdata);
			var id = "";
			if (!err) {		
				if (!resultObj ) err = "invalid xml " + data;//throw "invalid xml " + data;
				else if (!resultObj.downdata) err = ("invalid xml tag (downdata expected) or empty element" + data);//throw console.error("invalid xml tag (downdata expected) " + data);
				else if (!resultObj.downdata || !resultObj.downdata.$ || !resultObj.downdata.$.session) {
					console.warn("no session id attribute");
					id = "";
				} else id = resultObj.downdata.$.session;
			}
		}
		
		callback(id, data, err);
	});
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
	sendOutput("Hear should be help. " + arguments[0] + "\n");
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

