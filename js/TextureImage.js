 /**
 * 
 */

var TextureImage = function (data, size, transform) {
	this.dataObject = parseJuliaData(data);
	this.maxIter = this.dataObject.maxiter;
	this.resObj = {};
	//this.textureCanvas = document.createElement('canvas');
	this.textureCanvas = document.getElementById("test-canvas");
	this.textureCanvas.width = 2*size;
	this.textureCanvas.height = size;
	console.log("canvas", this.textureCanvas, this.textureCanvas.width);
	var textureContext = this.textureCanvas.getContext('2d');

	this.drawTexture(textureContext, this.textureCanvas.width, this.textureCanvas.height);
	
	

}



TextureImage.prototype = {
		constructor: TextureImage
}
var tip = TextureImage.prototype;
var ti = TextureImage;
ti.juliaColor = new THREE.Color(0xcccccc);
tip.evaluateDataPoint = function (z) {
	//this.initResObj(z);
	//for (var i = 0; i < this.maxIter; i++) {
		//z = z.mult(z).mult(z).multiplyScalar(2).add(Complex["1"]).divBy(z.mult(z).multiplyScalar(3));
	//}
	//return ti.getColor(this.resObj.n.divBy(this.resObj.d));
	var res = testEval(this.dataObject, z, 15);//this.dataObject.maxiter);
	if (res.mi) return new THREE.Color(0x444444);
	if (res.julia) return ti.juliaColor;
	return ti.getColor(res.res);
};
tip.update = function (rsCanvas, dataStructure, iterations) {
	if (dataStructure) {
		this.dataObject = parseJuliaData(dataStructure);
	}
	this.drawTexture(this.textureCanvas.getContext('2d'), 
			this.textureCanvas.width, 
			this.textureCanvas.height, 
			rsCanvas.currentTransform);
}
tip.drawTexture = function(ctx, w, h, transform) {
	var imgData = ctx.createImageData(w, h);
	transform = transform || MoebiusTransform.identity;
	var offset = 0;
	for (var y = 0; y < h; y++) {
		for (var x = 0; x < w; x++) {
			var z = transform.apply(this.xyToComplex(x, y));
			var c = this.evaluateDataPoint(z);
			ti.colorPixel(imgData, offset, c);
			offset += 4;
		}
	}
	console.log(imgData.data);
	ctx.putImageData(imgData, 0, 0);
	
}
tip.initResObj = function(z) {
	
	this.resObj.d = new Complex(1/(z.r() + 1), 0);
	this.resObj.n = this.resObj.d.mult(z);
}
tip.complexToXY = function (z) {
	//TODO implement complex conversion
	return {x: z.re*this.textureCanvas.width, y: z.i*this.textureCanvas.height};
}

tip.xyToComplex = function (x, y) {
	return Complex.Polar(Math.tan(y/this.textureCanvas.height*Math.PI*.5), (x/this.textureCanvas.width + 0.5)*2*Math.PI);
}
ti.colorPixel = function (data /*ImageData*/, offset, color/*THREE.Color*/) {
	var buffer = data.data;
	buffer[offset] = Math.round(color.r*255);
	buffer[offset + 1] = Math.round(color.g*255);
	buffer[offset + 2] = Math.round(color.b*255);
	buffer[offset + 3] = 255;
}

ti.getColor = function(z) {
	var res = new THREE.Color();
	res.setHSL(z.t()/Math.PI*0.5, 1.,1./(1.+z.r2()));
	return res; 
};