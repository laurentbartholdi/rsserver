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
		c.setHSL(u-0.5, 1, .5);
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

var COVER_SIZE = 2;

function getTestStereoImageData (transform_, center, w) {
	w = w || TEST_CANVAS_WIDTH;
	var h = w;
	var scale = 0.5*w/COVER_SIZE;
	
	function complexToTexture(c) {
		return {x: w/2 + scale*c.re, y: h/2 - scale*c.i};
		
	}
	
	
	var canvas = document.createElement("canvas");
	canvas.setAttribute("id", "testBitmapCanvas");
	canvas.width = w;
	canvas.height = h;
	var ctx = canvas.getContext("2d");

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
	
	if (center instanceof Complex) {
		if (center.r() == 0) ctx.fillStyle = "#cccccc";
		else if (center.isInfinity()) ctx.fillStyle = "#666666";
		else {
			var u = center.t()/2/Math.PI;
			if (u < 0) u += 1;
			if (u > 1) u -= 1;
			var c = new THREE.Color();
			c.setHSL(u, .6, .8);
			ctx.fillStyle = c.getStyle();
		}
		
	} else ctx.fillStyle = "#ddccaa";
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
	
	function drawCircle (c, r, phistart, phiend, ccw) {
		var xy0 = complexToTexture(c);
		var rTexture = r * scale;
		ctx.arc(xy0.x, xy0.y, rTexture, phistart || 0, phiend || 2*Math.PI, !ccw);
		/*if (! (xy0.x + rTexture > w ||
				xy0.x - rTexture < 0 ||
				xy0.y + rTexture > h ||
				xy0.y - rTexture < 0
				)) {
			ctx.arc(xy0.x, xy0.y, rTexture, 0, 2*Math.PI);
		}*/


	}
	function drawSegment(c1, c2) {
		var xy1 = complexToTexture(c1);
		var xy2 = complexToTexture(c2);
		ctx.moveTo(xy1.x, xy1.y);
		ctx.lineTo(xy2.x, xy2.y);
	}
	function drawLine (a, b, isRay) { // w = a + b*ksi
		var xyA = complexToTexture(a);
		var xyB = {x: b.re*scale, y: -b.i*scale};//complexToTexture(b);
		if (xyB.y == 0) {
			if (isRay) {
				ctx.moveTo(xyA.x, xyA.y);
				if (xyB.x > 0) ctx.lineTo(w, xyA.y)
				else ctx.lineTo(0, xyA.y);
			} else {
				ctx.moveTo(0, xyA.y);
				ctx.lineTo(w, xyA.y);
			}
		} else if (xyB.x == 0) {
			if (isRay){
				ctx.moveTo(xyA.x, xyA.y);
				if (xyB.y > 0) ctx.lineTo(xyA.x, h)
				else ctx.lineTo(xyA.x, 0);

			}
			else {
				ctx.moveTo(xyA.x, 0);
				ctx.lineTo(xyA.x, h);
			}
		} else {
			var x0 = xyA.x - xyB.x*xyA.y/xyB.y;
			var xh = xyA.x + xyB.x*(h-xyA.y)/xyB.y;
			var y0 = xyA.y - xyB.y*xyA.x/xyB.x;
			var yw = xyA.y + xyB.y*(w-xyA.x)/xyB.x;
			if (isRay) {
				ctx.moveTo(xyA.x, xyA.y);
				if (Math.abs(xyB.x) < 1e-10) {
					if (xyB.y > 0) ctx.lineTo(xyA.x, h);
					else ctx.lineTo(xyA.x, 0);
				} else if (xyB.x > 0) {
					ctx.lineTo(w, yw);
				} else {
					ctx.lineTo(0, y0);
				}
				
			} else {
				if (y0 >= 0 && y0 <= h && yw >= 0 && yw <= h) {
					ctx.moveTo(0, y0);
					ctx.lineTo(w, yw);
				} else if (x0 >= 0 && x0 <= w && xh >= 0 && xh <= w) {
					ctx.moveTo(x0, 0);
					ctx.lineTo(xh, h);
							
				} else { 
					var yFlag = false;
					if (y0 >= 0 && y0 <= h) {
						ctx.moveTo (0, y0);
						yFlag = true;
					} else if (yw >= 0 && yw <= h){
						ctx.moveTo (w, yw);
						yFlag = true;
					}
					if (yFlag) {
						if (x0 >= 0 && x0 <= w) {
							ctx.lineTo (x0, 0);
						} else if (xh >= 0 && xh <= w){
							ctx.lineTo (xh, h);
						}
					}
				}
			}
		}
	}
	
	var tav = TEST_ABS_VALUES;
	var c = new THREE.Color();
	
	var ti;
	if (transform_ instanceof MoebiusTransform) {
		ti = transform_.invert();}
	else ti = MoebiusTransform.identity;
	if (center instanceof Complex && transform_ instanceof MoebiusTransform) {
		ti = MoebiusTransform.focusTransform(center).superpos(transform_).invert();
	}//TODO - check
	for (var i = 0; i < tav.length; i ++) {
		var v = (1-2*Math.atan(tav[i])/Math.PI);
		c.setHSL(0, 0, v);
		ctx.strokeStyle = c.getStyle();
		ctx.lineWidth = 2;
		ctx.beginPath();
		
		if (transform_ instanceof MoebiusTransform) {
			if (ti.d.equals(Complex["0"])) {
				drawCircle(ti.a.divBy(ti.c), ti.b.r()/ti.c.r()/tav[i]);
			} else if (ti.c.equals(Complex["0"])) {
				drawCircle(ti.b.divBy(ti.d), ti.a.r()/ti.d.r()*tav[i]);
			} else {
			
				var denom = ti.d.r2()-ti.c.r2()*tav[i]*tav[i];
				var w0 = ti.b.mult(Complex.conj(ti.d)).sub(ti.a.mult(Complex.conj(ti.c)).multiplyScalar(tav[i]*tav[i]));
				var radius = tav[i]*ti.determinantAbs();
				if (denom != 0) {
					w0 = w0.multiplyScalar(1/denom);
					radius /= Math.abs(denom);
					drawCircle(w0, radius);
				} else {
					var lDenom = ti.c.mult(ti.c).multiplyScalar(ti.d.r2()).sub(ti.d.mult(ti.d).multiplyScalar(ti.c.r2()));
					if (!lDenom.equals(Complex["0"])){
					drawLine(ti.a.mult(ti.c).multiplyScalar(ti.d.r2()).sub(ti.b.mult(ti.d).multiplyScalar(ti.c.r2())).divBy(lDenom),
							ti.determinant().divBy(lDenom).multiplyScalar(-ti.d.r()*ti.c.r()));
					} else {
						var ac = ti.a.divBy(ti.c).multiplyScalar(.5);
						var bc = ti.b.divBy(ti.c).multiplyScalar(.5);
						if (ti.c.equals(ti.d)) {
							drawLine(ac.add(bc), ac.sub(bc).mult(Complex["I"]));
						} else {
							drawLine(ac.sub(bc), ac.add(bc).mult(Complex["I"]));
						}
					}
				} 
			}
		} else {
			drawCircle(Complex["0"], tav[i]);
		}
		ctx.stroke();
	}
	for (var i = 0; i < TEST_ANGLE_SECTIONS; i ++) {
		var u = i/TEST_ANGLE_SECTIONS;
		c.setHSL(u, 1, .5);
		ctx.strokeStyle = c.getStyle();
		ctx.lineWidth = 2;//i < TEST_ANGLE_SECTIONS / 2 ? 3 : 1;
		ctx.beginPath();
		var tau;
		var w0, radius;
		var z0 = Complex.Polar(1, 2*u*Math.PI);
		if (ti.d.equals(Complex["0"])) {
			drawLine(ti.a.divBy(ti.c), ti.b.divBy(ti.c.mult(z0)), true);
		} else if (ti.c.equals(Complex["0"])) {
			drawLine(ti.b.divBy(ti.d), ti.a.mult(z0).divBy(ti.d), true);
		} else {
			var czd = ti.c.mult(z0).divBy(ti.d);
			if (Math.abs(czd.i) > 1e-13) {
				tau = czd.re/czd.i;
				var factor = ti.determinant().divBy(ti.c).divBy(ti.d).multiplyScalar(0.5);
				var phif = factor.t();
				factor = factor.mult(new Complex(1, tau));
				w0 = ti.a.divBy(ti.c).sub(factor);
				drawCircle(w0, factor.r(), Math.PI-w0.sub(ti.a.divBy(ti.c)).t(), Math.PI-w0.sub(ti.b.divBy(ti.d)).t(), czd.i < 0);
				
			} else {
				if (czd.re > 0) drawSegment(ti.a.divBy(ti.c), ti.b.divBy(ti.d));
				else {
					drawLine(ti.a.divBy(ti.c), ti.a.divBy(ti.c).sub(ti.b.divBy(ti.d)), true);
					drawLine(ti.b.divBy(ti.d), ti.b.divBy(ti.d).sub(ti.a.divBy(ti.c)), true);
				}
			}
		} 
		ctx.stroke();
		ctx.strokeStyle = "#ffffff";
		ctx.beginPath();
		drawCircle(ti.a.divBy(ti.c), 0.01);
		drawCircle(ti.b.divBy(ti.d), 0.01);
		//ctx.stroke();
		
		
	}
	document.body.appendChild(canvas);
	
	return canvas.toDataURL();
	
}

function dataURLtoBlob(dataurl) {
    var arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1],
        bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
    while(n--){
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], {type:mime});
}