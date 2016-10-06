// References used to check the math:
// https://gist.github.com/abicky/3165385
// https://github.com/simonsarris/Canvas-tutorials/blob/master/transform.js

// Functions returning the matrix used for the same-named Canvas transform.

export const translate = function (x, y) {
  return [1, 0, 0, 1, x, y];
};

export const rotate = function (a) {
  var cos = Math.cos(a);
  var sin = Math.sin(a);
  return [cos, sin, -sin, cos, 0, 0];
};

export const scale = function (x, y) {
  return [x, 0, 0, y, 0, 0];
};

export const transform = function (a, b, c, d, e, f) {
  return [a, b, c, d, e, f];
};

const basicTransforms: any = { translate, rotate, scale, transform };

const determinant = function (m) {
  return m[0] * m[3] - m[1] * m[2];
};

// FIXME: Implement basic test for inverse.
export const inverse = function(m) {
  const dt = determinant(m);
  return [
    m[3] / dt,
    -m[1] / dt,
    -m[2] / dt,
    m[0] / dt,
    (m[2] * m[5] - m[3] * m[4]) / dt,
    -(m[0] * m[5] - m[1] * m[4]) /dt
  ];
};

export const multiply = function(m1, m2) {
  // Value [a,b,c,d,e,f] represents the 3 by 3 matrix
  // a c e
  // b d f
  // 0 0 1
  return [
    m1[0] * m2[0] + m1[2] * m2[1],
    m1[1] * m2[0] + m1[3] * m2[1],
    m1[0] * m2[2] + m1[2] * m2[3],
    m1[1] * m2[2] + m1[3] * m2[3],
    m1[0] * m2[4] + m1[2] * m2[5] + m1[4],
    m1[1] * m2[4] + m1[3] * m2[5] + m1[5],
  ];
};

export const applyToPoint = function(m, x, y) {
  return {
    x: x * m[0] + y * m[2] + m[4],
    y: x * m[1] + y * m[3] + m[5]
  }
};

// Given the current transformation matrix, a transform to apply to it, and its
// arguments as an array or array-like object, return the new transformation
// matrix. If an unrecognized method is provided, returns the original matrix.
const processMethod = function (m, methodName, args) {
  // Resetting transforms.
  if (methodName === "resetTransform") {
    return [1, 0, 0, 1, 0, 0];
  } else if (methodName === "setTransform") {
    return basicTransforms.transform.apply(null, args);
  // Transforms that accumulate.
  } else if (basicTransforms[methodName]) {
    return multiply(m, basicTransforms[methodName].apply(null, args));
  // Bad method name.
  } else {
    return m;
  }
};
export { processMethod as process };

// Method names recognized by processMethod, all methods on a context.
var transformMethodNames = Object.keys(basicTransforms).concat([
  "resetTransform", "setTransform",
]);

// Given a Canvas context, add a getTransform method directly to it along with
// the appropriate wrappers around the transformation methods. Noop if the
// context already has a getTransform method. Assumes the context is fresh
// with an identity transformation and no previous save/restore calls.
export function augmentContext(ctx) {
  if (!ctx || typeof ctx !== "object" || !ctx.canvas) {
    throw new Error("augmentContext: Must pass a Canvas context.");
  }

  // Implement resetTransform if not present already.
  ctx.resetTransform = ctx.resetTransform || function() {
    this.setTransform(1, 0, 0, 1, 0, 0);
  };

  var transform = [1, 0, 0, 1, 0, 0];
  var stack = [];
  transformMethodNames.forEach(function (name) {
    var oldMethod = ctx[name];
    ctx[name] = function () {
      transform = processMethod(transform, name, arguments);
      return oldMethod.apply(ctx, arguments);
    };
  });

  var oldSave = ctx.save;
  ctx.save = function () {
    stack.push(transform);
    return oldSave.apply(ctx, arguments);
  };

  var oldRestore = ctx.restore;
  ctx.restore = function () {
    transform = stack.pop() || transform;
    return oldRestore.apply(ctx, arguments);
  };

  Object.defineProperty(ctx, 'currentTransform', {
    get() {
      return transform;
    },
    set(newTransform: any) {
      transform = newTransform;
      ctx.setTransform.apply(ctx, transform);
    }
  });
};
