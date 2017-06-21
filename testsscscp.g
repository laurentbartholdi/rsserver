#Riemmann Sphere Tests
RST := rec();
#cs := 0;

RST.start := function() 
	LoadPackage("scscp");
	#TODO check existing connection first
	cs:=InputOutputTCPStream("localhost", 1728);
	return cs;
end;


RST.send := function(sattr,scont)
	local out;
	out := StringXMLElement(rec(name := "downdata",
            attributes := sattr, content := scont));
    WriteLine(cs, out[1]);
    return ReadLine(cs);
end;

RST.formDownData := function(sid, oid, act, cont)
	local s;
	s := StringXMLElement(
		rec(name:="downdata", 
		    attributes:=rec(
		                session:=sid, 
		                object:=oid, 
		                action:=act), 
		    content:=cont
		 )
		);
	return s[1];
end; 

RST.getsession := function(arg)
    local cmd;
    cmd := rec(action:="request");
    if Length(arg)>2 or not ForAll(arg,IsString) then
        Error("Use: RST.request [<session-id> [<object-id>] ]");
    fi;
    if Length(arg)>=1 then
        cmd.session := arg[1];
    fi;
    if Length(arg)>=2 then
        cmd.object := arg[2];
    fi;
    return RST.send(cmd,[]);
    
end;

#RST.newobject := function(sid,oid,type, attr, cont)
RST.newobject := function(arg)
    local cmd, cnt;

    cnt := rec();
    cmd := rec(action:="create");
    if Length(arg)>5 or Length(arg) < 3 then
        Error("Use: RST.newobject [<session-id> <object-id> <type> [<attributes> [<content>]] ]");
    fi;
    if Length(arg)>=3 then
        cmd.session := arg[1];
        cmd.object := arg[2];
        cnt.name := arg[3];
    fi;
    if Length (arg) >= 4
    	then cnt.attributes := arg[4];
    	else  cnt.attributes := rec();
    fi;
    if Length (arg) >=5
    	then cnt.content := arg[5];
    	else cnt.content := 0;
    fi;
    
    return RST.send(cmd, [cnt]);
        
end;
RST.newcanvas := function(sid, oid)
	return RST.send(rec(session:=sid, object:=oid, action:="create"), [rec(name:="canvas", attributes:=rec(), content:=0)]);
	#return RST.newobject(sid, oid, "canvas");
	
end;
RST.populateobject := function(sid,oid,content)
    return RST.send(rec(session:=sid,object:=oid,action:="populate"),content);
end;
RST.removeobject := function(sid, oid)
	return RST.send(rec(session:=sid, object:=oid, action:="remove"), 0);
end;

RST.addpoint := function(sid, cid, re, im)
	return RST.populateobject(sid, cid, [rec(name := "point", attributes := rec(), content := [rec(name := "cn", attributes := rec(re:= String(re), im:= String(im)), content:=0)])]);
end;
RST.addspoint := function(sid, cid, x, y, z)
	return RST.populateobject(sid, cid, [rec(name:= "point", attributes := rec(), content := [RST.sp(x, y, z)])]);
end;
RST.removeobject := function(sid,oid)
	return    RST.send(rec(session:=sid,object:=oid,action:="remove"),[]);
end;

RST.cn := function (re, im)
	return rec(name:="cn", attributes:=rec(re:=String(re), im:=String(im)), content:=0); 
end;
RST.sp := function (x, y, z)
	return rec(name:="sp", attributes:=rec(x:=String(x), y:=String(y), z:=String(z)), content:=0);
end; 

RST.config := function (key, value)
	return rec(name:= "config", attributes:=rec(key:=key, value:=value), content:=0);
end;

RST.test3points := function (sid, cid) 
	RST.populateobject(sid, cid, 
		[rec(name:="point", attributes:=rec(color:="#ffcccc", radius:=".1"), content:=[RST.cn(0, 0.1), rec(name:="label",attributes:=rec(), content:="The first")]), 
		rec(name:="point", attributes:=rec(color:="#005500", movable:="true", radius:=".3"), content:=[RST.cn(0,0.2), rec(name:="label",attributes:=rec(), content:="The second")]),
		rec(name:="point", attributes:=rec(color:="#ffff00", radius:=".5"), content:=[RST.cn(0, 0.4)]), 
		rec(name:="point", attributes:=rec(color:="#ff00ff", radius:=".4"), content:=[RST.cn(0,0.3), rec(name:="label",attributes:=rec(), content:="The third")])]);
end;



identity := rec(
			attributes:= rec(type:="identity"), 
			name:="function", 
			content:= 0
		);
cnInfinity := rec(name:="cn", attributes:=rec(name:="infinity"), content:=0);
cn0 := rec(name:="cn", attributes:=rec(), content:=0);
newton := n->rec(name:="function",attributes:=rec(type:="newton",degree:=String(n)),content:=[]);
newtonRoots := function (degree, roots)
	return rec(name:="function",attributes:=rec(type:="newton",degree:=String(degree)),content:=roots);
	end;

basilica := rec(name:="function", attributes:=rec(degree:="2"), content:= [
				rec(name:="numer", attributes:=rec(degree:="2"), content:= [RST.cn(-1, 0), cn0, RST.cn(1, 0)]),
				rec(name:="denom", attributes:=rec(degree:="0"), content:=[RST.cn(1, 0)]),
				rec(name:="cycle", attributes:=rec(length:="1"), content:=[cnInfinity]),
				rec(name:="cycle", attributes:=rec(length:="2"), content:=[cn0, RST.cn(-1, 1)])
]);

#<function degree='4'>
#	<nom><cn/><cn/><cn/><cn re='-2.0'/><cn re='1.0'/></nom>
#	<denom><cn re='1.0'/><cn re='-2.0'/><cn/><cn/><cn/></denom>
#   <cycle><cn re='-1.0'/></cycle>
#</function>

func4:= rec(name:="function", attributes:=rec(degree:="4"), content:= [
				rec(name:="numer", attributes:=rec(degree:="4"), content:= [cn0, cn0, cn0, RST.cn(-2, 0), RST.cn(1, 0)]),
				rec(name:="denom", attributes:=rec(degree:="4"), content:=[RST.cn(1,0), RST.cn(-2, 0), cn0, cn0, cn0]),
				rec(name:="cycle", attributes:=rec(length:="1"), content:=[RST.cn(-1, 0)])
]);


#inversebasilica := function2xml(CompositionP1Map(P1z^-1,P1z^2-1,P1z^-1));

