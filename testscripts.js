var xml2js = require('xml2js');
var parseString = xml2js.parseString;

var xml = "<function degree='2'><nom><cn re='-80' im='0'/><cn re='-128' im='0'/><cn re='-50' im='0'/></nom><denom><cn re='52' im='0'/><cn re='84'/><cn re='33'/></denom><cycle length='1'><cn name='infinity'/></cycle><cycle length='2'><cn /><cn re='-1' im='1'/></cycle></function>";
var builder = new xml2js.Builder({headless: true}); 
parseString(xml, function (err, result) {
	console.log(xml);
    console.dir(result);
    console.dir(result["function"]);
    result["function"].$.a = "new";
    var string = builder.buildObject(result);
    console.log(string);
    
});