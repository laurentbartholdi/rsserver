
cs;
connect := function (host, port)
cs:=InputOutputTCPStream(host, port);
end;

connect := function ()
connect ("localhost", 1728);
end;


newWindow := function(sessionID, windowID)
	WriteLine(cs, Concatenation("<downdata session=\'", sessionID, "\' object=\'", windowID, "\'><window/></downdata>"));

end;

newObject := function (sessionID, parentID, type, id)

WriteLine(cs, Concatenation("<downdata session=\'", sessionID, 
"\' object=\'", parentID,
"\'><", type, " id=\'", id, "\'/></downdata>"));

end;

removeObject := function (sessionID, objectID)
WriteLine(cs, Concatenation("<downdata session=\'", sessionID, 
"\' object=\'",objectID,
"\' action='remove'/>"));

end;

request := function()
	WriteLine(cs, "<downdata action=\'request\'/>");

end;

requestSession := function(sessionID)
WriteLine(cs, Concatenation("<downdata session=\'", sessionID, 
"\' action='request'/>"));

end;

requestObject := function(sessionID, objectID)
WriteLine(cs, Concatenation("<downdata session=\'", sessionID,"\' object=\'", objectID, 
"\' action='request'/>"));

end;
releaseButton := function(sessionID, objectID)
WriteLine(cs, Concatenation("<downdata session=\'", sessionID,"\' object=\'", objectID, 
"\'><button name=\'Release ReadLine\'/></downdata>"));

end;
populateObject := function(sessionID, objectID, content)
	WriteLine(cs, Concatenation("<downdata session=\'", sessionID, 
	"\' object=\'",objectID,
	"\' action=\'populate\'>", content, "</downdata>"));
end;

populateWindow := function(sessionID, windowID)
	releaseButton(sessionID, windowID);
	ReadLine(cs);
	newObject(sessionID, windowID, "canvas", "c0");
	ReadLine(cs);
	populateObject(sessionID, "c0", "<function type=\'newton\' degree=\'3\'/>");
	ReadLine(cs);
	populateObject(sessionID, "c0", "<point><cn re=\'1\' im=\'0.5\'/></point>");
	ReadLine(cs);
end;
	
basilica1234:="<!---2*(25*z^2+64*z+40)/(33*z^2+84*z+52) --><function degree='2'><numer><cn re='-80' im='0'/><cn re='-128' im='0'/><cn re='-50' im='0'/></numer><denom><cn re='52' im='0'/><cn re='84'/><cn re='33'/></denom><cycle length='1'><cn name='infinity'/></cycle><cycle length='2'><cn /><cn re='-1' im='1'/></cycle></function>";
inverseBasilica:="<function degree='2'><numer degree='0'><cn re='1' im='0'/></numer><denom><cn re='-1' im='0'/><cn /><cn re='1' im='0'/></denom><cycle><cn name='infinity'/><cn/><cn re='-1' im='0'/></cycle></function>";
basilica:="<!-- z^2-1 --><function degree='2'><numer><cn re='-1'/><cn/><cn re='1'/></numer><denom degree='0'><cn re='1'/></denom><cycle><cn name='infinity'/></cycle><cycle><cn/><cn re='-1'/></cycle></function>";
func13:="<function degree='13'><numer><cn/><cn/><cn/><cn/><cn re='0.30789240450753436' im='6.0152917044142162'/><cn re='-20.475816711813557' im='-25.925324552303728'/><cn re='78.24741584661507' im='27.909526223768339'/><cn re='-129.58974592903056' im='20.784538562962315'/><cn re='118.37323665219498' im='-86.830785207675902'/><cn re='-53.955794245378087' im='106.59656614547917'/><cn re='0.26300742130383992' im='-70.622950700033059'/><cn re='13.505019079222286' im='26.413784845555799'/><cn re='-6.675214517621491' im='-4.340647022167162'/><cn re='0.99999999999999956' im='1.6653345369377348e-16'/></numer><denom>'/><cn re='1.' im='0.'/><cn re='-6.3247854823785072' im='4.340647022167162'/><cn re='11.402444867764377' im='-25.673979420450138'/><cn re='5.7459408702694716' im='66.554020861951884'/><cn re='-61.788972147334505' im='-95.801827521643531'/><cn re='123.82079903668222' im='69.914923303584487'/><cn re='-129.31774095487197' im='-4.4733621643695773'/><cn re='74.474991285622195' im='-37.057431164250289'/><cn re='-17.704785071245755' im='28.212300787424216'/><cn re='-0.30789240450753352' im='-6.0152917044142153'/><cn/><cn/><cn/><cn/></denom><cycle length='1'><cn/></cycle><cycle length='1'><cn name='infinity'/></cycle><cycle length='1'><cn name='1'/></cycle></function>";
newton3:="<function type='newton' degree='3'/>";

