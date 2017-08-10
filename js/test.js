const TEST_CANVAS_WIDTH = 1024;
const TEST_CANVAS_HEIGHT = 512;

const TEST_ABS_VALUES = [0.1, 0.2, 0.5, 0.6, 0.7, 0.8, 0.9,  1, 1.2, 1.4, 1.6, 1.8, 2, 3, 4, 5, 10];
const TEST_ANGLE_SECTIONS = 12;
const steps = 200;

function getIcosahedron() {
	var phi1 = 0.5*(Math.sqrt(5)+1);
	var v0 = new THREE.Vector3(1, phi1, 0);
	var vertices = [v0];
	addRect(2, vertices);
	addCyclePerm(vertices);
	console.log(vertices)
	return vertices;
}

function addCyclePerm (arr, arrres) {
	return addSymmetry("perm", arr, arrres);
}

function addRect(axis, arr, arrres) {
	res = addSymmetry({type: "mirror", axis: (axis + 1) % 3}, arr, arrres);
	addSymmetry({type: "mirror", axis: (axis + 2) % 3}, arr, res);
	return res;
}

function addSymmetry (type, arr, arrres) {
	var l0 = arr.length;
	var res = arrres || arr;
	
	if (typeof type === "string") {
		switch(type) {
		case "perm" :{
			for (var i = arrres ? 0 : 1; i < 3; i++) {
				for (var j = 0; j < l0; j++) {
					var v = new THREE.Vector3();
					for (var k = 0; k < 3; k++)
						v.setComponent(k, arr[j].getComponent((k+i) % 3));
					res.push(v);
				}
			}	
			break;		
		} 
		}
	} else if (typeof type === "object" && type.hasOwnProperty("type")){
		switch(type.type) {
			case "mirror" : {
				if (type.hasOwnProperty("axis")) {
					for (var jj = 0; jj < l0; jj++) {
						var v = new THREE.Vector3();
						v.copy(arr[jj]);
						v.setComponent(type.axis, -arr[jj].getComponent(type.axis));
						res.push(v);
					}
				} 
				break;				
			}
		}
	}
	return res;
	
}

