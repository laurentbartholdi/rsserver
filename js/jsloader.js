var scriptUrls = [
              	"/js/Frontend.js",
            	"/js/libs/three.min.js",
            	"/js/libs/FileSaver.min.js",
            	"/js/libs/Blob.js",
            	"/js/ComplexOpt.js",
            	"/js/ComplexUtilsOpt.js",
            	"/js/Grid.js",
            	"/js/PointMarkers.js",
            	"/js/RationalFuncs.js",
            	"/js/DataParser.js",
            	"/js/UIUtils.js",
            	"/js/ComplexIO.js",
            	"/js/RSCanvas.js",
            	"/js/RSCanvasContainer.js"
                  
                  ];

var el = document.getElementsByTagName("body")[0];
function loadScript(url){

    var script = document.createElement("script");
    script.type = "text/javascript";


    script.src = url;
    el.appendChild(script);
}
for (var s = 0; s < scriptUrls.length; s++) {
	loadScript(scriptUrls[s]);
}
/*
var theEndScript = document.createElement("script");
theEndScript.type = "text/javascript";
var t = document.createTextNode("pageInit();");
theEndScript.appendChild(t);
el.appendChild(theEndScript);*/

