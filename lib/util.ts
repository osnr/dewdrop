export function isQuoted(V) {return V.D16322F5;}
export function quote(V) {V.D16322F5 = true; return V;}
export function unquote(V) {delete V.D16322F5; return V;}

// random markers for quoting and toString generated using picolisp
// (hex (in "/dev/random" (rd 4)))

export function Symbol(N): void {this.nm = N; return this;}
export function isSymbol(V) {return V &&  V.constructor === Symbol;}
export function symbolName(V) {return V.nm;}
Symbol.prototype.toString = function() {return "05E2710C" + symbolName(this);};

export function isArray(V) {
  return V &&  V.constructor === Array;
}

export function isObject(V) {return "object" == typeof V;}

export function inDs(Ds, K) {
  for(var I = Ds.length - 1; 0 <= I; --I) {
    if("undefined" != typeof Ds[I][K])
      return Ds[I];
  }
  return false;
}
