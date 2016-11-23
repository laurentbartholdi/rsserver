RSS := rec(f := fail);

RSS.open := function(address,port)
    local t;
    
    if RSS.f <> fail then
        Error("Port seems already open");
    fi;
    
    t := IO_socket(IO.PF_INET,IO.SOCK_STREAM,"tcp");

    if IO_connect(t,IO_MakeIPAddressPort(address,port)) = fail then
        IO_close(t);
        return fail;
    fi;
    
    RSS.f := IO_WrapFD(t,16384,false);
end;

RSS.close := function()
    if not IsFile(RSS.f) then
        Error("Port seems already closed");
    fi;
    
    IO_Close(RSS.f);
    
    RSS.f := fail;
end;

RSS.send := function(r)
    IO_Write(RSS.f, StringXMLElement(rec(name := "downdata",
            attributes := rec(), content := [r]))[1]);
end;

RSS.recv := function()
    local c, match;
    
    if not IO_HasData(RSS.f) then
        return fail;
    fi;
    c := IO_Read(RSS.f,6);
    if c="<updat" then
        match := "</updata>";
    elif c="<error" then
        match := "</error>";
    else
        Error("Expected beginning of 'updata' or 'error' tag");
    fi;
    while true do
        Append(c,IO_Read(RSS.f,1));
        if Length(c)>Length(match) and c{[Length(c)-Length(match)+1..Length(c)]}=match then
            return ParseTreeXMLString(c).content[1];
        fi;
    od;
end;

complex2xml := function(c)
    local a;
    a := rec(re := String(RealPart(c)), im := String(ImaginaryPart(c)));
    return rec(name := "cn", attributes := a, content := 0);
end;

p1point2xml := function(p)
    local a, c;
    if p=P1infinity then
        a := rec(name := "infinity");
    else
        return complex2xml(P1Coordinate(p));
    fi;
    return rec(name := "cn", attributes := a, content := 0);
end;

function2xml := function(f)
    local c, z, cycles;
    c := CoefficientsOfP1Map(f);
    z := PCDATAATTRACTINGCYCLES@IMG(POSTCRITICALPOINTS@IMG(f));
    cycles := Cycles(PermList(z{[1..Length(z)]}[2]+1),[1..Length(z)]);
    z := z{[1..Length(z)]}[1];

    return rec(name := "function",
               attributes := rec(degree := String(DegreeOfP1Map(f))),
               content := Concatenation([rec(name := "nom", attributes := rec(), content := List(c[1],complex2xml)),
                       rec(name := "denom", attributes := rec(), content := List(c[2],complex2xml))],
                       List(cycles,c->rec(name := "cycle", attributes := rec(), content := List(c,i->p1point2xml(z[i]))))));
end;
