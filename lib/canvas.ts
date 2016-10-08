import { Ps0 } from './ps0';
import { Symbol } from './util';

import { augmentContext, inverse, applyToPoint } from './context-transform';

export function CanvasMixin(Ps: Ps0, deviceCtx: CanvasRenderingContext2D) {
  var Sd = {};
  Ps.Ds.push(Sd);

  function def(Nm, Fn) { Sd[new Symbol(Nm)] = Fn; }

  // TODO: Move to PostScript.
  const framebuffer = new DewdropCanvas(Ps, deviceCtx);
  def('framebuffer', function() {
    this.Os.push(framebuffer);
  });

  // TODO: is framebuffer-as-default-canvas reasonable/consistent behavior?
  // It's nice because it lets normal PostScript programs work out of the box.
  let currentCanvas: DewdropCanvas;
  def('newcanvas', function() {
    const parent = this.Os.pop();
    this.Os.push(new DewdropCanvas(Ps, parent));
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
    currentCanvas.bufferCtx.save();
    currentCanvas.bufferCtx.fillStyle = 'white';
    currentCanvas.bufferCtx.fill(currentCanvas.shape);
    currentCanvas.bufferCtx.restore();
  });

  (function setupAnimation() {
    window.requestAnimationFrame(function() {
      framebuffer.paint();
      setupAnimation();
    });
  })();
}

// We keep a number of virtual canvases which are purely in-memory.
// Then on each paint, we walk the tree of Dewdrop canvases and paint
// all of them onto the real graphics context.

type DewdropRenderingContext = CanvasRenderingContext2D & {
  currentPath: any;
  currentTransform: any;
};

// Just like an ordinary canvas rendering context, except
// it remembers the current clip path.
// This is useful because:
// 1. PostScript has `clippath`
// 2. I need to be able to clip window content according to window shape
// when it gets painted on a larger canvas.
function wrap(ctx: CanvasRenderingContext2D): DewdropRenderingContext {
  augmentContext(ctx);

  const wrapper: DewdropRenderingContext = ctx as any;

  // Path methods.
  wrapper.beginPath = function() {
    wrapper.currentPath = new Path2D();
    // hack. see if this works...
    for (const key in wrapper.currentPath) {
      wrapper[key] = function() {
        wrapper.currentPath[key].apply(wrapper.currentPath, arguments);
      }
    }
  };
  wrapper.beginPath();

  // Drawing paths.
  // Need to intercept anything that finishes off a path.
  const originalFill = ctx.fill;
  wrapper.fill = function(path?: any) {
    originalFill.call(ctx, path || wrapper.currentPath);
  };
  const originalStroke = ctx.stroke;
  wrapper.stroke = function(path?: any) {
    originalStroke.call(ctx, path || wrapper.currentPath);
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
  children: DewdropCanvas[] = [];

  constructor(Ps: Ps0, parentOrDevice: DewdropCanvas | CanvasRenderingContext2D) {
    if (parentOrDevice instanceof DewdropCanvas) {
      this.parent = parentOrDevice;
      this.parent.children.push(this);
      this.deviceCtx = this.parent.deviceCtx;

    } else {
      this.deviceCtx = parentOrDevice;
    }

    // Attach events.
    this.deviceCtx.canvas.addEventListener('mouseup', (event) => {
      if (!this.shape) return;
      this.deviceCtx.save();
      if (this.transformMatrix) {
        this.deviceCtx.setTransform.apply(this.deviceCtx, this.transformMatrix);
      }
      if (this.deviceCtx.isPointInPath(this.shape, event.offsetX, event.offsetY)) {
        const e: any = {};
        e[new Symbol('Canvas')] = this;
        e[new Symbol('Name')] = new Symbol('LeftMouseButton');
        e[new Symbol('Action')] = new Symbol('UpTransition');
        const inv = inverse(this.transformMatrix);
        const { x, y } = applyToPoint(inv, event.offsetX, event.offsetY);
        e[new Symbol('XLocation')] = x;
        e[new Symbol('YLocation')] = y;
        Ps.sendEvent(e);
      }
      this.deviceCtx.restore();
    });

    // Bind buffer to draw on.
    this.buffer = document.createElement('canvas');

    // Hacks for negative space.
    this.buffer.width = 2048;
    this.buffer.height = 2048;
    // Do before tracking transforms. Permanent transform.
    // Keeps negative coordinates usable.
    this.buffer.getContext('2d').translate(1024, 1024);

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

    if (this.transformMatrix) {
      this.deviceCtx.setTransform.apply(this.deviceCtx, this.transformMatrix);
    }
    if (this.shape) {
      this.deviceCtx.clip(this.shape);
    }

    // Adjust for permanent transform. Keeps negative coordinates usable.
    this.deviceCtx.drawImage(this.buffer, -1024, -1024);

    this.children.forEach(child => {
      // FIXME: Check if Mapped or not.
      child.paint()
    });

    this.deviceCtx.restore();
  }
}
