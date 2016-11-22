console.log("script loaded");
var para = document.createElement("p");
var node = document.createTextNode("This is new.");
para.appendChild(node);

var element = document.getElementById("tests");
element.appendChild(para);
