/**
 * 
 */
function makeNewtonDataStructure(roots, resArg) {
	
	var funcs = [];
	var newCoefs = [];
	var N = roots.length;
	funcs[0]= Complex["1"];
	//console.log(roots);
	for (var l = 0; l < N; l++) {
		for (var k = 0; k <= l; k++) {
			newCoefs[k] = Complex.neg(roots[l]).mult(funcs[k]).add(k == 0 ? Complex["0"]:funcs[k-1]); 
		}
		newCoefs[l+1] = Complex["1"];
		//console.log(l, newCoefs, funcs[0]);
		for (var j = 0; j <= l+1; j++) {
			funcs[j] = newCoefs[j];
		}
	}
	//console.log(funcs);
	var den = [];
	var num = [];
	for (var i = 0; i < N; i++) {
		num[i] = funcs[i].multiplyScalar(i-1);
		den[i] = funcs[i+1].multiplyScalar(i+1);
	}
	den[N] = Complex["0"];
	num[N] = funcs[N].multiplyScalar(N-1);
	//console.log("num", num, "den", den, "funcs", funcs);
	var res = resArg || [];
	res[0] = "FUNCTION";
	for (var m = 0; m <= N; m++) {
		res[0] += " " + roundTo(num[m].re, 1e-14).toString();
		res[0] += " " + roundTo(num[m].i, 1e-14).toString();
	}
	for (var o = 0; o <= N; o++) {
		res[0] += " " + roundTo(den[o].re, 1e-14).toString();
		res[0] += " " + roundTo(den[o].i, 1e-14).toString();
	}
	res[1] = "CYCLES";
	for (var p = 0; p < N; p++) {
		res[1] += " " + roots[p].re.toString() + " " + roots[p].i.toString();
		res[1] += " " + p + " 1";
	}
	return res;
	
}

function getSymmetricRoots(n) {
	var roots = [];
	for (var i = 0; i < n; i++) {
		roots.push(Complex.Polar(1., 2.*Math.PI*i/n));
	}
	return roots;
}

function makeSymmetricNewtonDataStructure(n, res) {
	return makeNewtonDataStructure(getSymmetricRoots(n), res);
}

