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

RST.test4arcs := function (sid, cid)
	RST.populateobject(sid, cid, [rec(name:="arc", attributes:=rec(type:="transformation", color:="#ffffaa"), 
			content:=[RST.cn(2, 0), RST.cn(-1, 0), RST.cn(0.866025404*2, 0), RST.cn(-0.866025404, -0.5)])]);
	RST.populateobject(sid, cid, [rec(name:="arc", attributes:=rec(type:="transformation", color:="#ffaaaa"), 
			content:=[RST.cn(-2, 0), RST.cn(1, 0), RST.cn(0, -1), RST.cn(0.866025404, -0.5)])]);
	RST.populateobject(sid, cid, [rec(name:="arc", attributes:=rec(type:="transformation", width:="4"), 
			content:=[RST.cn(0, 0), RST.cn(1, 0), RST.cn(1, 0), RST.cn(0, 0)])]);
	RST.populateobject(sid, cid, [rec(name:="arc", attributes:=rec(type:="points", width:="4", color:="#aaffaa"), content:=[RST.sp(1, 0, 0), RST.sp(1, 1, 0), RST.sp(0, 1, 0)])]);
end;

RST.complex := function (x, y)
	return rec( re:=x, im:= y);
end;

RST.complexAdd := function(z1, z2) 
	return RST.complex(z1.re+z2.re, z1.im+z2.im);
end;

RST.complexSub := function(z1, z2) 
	return RST.complex(z1.re-z2.re, z1.im-z2.im);
end;

RST.complexMul := function(z1, z2) 
	return RST.complex(z1.re*z2.re - z1.im*z2.im, z1.im*z2.re+z2.im*z1.re);
end;
RST.complexDiv := function(z1, z2)
	local denom;
	denom := z2.re*z2.re + z2.im*z2.im;
	if Float(denom) < 1.e-7 then 
	return RST.complex(z1.re*1.e7, z1.im*1.e7);
	fi;
	return RST.complex((z1.re*z2.re + z1.im*z2.im)/denom, (z1.im*z2.re - z1.re*z2.im)/denom);
end;

#Moebius transformation, transforming 0 to z0, 1 to z1, 1/2 to z_2
RST.transform01 := function (z0, z_2, z1)
	local a, b, c, d, z0z1, sz0z1;
	d:=RST.complexSub(z1, z_2);
	b:=RST.complexMul(z0, d);
	z0z1:=RST.complexMul(z0, z1);
	sz0z1 := RST.complexAdd(z0, z1);
	a:=RST.complexSub(RST.complexMul(z_2, sz0z1), RST.complex(2*z0z1.re, 2*z0z1.im));
	c:=RST.complexSub(RST.complex(z_2.re*2, z_2.im*2), sz0z1);
	return rec(a:=a, b:=b, c:=c, d:=d);
	

end;

RST.cnc := function(c)
	if Float(c.re*c.re + c.im*c.im) > 1.e6 then return rec(name:="cn", attributes:=rec(name:="Infinity"), content:=0); fi;
	return RST.cn(c.re, c.im); 
end;

RST.testPointsArc := function(sid, cid, p0, p, p1)
	local c1, c, c0;
	c1 := RST.cnc(p1);
	c := RST.cnc(p);
	c0 := RST.cnc(p0);
	return RST.populateobject(sid, cid, 
			[rec(name:="point", attributes:=rec(color:="#ff6666", movable:="false"), content:=[c0]),
			rec(name:="point", attributes:=rec(color:="#6666ff", movable:="false"), content:=[c1]),
			rec(name:="point", attributes:=rec(color:="#66ff66", movable:="false"), content:=[c]),
			rec(name:="arc", attributes:=rec(type:="points", color:="#ffff66"), content:=[c1, c, c0])]);
	
end;

