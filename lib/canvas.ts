import { Ps0 } from './ps0';
import { Symbol } from './util';

export function CanvasMixin(deviceCtx: CanvasRenderingContext2D, Ps: Ps0) {
  var Sd = {};
  Ps.Ds.push(Sd);

  function def(Nm, Fn) { Sd[new Symbol(Nm)] = Fn; }

  // TODO: Move to PostScript.
  const framebuffer = new DewdropCanvas(deviceCtx);
  def('framebuffer', function() {
    this.Os.push(framebuffer);
  });

  let currentCanvas: DewdropCanvas;
  def('newcanvas', function() {
    const parent = this.Os.pop();
    this.Os.push(new DewdropCanvas(parent));
  });
  def('reshapecanvas', function() {
    const cv = this.Os.pop();
    cv.reshape(currentCanvas.bufferCtx.currentPath, currentCanvas.bufferCtx.currentTransform);
  });
  def('setcanvas', function() {
    const cv = this.Os.pop();
    setCanvas(cv);
  });
  function setCanvas(cv: DewdropCanvas) {
    def('.$gc', cv.bufferCtx);
    currentCanvas = cv;
  }
  setCanvas(framebuffer);

  def('erasepage', function() {

  });

  function setupAnimation() {
    window.requestAnimationFrame(function() {
      framebuffer.paint();
      setupAnimation();
    });
  }
}

// A Dewdrop 'server'. Occupies a single HTML5 canvas.
export class Dewdrop {
  constructor(context: CanvasRenderingContext2D) {
    // FIXME fill in the root with gray so canvases stand out
  }
}

// We keep a number of virtual canvases which are purely in-memory.
// Then on each paint, we walk the tree of Dewdrop canvases and paint
// all of them onto the real graphics context.

type DewdropRenderingContext = CanvasRenderingContext2D & { currentPath: any };

// Just like an ordinary canvas rendering context, except
// it remembers the current clip path.
// This is useful because:
// 1. PostScript has `clippath`
// 2. I need to be able to clip window content according to window shape
// when it gets painted on a larger canvas.
function wrap(ctx: CanvasRenderingContext2D): DewdropRenderingContext {
  const wrapper: DewdropRenderingContext = Object.create(ctx, {
    currentPath: { writable: true, configurable: true, value: null }
  });

  // Path methods.
  wrapper.currentPath = null;
  wrapper.beginPath = function() {
    wrapper.currentPath = new Path2D();
    // hack. see if this works...
    Object.keys(wrapper.currentPath).forEach(key => wrapper[key] = wrapper.currentPath[key]);
  };

  // Drawing paths.
  // Need to intercept anything that finishes off a path.
  wrapper.fill = function() {
    ctx.fill(wrapper.currentPath);
  };
  wrapper.stroke = function() {
    ctx.stroke(wrapper.currentPath);
  };

  return wrapper;
}

class DewdropCanvas {
  // Real graphics context.
  deviceCtx: CanvasRenderingContext2D;

  // In-memory buffer which is drawn on after `setcanvas` is called.
  buffer: HTMLCanvasElement;
  bufferCtx: DewdropRenderingContext;

  // When you copy the buffer context onto the real context,
  // you push the shape on as clip and the transform matrix on,
  // which achieves the window effect.
  shape: Path2D;
  transformMatrix: SVGMatrix;

  parent: DewdropCanvas;
  children: DewdropCanvas[];

  constructor(parentOrDevice: DewdropCanvas | CanvasRenderingContext2D) {
    if (parentOrDevice instanceof DewdropCanvas) {
      this.parent = parentOrDevice;
      this.deviceCtx = this.parent.deviceCtx;

    } else {
      this.deviceCtx = parentOrDevice;
    }

    this.buffer = document.createElement('canvas');
    this.bufferCtx = wrap(this.buffer.getContext('2d'));
  }

  // PostScript `reshapecanvas` should call this using info from the context.
  // See NeWS 1.1 Manual, p. 144:
  //    Sets the shape of canvas to be the current path, and it sets the canvas'
  //    default transformation matrix from the current transformation matrix.
  reshape(shape: Path2D, transformMatrix: SVGMatrix) {
    this.shape = shape;
    this.transformMatrix = transformMatrix;
  }

  paint() {
    this.deviceCtx.save();

    this.deviceCtx.currentTransform = this.transformMatrix;
    this.deviceCtx.clip(this.shape);
    this.deviceCtx.drawImage(this.buffer, 0, 0);

    this.children.forEach(child => child.paint());

    this.deviceCtx.restore();
  }
}
