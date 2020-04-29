

export function init(left,top,right,bottom){
	return {
		left: left,
		top: top,
		right: right,
		bottom: bottom,
	};
}

export function getContainer(rect){
	var x = (rect.left + rect.right)/2;
	var y = (rect.top + rect.bottom)/2;
	var r = Math.sqrt(Math.pow(rect.left - rect.right, 2) + Math.pow(rect.top - rect.bottom ,2));
	var a = {x:x - Math.sqrt(3)*r, y:y+r};
	var b = {x:x + Math.sqrt(3)*r, y:y+r};
	var c = {x:x, y:y - 2*r};
	return [a,b,c];
}

export function getCenter(rect){
	return {
		x: (rect.right + rect.left)/2,
		y: (rect.top + rect.bottom) /2,
	};
}