function getTestImageData (transform_, w, h) {
	w = w || TEST_CANVAS_WIDTH;
	h = h || TEST_CANVAS_HEIGHT;
	
	var canvas = document.createElement("canvas");
	canvas.setAttribute("id", "testBitmapCanvas");
	canvas.width = w;
	canvas.height = h;
	var ctx = canvas.getContext("2d");

	function uvToTexture (uv, w, h) {
		return {x: uv.u*w, y: h*(1-uv.v)}
	}

	function fillQuadrille (dist) {
		var x0, y0, x1, y1;
		y0=0;
		for (x0 = 0; x0 < w; x0 += dist) {
			if (x0 < h) {
				y1 = x0;
				x1 = 0;
			} else {
				y1 = h;
				x1 = x0-h;
			}
			ctx.moveTo(x0, y0);
			ctx.lineTo(x1, y1);
			ctx.moveTo(w-x0, y0);
			ctx.lineTo(w-x1, y1);
		}
		x0 = w;
		for (y0 = 0; y0 < h; y0+= dist) {
			if (y0 > h-w) {
				x1 = w-h+y0;
				y1 = h;
			} else {
				y1 = y0+w;
				x1 = 0;
			}
			ctx.moveTo(x0, y0);
			ctx.lineTo(x1, y1);
			ctx.moveTo(w-x0, y0);
			ctx.lineTo(w-x1, y1);
		}
	}
	ctx.fillStyle = "#ddccaa";
	ctx.fillRect(0, 0, w, h);
	ctx.strokeStyle = "#664422";
	ctx.lineWidth = 1;
	ctx.beginPath();
	fillQuadrille(8);
	ctx.stroke();
	ctx.strokeStyle = "#000000";
	ctx.beginPath();
	ctx.moveTo(0, 0);
	ctx.lineTo(0, h);
	ctx.stroke();
	ctx.strokeStyle = "#ffffff";
	ctx.beginPath();
	ctx.moveTo(w, 0);
	ctx.lineTo(w, h);
	ctx.stroke();
	
	var tav = TEST_ABS_VALUES;
	var c = new THREE.Color();
	function smartLineTo (uv, uvNew) {
		var xyNew = uvToTexture(uvNew, w, h);
		if (Math.abs(uv.u - uvNew.u) > .5) {
			var v, xyl, xym;
			if (uv.u > uvNew.u) {
				v = uv.v + (uvNew.v - uv.v)*(1-uv.u)/(1-uv.u + uvNew.u);
				xyl = uvToTexture({u: 1, v: v}, w, h);
				xym = uvToTexture({u: 0, v: v}, w, h);
			} else {
				v = uv.v + (uvNew.v - uv.v)*uv.u/(uv.u - uvNew.u + 1);
				xyl = uvToTexture({u: 0, v: v}, w, h);
				xym = uvToTexture({u: 1, v: v}, w, h);
			}
			ctx.lineTo(xyl.x, xyl.y);
			ctx.moveTo(xym.x, xym.y);
		} else if (Math.abs(uv.v - uvNew.v) > .5) {
			var u, xyl, xym;
			if (uv.v > uvNew.v) {
				u = uv.u + (uvNew.u - uv.u)*(1-uv.v)/(1-uv.v + uvNew.v);
				xyl = uvToTexture({u: u, v: 1}, w, h);
				xym = uvToTexture({u: u, v: 0}, w, h);
			} else {
				u = uv.u + (uvNew.u - uv.u)*uv.v/(uv.v - uvNew.v + 1);
				xyl = uvToTexture({u: u, v: 0}, w, h);
				xym = uvToTexture({u: u, v: 1}, w, h);
			}			
				ctx.lineTo(xyl.x, xyl.y);
				ctx.moveTo(xym.x, xym.y);
			
		}
		ctx.lineTo(xyNew.x, xyNew.y);
	}
	var ti;
	if (transform_ instanceof MoebiusTransform) {
		ti = transform_.invert();}
	for (var i = 0; i < tav.length; i ++) {
		var v = (1-2*Math.atan(tav[i])/Math.PI);
		c.setHSL(0, 0, v);
		ctx.strokeStyle = c.getStyle();
		ctx.lineWidth = 2;
		ctx.beginPath();
		
		
		if (transform_ instanceof MoebiusTransform) {
			var w0 = ti.apply(new Complex(tav[i], 0));
			var uv, uvNew;
			uv = CU.sphericalToUV(CU.projectToSphere(w0));
			var xy = uvToTexture(uv, w, h);
			ctx.moveTo(xy.x, xy.y);
			for (var j = 0; j <= steps; j++) {
				var z = Complex.Polar(tav[i], 2*Math.PI*j/steps);
				var w_ = ti.apply(z);
				var uvNew = CU.sphericalToUV(CU.projectToSphere(w_));
				smartLineTo(uv, uvNew);
				uv = {u: uvNew.u, v: uvNew.v};
			}
		} else {
			var xym = uvToTexture({u:0, v:v}, w, h);
			var xyl = uvToTexture({u:1, v:v}, w, h);
			ctx.moveTo(xym.x, xym.y);
			ctx.lineTo(xyl.x, xyl.y);
		}
		ctx.stroke();
		
	}
	var ti0, uv0, xy0;
	if (transform_ instanceof MoebiusTransform) { 
		ti0 = ti.apply(Complex["0"]);
		uv0 = CU.sphericalToUV(CU.projectToSphere(ti0));
		xy0 = uvToTexture(uv0, w, h);
	}
	for (var i = 0; i < TEST_ANGLE_SECTIONS; i ++) {
		var u = i/TEST_ANGLE_SECTIONS;
		c.setHSL(0.5-u, 1, .5);
		ctx.strokeStyle = c.getStyle();
		ctx.lineWidth = 2;
		ctx.beginPath();
		if (transform_ instanceof MoebiusTransform) {
			var phi = (2*u-1)*Math.PI;
			uv = {u: uv0.u, v: uv0.v};
			ctx.moveTo(xy0.x, xy0.y);
			var thetaStep = Math.PI/2/steps;
			for (var theta = 0; theta <= Math.PI/2; theta += thetaStep) {
				var z = Complex.Polar(Math.tan(theta), phi);
				var w_ = ti.apply(z);
				var uvNew = CU.sphericalToUV(CU.projectToSphere(w_));
				smartLineTo(uv, uvNew);
				uv = {u: uvNew.u, v: uvNew.v};
				
			}
		} else {
			var xym = uvToTexture({u:u, v:0}, w, h);
			var xyl = uvToTexture({u:u, v:1}, w, h);
			ctx.moveTo(xym.x, xym.y);
			ctx.lineTo(xyl.x, xyl.y);
		}
		ctx.stroke();
		
	}
	document.body.appendChild(canvas);
	
	return canvas.toDataURL();
	
}

getIcosahedron();
