var xml2js = require("xml2js");

process.stdin.on('readable', function() {
	  var chunk = process.stdin.read();
	  if (chunk !== null) {
		  parseLine(chunk);
	  }
	});

function parseLine (line) {
	 	 if (line.charAt(line.length-1) == "\n") line = line.slice(0, -1);

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

