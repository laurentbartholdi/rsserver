//Copyright (c) Anna Alekseeva 2013-2016
var ComplexIO = function(domElement, value, label, input, id) {
	if (value instanceof Complex) {
		this.value = value;		
	} else if (value && value.value) {
		this.value = value.value;
	} else this.value = Complex["1"];
	if (input !== undefined) this.input = input
	else if (value.input !== undefined) this.input = value.input
	else this.input = true;
	var idNum = ComplexIO.instanceID ++;
	var idStr = id || value.id || ("complexIO" + idNum); 
	var div = document.createElement("div");
	div.setAttribute("id", idStr);
	if (label || value.label) {
		var lbl = document.createElement("label");
		div.appendChild(lbl);
		lbl.innerHTML = label || value.label;		
	}
	var reField, imField;
	if (this.input) {
		reField = document.createElement("input");
		reField.setAttribute("type", "text");
		imField = document.createElement("input");
		imField.setAttribute("type", "text");
		reField.setAttribute("value", this.value.re);
		imField.setAttribute("value", this.value.i);
		reField.setAttribute("id", idStr + "re");
		reField.setAttribute("id", idStr + "im");
	} else {
		reField = document.createTextNode(this.value.re);
		imField = document.createTextNode(this.value.i);
		//reField.innerHTML = ;
		//imField.innerHTML = ;
	}
	div.appendChild(reField);
	div.appendChild(document.createTextNode(" + i*"));
	div.appendChild(imField);
	
	domElement.appendChild(div); 
	
	reField.addEventListener("change", this.onChange);
	imField.addEventListener("change", this.onChange);
	var that = this;
	this.eventDispatcher = div;
	this.setValue = function(val) {
		this.value = val;
		if (this.input) {
			reField.value = val.re;
			imField.value = val.i;
		} else {
			reField.nodeValue = val.re;
			imField.nodeValue = val.i;
		}
	};
	
	this.getValue = function() {
		return new Complex(parseFloat(reField.value), parseFloat(imField.value));
	};
	this.onChange = function(event) {
		that.eventDispatcher.dispatchEvent(new CustomEvent("valueChange", {detail: {value: that.getValue(), targetID: idStr}}));
	};
}
console.log("complexIO", ComplexIO);

ComplexIO.instanceID = 0;

ComplexIO.prototype = {constructor: ComplexIO};