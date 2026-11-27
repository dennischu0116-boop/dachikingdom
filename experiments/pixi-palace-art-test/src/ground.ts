/** Shared ground-plane projection for Pixi and the static art proof.
 * Material images are top-down; only this transform introduces perspective.
 * The basis is an artistic fit to the Taihe plinth edges, not a surveyed camera.
 */
export type GroundBasis = { a:number; b:number; c:number; d:number };
export type GroundPoint = { x:number; y:number };
export function projectGround(basis:GroundBasis,p:GroundPoint):GroundPoint {
 return {x:basis.a*p.x+basis.c*p.y,y:basis.b*p.x+basis.d*p.y};
}
export function unprojectGround(basis:GroundBasis,p:GroundPoint):GroundPoint {
 const det=basis.a*basis.d-basis.b*basis.c;
 if(Math.abs(det)<1e-8)throw new Error('Ground projection must be invertible');
 return {x:(basis.d*p.x-basis.c*p.y)/det,y:(basis.a*p.y-basis.b*p.x)/det};
}
export function groundCoverage(basis:GroundBasis,width:number,height:number){
 const corners=[{x:0,y:0},{x:width,y:0},{x:0,y:height},{x:width,y:height}].map(p=>unprojectGround(basis,p));
 const x=Math.floor(Math.min(...corners.map(p=>p.x)))-2,y=Math.floor(Math.min(...corners.map(p=>p.y)))-2;
 return {x,y,width:Math.ceil(Math.max(...corners.map(p=>p.x)))-x+2,height:Math.ceil(Math.max(...corners.map(p=>p.y)))-y+2};
}
export function roadCorners(basis:GroundBasis,road:{x:number;y:number;width:number;length:number}){
 return [{x:-road.width/2,y:0},{x:road.width/2,y:0},{x:road.width/2,y:road.length},{x:-road.width/2,y:road.length}].map(p=>{const q=projectGround(basis,p);return{x:q.x+road.x,y:q.y+road.y};});
}
