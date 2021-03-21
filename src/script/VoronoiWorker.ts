import { Voronoi } from "../diagram/Voronoi"
import { Point } from "../diagram/types"

const ctx: Worker = self as any;  /* eslint-disable-line no-restricted-globals */

interface WorkerState {
	voronoi: Voronoi | null
	promise: Map<number, ((p: Point[]) => void)>
}

const state: WorkerState = {
	voronoi: null,
	promise: new Map(),
};

ctx.addEventListener('message', messaage => {
	var data = JSON.parse(messaage.data);
	console.log("worker", data);
	if (data.type === 'start') {
		var container = data.container;
		var provider = function (point) {
			return new Promise<Point[]>((resolve, reject) => {
				state.promise.set(point.code, resolve);
				ctx.postMessage(JSON.stringify({
					type: 'points',
					code: point.code,
				}));
			});
		};
		var progress = (index: number, polygon: Point[]) => {
			ctx.postMessage(JSON.stringify({
				type: 'progress',
				index: index,
				polygon: polygon.map(point => {
					return { lat: point.y, lng: point.x };
				})
			}));
		}
		state.voronoi = new Voronoi(container, provider);
		state.voronoi.execute(data.k, data.center, progress).then(() => {
			ctx.postMessage(JSON.stringify({
				type: 'complete',
			}));
		}).catch(e => {
			console.log(e)
			ctx.postMessage(JSON.stringify({
				type: 'error',
				err: e.message
			}));
		})


	} else if (data.type === 'points') {
		var resolve = state.promise.get(data.code);
		if (resolve) {
			state.promise.delete(data.code);
			resolve(data.points);
		} else {
			throw new Error(`no promise code:${data.code}`);
		}
	}
});