RST.testPointsArcTransform := function(sid, cid, a, b, c, d)
	local t, c0, c_2, c1;
	t := RST.transform(a, b, c, d);
	c0 := RST.applyTransform(t, RST.complex(0, 0));
	c_2 := RST.applyTransform(t, RST.complex(.5, 0));
	c1 := RST.applyTransform(t, RST.complex(1, 0));
	
		return RST.populateobject(sid, cid, 
			[rec(name:="point", attributes:=rec(color:="#ff6666", movable:="false"), content:=[RST.cnc(c0)]),
			rec(name:="point", attributes:=rec(color:="#6666ff", movable:="false"), content:=[RST.cnc(c1)]),
			rec(name:="point", attributes:=rec(color:="#66ff66", movable:="false"), content:=[RST.cnc(c_2)]),
			rec(name:="arc", attributes:=rec(type:="transformation", color:="#ffff66"), content:=[RST.cnc(a), RST.cnc(b),RST.cnc(c),RST.cnc(d)])]);
	

end;

RST.testPointsArcTransform01 := function(sid, cid, z0, z_2, z1)
	local t;
	t := RST.transform01(z0, z_2, z1);
	
		return RST.populateobject(sid, cid, 
			[rec(name:="point", attributes:=rec(color:="#ff6666", movable:="false"), content:=[RST.cnc(z0)]),
			rec(name:="point", attributes:=rec(color:="#6666ff", movable:="false"), content:=[RST.cnc(z1)]),
			rec(name:="point", attributes:=rec(color:="#66ff66", movable:="false"), content:=[RST.cnc(z_2)]),
			rec(name:="arc", attributes:=rec(type:="transformation", color:="#6666ff"), content:=[RST.cnc(t.a), RST.cnc(t.b),RST.cnc(t.c),RST.cnc(t.d)])]);
	

end;

RST.transform := function(a, b, c, d)
	return rec(a:=a, b:=b, c:=c, d:=d);
end;

RST.applyTransform := function(t, c)
	local num, denom;
	num := RST.complexAdd(RST.complexMul(t.a, c), t.b);
	denom := RST.complexAdd(RST.complexMul(t.c, c), t.d);
	return RST.complexDiv(num, denom);

end;

RST.transformtag := function (cna, cnb, cnc, cnd)
	return rec(name:="transform", attributes:=rec(), content:=[cna, cnb, cnc, cnd]);
end;

RST.lintransformtag := function(cna, cnb)
	return rec(name:="transform", attributes:=rec(type:="linear"), content:=[cna, cnb]);
end;

RST.zoomtransformtag := function(w0, scale)
	return rec(name:="transform", attributes:=rec(type:="zoom", scale:=String(scale)), content:=[w0]);
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
				rec(name:="cycle", attributes:=rec(length:="2"), content:=[cn0, RST.cn(-1, 0)])
]);

#<function degree='4'>
#	<nom><cn/><cn/><cn/><cn re='-2.0'/><cn re='1.0'/></nom>
#	<denom><cn re='1.0'/><cn re='-2.0'/><cn/><cn/><cn/></denom>
#   <cycle><cn re='-1.0'/></cycle>
#</function>

func4:= rec(name:="function", attributes:=rec(degree:="4"), content:= [
				rec(name:="numer", attributes:=rec(degree:="4"), content:= [cn0, cn0, cn0, RST.cn(-2, 0), RST.cn(1, 0)]),
				rec(name:="denom", attributes:=rec(degree:="4"), content:=[RST.cn(1,0), RST.cn(-2, 0), cn0, cn0, cn0]),
				rec(name:="cycle", attributes:=rec(length:="1"), content:=[RST.cn(0, 0)]),
				rec(name:="cycle", attributes:=rec(length:="1"), content:=[RST.cn(1, 0)]),
				rec(name:="cycle", attributes:=rec(length:="1"), content:=[cnInfinity])
]);


#inversebasilica := function2xml(CompositionP1Map(P1z^-1,P1z^2-1,P1z^-1));

