declare class Path2D {
  addPath();
  closePath();
  moveTo();
  lineTo();
  bezierCurveTo();
  quadraticCurveTo();
  arc();
  arcTo();
  ellipse();
  rect();
}

declare interface CanvasRenderingContext2D {
  currentTransform: SVGMatrix;
  clip(path: Path2D);
  clip(path: Path2D, fillRule?: 'nonzero' | 'evenodd');
  ellipse(x, y, radiusX, radiusY, rotation, startAngle, endAngle, anticlockwise);

  fill(path: Path2D);
  stroke(path: Path2D);
}
