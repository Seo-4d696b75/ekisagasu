
export interface Point {
	x: number
	y: number
}


export interface Line {
	a: number
	b: number
	c: number
}


export interface Edge {
	a: Point
	b: Point
}


export interface Triangle {
	a: Point
	b: Point
	c: Point
}


export interface Circle {
	center: Point
	radius: number
}

export interface Rect {
  left: number
  top: number
  right: number
  bottom: number
}


export class DiagramError extends Error {}