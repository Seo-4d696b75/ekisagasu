// webworker
importScripts("diagram/HighVoronoi.js");

const state = {
	voronoi: null,
	promise: new Map(),
};

self.addEventListener('message', messaage => {
	var data = JSON.parse(messaage.data);
	console.log("worker", data);
	if ( data.type === 'start' ){
		var points = data.container;
		var container = Triangle.init(points[0],points[1],points[2]);
		var provider = function(point){
			return new Promise((resolve,reject) =>{
				state.promise.set(point.code, resolve);
				self.postMessage(JSON.stringify({
					type: 'points',
					code: point.code,
				}));
			});
		};
		state.voronoi = new Voronoi(container, provider);
		state.voronoi.execute(data.k, data.center, (index,polygon)=>{
			self.postMessage(JSON.stringify({
				type: 'progress',
				index: index,
				polygon: polygon.map( point => {
					return {lat: point.y, lng: point.x};
				})
			}));
		}).then( result => {
			self.postMessage(JSON.stringify({
				type: 'complete',
			}));
		});
	} else if ( data.type === 'points' ){
		var resolve = state.promise.get(data.code);
		if ( resolve ){
			state.promise.delete(data.code);
			resolve(data.points);
		} else {
			throw new Error(`no promise code:${data.code}`);
		}
	}
});