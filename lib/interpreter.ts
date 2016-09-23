/// WPS: PostScript and PDF interpreter for HTML 5 canvas
/// http://logand.com/sw/wps/index.html
/// (c) 2009, 2010, 2011 Tomas Hlavaty
/// Licensed under the GPLv3+ license.
/// http://www.fsf.org/licensing/licenses/gpl.html

// random markers for quoting and toString generated using picolisp
// (hex (in "/dev/random" (rd 4)))

function isQuoted(V) {return V.D16322F5;}
function quote(V) {V.D16322F5 = true; return V;}
function unquote(V) {delete V.D16322F5; return V;}

function Symbol(N): void {this.nm = N; return this;}
function isSymbol(V) {return V &&  V.constructor === Symbol;}
function symbolName(V) {return V.nm;}
Symbol.prototype.toString = function() {return "05E2710C" + symbolName(this);};

function isArray(V) {
  return V &&  V.constructor === Array;
}

function isObject(V) {return "object" == typeof V;}

function inDs(Ds, K) {
  for(var I = Ds.length - 1; 0 <= I; --I) {
	if("undefined" != typeof Ds[I][K])
	  return Ds[I];
  }
  return false;
}

function member(C, L) {
  return 0 <= L.indexOf(C);
}

class PsParser {
  constructor(public Ds: any[]) {}

  L: any;
  N: number;
  I: number;
  D: number;
  init(L: any) {
    this.L = L;
    this.N = L.length;
    this.I = 0;
    this.D = 0;
  }

  peek() {return this.I < this.N && this.L[this.I];}
  xchar() {return this.I < this.N && this.L[this.I++];}
  skip() { // TODO white space ffeed + null???
    while(this.I < this.N && member(this.L[this.I], " \t\n"))
      this.I++;
  }
  comment() {
    while("%" == this.peek()) {
      while(this.peek() && "\n" != this.peek())
        this.xchar();
      this.skip();
    }
  }
  text() {
    // TODO hex text in <>
    // TODO ASCII base-85 <~ and ~>
    this.xchar();
    var L = [];
    var N = 1;
    while(0 < N && this.peek()) {
      var C = this.xchar();
      switch(C) {
        case "(":
          N++;
          break;
        case ")":
          N--;
          if(N <= 0) C = false;
          break;
        case "\\":
          C = this.xchar();
          switch(C) {
            case "(": break;
            case ")": break;
            case "\\": break;
            case "n": C = "\n"; break;
            case "r": C = "\r"; break;
            case "t": C = "\t"; break;
            // TODO \n (ignore \n) \b \f \ddd octal
            default:
              C = false;
          }
          break;
      }
      if(C !== false) L.push(C);
    }
    return L.join("");
  }
  symbol() {
    // TODO 1e10 1E-5 real numbers
    // TODO radix numbers 8#1777 16#FFFE 2#1000
    // TODO if preceeded with / then cannot be number
    var C = this.xchar();
    if(member(C, "()<>/% \t\n")) throw "Symbol expected, got " + C;
    var N = member(C, "+-0123456789.");
    var F = "." == C;
    var L: any = [C];
    while(this.peek() && !member(this.peek(), "()<>[]{}/% \t\n")) {
      C = this.xchar();
      L.push(C);
      if(N && !member(C, "0123456789")) {
        if(!F && "." == C) F = true;
        else N = false;
      }
    }
    L = L.join("");
    if(1 == L.length && member(L, "+-.")) N = false;
    return N ? (F ? parseFloat(L) : parseInt(L, 10)) : new Symbol(L);
  }
  token() {
    this.skip();
    switch(this.peek()) { // TODO read dict in <> <~~>
      case false: return undefined;
      case "%": return this.comment();
      case "[": return new Symbol(this.xchar());
      case "]": return new Symbol(this.xchar());
      case "{": this.D++; return new Symbol(this.xchar());
      case "}": this.D--; return new Symbol(this.xchar());
      case "/":
        this.xchar();
        if("/" == this.peek()) {
            this.xchar();
            var X = this.symbol();
            return inDs(this.Ds, X);
        } else {
            var X = this.symbol();
            return quote(X);
        }
      case "(": return this.text();
      case "<":
        this.xchar();
        if("<" != this.peek()) throw "Encoded strings not implemented yet";
        this.xchar();
        return new Symbol("<<");
      case ">":
        this.xchar();
        if(">" != this.peek()) throw "Unexpected >";
        this.xchar();
        return new Symbol(">>");
      default: return this.symbol();
    }
  }
}

// Context for a coroutine.
class Ps0 {
  PsP: PsParser;
  constructor(public Os = [], public Ds = [], public Es = []) {
    console.log('new Ps0', Os.length, Ds.length, Es.length);
    this.PsP = new PsParser(this.Ds);
  }

  async run(X, Z) {
    if (isSymbol(X) && !isQuoted(X)) { // executable name
      var D = inDs(this.Ds, X);
      if(!D) {
        throw new Error("bind error '" + X + "'");
      }
      this.Es.push([false, D[X]]);

    } else if (Z && isArray(X) && isQuoted(X)) { // proc from Es
      if(0 < X.length) {
        var F = X[0];
        var R = quote(X.slice(1));
        if(0 < R.length) this.Es.push([false, R]);
        await this.run(F, false);
      }

    } else if ("function" == typeof X) { // operator
      await X.call(this);

    } else {
      this.Os.push(X);
    }
  }

  async exec() {
    var X = this.Os.pop();
    await this.run(X, false);
  }

  async step() {
    var C = this.Es.pop();
    var L = C.shift(); // TODO use for 'exit'
    var X = C.pop();
    for(var I = 0; I < C.length; I++)
      this.Os.push(C[I]);
    await this.run(X, true);
  }

  async parse(L) {
    this.PsP.init(L);
    while(this.PsP.peek()) {
      var T = this.PsP.token();
      if(T || T === 0) {
        this.Os.push(T);
        if(this.PsP.D <= 0 || isSymbol(T) &&
           (member(symbolName(T), "[]{}") ||
            "<<" == symbolName(T) || ">>" == symbolName(T))) {
          await this.exec();
          while(0 < this.Es.length)
            await this.step();
        }
      }
    }
    return this.Os;
  }

  fork() {
    return new Ps0(this.Os.slice(0), this.Ds.slice(0), []);
  }
}

function WpsMixin(Ps: Ps0) {
  var Sd = {};
  Ps.Ds.push(Sd);

  function def(Nm, Fn) {Sd[new Symbol(Nm)] = Fn;}

  // Question: how can I rebind Os in the forked environment to the
  // cloned Os? they're all bound lexically here, and the function
  // refs are preserved when I duplicate the symbol dictionary..

  // FIXME make this.Ps instead of Ps. ALL context must be dynamically
  // bound so it can be rewritten on the fork.
  // this will fix the issue where literals like 3, 5, etc are not pushed onto the forkee stack properly.
  // I think the massive printout is actually just the child process object? that might not be such a big deal

  // trivial
  def("true", function() {this.Os.push(true);});
  def("false", function() {this.Os.push(false);});
  def("null", function() {this.Os.push(null);});
  // math
  def("sub", function() {var X = this.Os.pop(); this.Os.push(this.Os.pop() - X);});
  def("mul", function() {this.Os.push(this.Os.pop() * this.Os.pop());});
  def("div", function() {var X = this.Os.pop(); this.Os.push(this.Os.pop() / X);});
  def("mod", function() {var X = this.Os.pop(); this.Os.push(this.Os.pop() % X);});
  // stack
  var M = {};
  def("mark", function() {this.Os.push(M);});
  def("counttomark", function() {
    var N = 0;
    for(var I = this.Os.length - 1; 0 <= I; I--)
      if(M === this.Os[I]) return this.Os.push(N);
      else N++;
    throw "Mark not found";
  });
  def("<<", Sd[new Symbol("mark")]); // TODO doc
  def(">>", function() { // TODO doc
    var D = {};
    while(0 < this.Os.length) {
      var V = this.Os.pop();
      if(M === V) return this.Os.push(D);
      D[this.Os.pop()] = V;
    }
    throw "Mark not found";
  });
  def("exch", function() {
    var Y = this.Os.pop();
    var X = this.Os.pop();
    this.Os.push(Y);
    this.Os.push(X);
  });
  def("clear", function() {this.Os.length = 0;});
  def("pop", function() {this.Os.pop();});
  def("index", function() {
    this.Os.push(this.Os[this.Os.length - 2 - this.Os.pop()]);
  });
  def("roll", function() { // TODO in ps
    var J = this.Os.pop();
    var N = this.Os.pop();
    var X = [];
    var Y = [];
    for(var I = 0; I < N; I++)
      if(I < J) X.unshift(this.Os.pop());
      else Y.unshift(this.Os.pop());
    for(I = 0; I < J; I++) this.Os.push(X.shift());
    for(I = 0; I < N - J; I++) this.Os.push(Y.shift());
  });
  def("copy", function() {
    var N = this.Os.pop();
    if(isObject(N)) {
      var X = this.Os.pop();
      for(const I in X)
        N[I] = X[I];
      this.Os.push(N);
    } else {
      var X: any = this.Os.length - N;
      for(var I: any = 0; I < N; I++)
        this.Os.push(this.Os[X + I]);
    }
  });
  // array
  def("length", function() {this.Os.push(this.Os.pop().length);});
  def("astore", function() {
    var A = this.Os.pop();
    var N = A.length;
    for(var I = N - 1; 0 <= I; I--)
      A[I] = this.Os.pop();
    this.Os.push(A);
  });
  def("array", function() {this.Os.push(new Array(this.Os.pop()));});
  // conditionals
  def("eq", function() {var Y = this.Os.pop(); var X = this.Os.pop(); this.Os.push(X == Y);});
  def("lt", function() {var Y = this.Os.pop(); var X = this.Os.pop(); this.Os.push(X < Y);});
  // control
  def("ifelse", function() {
    var N = this.Os.pop();
    var P = this.Os.pop();
    var C = this.Os.pop();
    this.Es.push([false, C === true ? P : N]);
  });
  def("repeat", function Xrepeat() { // TODO in ps
    var B = this.Os.pop();
    var N = this.Os.pop();
    if(1 < N) this.Es.push([true, N - 1, B, Xrepeat]);
    if(0 < N) this.Es.push([false, B]);
  });
  def("for", function Xfor() { // TODO in ps
    var B = this.Os.pop();
    var L = this.Os.pop();
    var K = this.Os.pop();
    var J = this.Os.pop();
    if(K < 0) {
      if(L <= J + K) this.Es.push([true, J + K, K, L, B, Xfor]);
      if(L <= J) this.Es.push([false, J, B]);
    } else {
      if(J + K <= L) this.Es.push([true, J + K, K, L, B, Xfor]);
      if(J <= L) this.Es.push([false, J, B]);
    }
  });
  function XforallA() {
    var B = this.Os.pop();
    var A = this.Os.pop();
    var I = this.Os.pop();
    var N = A.length;
    if(1 < N - I) this.Es.push([true, I + 1, A, B, XforallA]);
    if(0 < N - I) this.Es.push([false, A[I], B]);
  }
  function XforallO() {
    var B = this.Os.pop();
    var O = this.Os.pop();
    var L = this.Os.pop();
    var N = L.length;
    var K;
    if(0 < N) K = L.pop();
    if(1 < N) this.Es.push([true, L, O, B, XforallO]);
    if(0 < N) this.Es.push([false, K, O[K], B]);
  }
  def("forall", function() { // TODO in ps
    var B = this.Os.pop();
    var O = this.Os.pop();
    if(isArray(O)) {
      this.Os.push(0);
      this.Os.push(O);
      this.Os.push(B);
      XforallA();
    } else if(isObject(O)) {
      var L = [];
      for(var K in O) {L.push(K);}
      this.Os.push(L);
      this.Os.push(O);
      this.Os.push(B);
      XforallO();
    } else if("string" == typeof O) {
      this.Os.push(0);
      this.Os.push(O.split(""));
      this.Os.push(B);
      XforallA();
    } else throw "Cannot apply forall to " + O;
  });
  def("exec", function() {this.Es.push([false, this.Os.pop()]);});
  def("cvx", function() {
    var X = this.Os.pop();
    if(isSymbol(X) && isQuoted(X)) this.Os.push(unquote(X)); // executable name
    else if(isArray(X) && !isQuoted(X)) this.Os.push(quote(X)); // proc
    // TODO string -> parse
    else this.Os.push(X);
  });
  def("cvlit", function() {
    var X = this.Os.pop();
    if(isSymbol(X) && !isQuoted(X)) this.Os.push(quote(X)); // un-executable name
    else if(isArray(X) && isQuoted(X)) this.Os.push(unquote(X)); // un-proc
    // TODO reverse? string -> parse
    else this.Os.push(X);
  });
  // dictionary
  def("dict", function() {this.Os.pop(); this.Os.push({});});
  def("get", function() {
    var K = this.Os.pop();
    var D = this.Os.pop();
    // TODO other datatypes
    if(isSymbol(K)) this.Os.push(D[K]);
    else this.Os.push(D[K]);
  });
  def("put", function() {
    var V = this.Os.pop();
    var K = this.Os.pop();
    var D = this.Os.pop();
    // TODO other datatypes
    if(isSymbol(K)) D[K] = V;
    else D[K] = V;
  });
  def("begin", function() {this.Ds.push(this.Os.pop());});
  def("end", function() {this.Ds.pop();});
  def("currentdict", function() {this.Os.push(this.Ds[this.Ds.length - 1]);});
  def("where", function() {
    var K = this.Os.pop();
    var D = inDs(this.Ds, K);
	if(D) {
	  this.Os.push(D);
	  this.Os.push(true);
	} else this.Os.push(false);
  });
  // miscellaneous
  def("save", function() {
    var X = this.Ds.slice();
    for(var I = 0; I < X.length; I++) {
      var A = X[I];
      var B = {};
      for(var J in A)
        B[J] = A[J];
      X[I] = B;
    }
    this.Os.push(X);
  });
  def("restore", function() {
    var X = this.Os.pop();
    while(0 < this.Ds.length)
      this.Ds.pop();
    while(0 < X.length)
      this.Ds.unshift(X.pop());
  });
  def("type", function() {
    var A = this.Os.pop();
    var X;
    if(null === A) X = "nulltype";
    else if(true === A || false === A) X = "booleantype";
    else if(M === A) X = "marktype";
    else if("string" == typeof A) X = "stringtype";
    else if(isSymbol(A)) X = isQuoted(A) ? "nametype" : "operatortype";
    else if("function" == typeof A) X = "operatortype";
    else if(isArray(A)) X = "arraytype";
    else if(isObject(A)) X = "dicttype";
    else if(1 * A == A) X = A % 1 == 0 ? "integertype" : "realtype";
    else throw "Undefined type '" + A + "'";
    this.Os.push(X);
    // filetype
    // packedarraytype (LanguageLevel 2)
    // fonttype
    // gstatetype (LanguageLevel 2)
    // savetype
  });
  var Sb = true;
  def(".strictBind", function() {Sb = true === this.Os.pop();});
  def("bind", function() {
    const bind = (X) => {
      if(isSymbol(X) && !isQuoted(X)) {
        var D = inDs(this.Ds, X);
        if(Sb) {
          if(!D)
            throw "bind error '" + X + "'";
          return bind(D[X]);
        } else return !D ? X : bind(D[X]);
      } else if(isArray(X) && isQuoted(X)) {
        var N = X.length;
        var A = [];
        for(var I = 0; I < N; I++) {
          var Xi = X[I];
          var Xb = bind(Xi);
          if(isArray(Xi))
            A = A.concat(isQuoted(Xi) ? quote([Xb]) : [Xb]);
          else
            A = A.concat(Xb);
        }
        return quote(A);
      }
      return X;
    }
    this.Os.push(bind(this.Os.pop()));
  });
  // debugging
  def("=", function() {var X = this.Os.pop(); alert(X);}); // TODO
  def("==", function() {console.log(this.Os.pop());}); // TODO
  def("stack", function() {console.log(this.Os);}); // TODO
  def("pstack", function() {console.log(this.Os);}); // TODO
  def("wtf", function() {console.log(this.Os.length);}); // FIXME remove
  // js ffi
  def(".call", function() {
    var N = this.Os.pop();
    var K = this.Os.pop();
    var D = this.Os.pop();
    var X = [];
    for(var I = 0; I < N; I++) X.unshift(this.Os.pop());
    this.Os.push(D[K].apply(D, X));
  });
  def(".math", function() {this.Os.push(Math);});
  def(".date", function() {this.Os.push(new Date());}); // TODO split new and Date
  def(".window", function() {this.Os.push(window);});
  def(".callback", function() { // TODO event arg?
    var X = this.Os.pop();
    this.Os.push(function() {
      Ps.run(X, true);
      while(0 < this.Es.length)
        Ps.step();
    });
  });
  // html5
  def(".minv", function() { // TODO in ps
    var M = this.Os.pop();
    var a = M[0]; var b = M[1];
    var d = M[2]; var e = M[3];
    var g = M[4]; var h = M[5];
    this.Os.push([e, b, d, a, d*h-e*g, b*g-a*h]);
  });
  def(".mmul", function() { // TODO in ps
    var B = this.Os.pop();
    var A = this.Os.pop();
    var a = A[0]; var b = A[1];
    var d = A[2]; var e = A[3];
    var g = A[4]; var h = A[5];
    var r = B[0]; var s = B[1];
    var u = B[2]; var v = B[3];
    var x = B[4]; var y = B[5];
    this.Os.push([a*r+b*u, a*s+b*v, d*r+e*u, d*s+e*v, g*r+h*u+x, g*s+h*v+y]);
  });
  def(".xy", function() { // TODO in ps
    var M = this.Os.pop();
    var Y = this.Os.pop();
    var X = this.Os.pop();
    this.Os.push(M[0] * X + M[2] * Y + M[4]);
    this.Os.push(M[1] * X + M[3] * Y + M[5]);
  });
  // TODO js ffi to manipulate strings so the following can be in ps
  def(".rgb", function() { // TODO in ps
    var B = this.Os.pop();
    var G = this.Os.pop();
    var R = this.Os.pop();
    this.Os.push("rgb(" + R + "," + G + "," + B + ")");
  });
  def(".rgba", function() { // TODO in ps
    var A = this.Os.pop();
    var B = this.Os.pop();
    var G = this.Os.pop();
    var R = this.Os.pop();
    this.Os.push("rgba(" + R + "," + G + "," + B + "," + A + ")");
  });

  // NeWS
  // TODO split out into new file
  const processes = []; // global process list
  def("fork", function() {
    const fn = this.Os.pop();
    const ps = Ps.fork();
    const proc = {
      promise: (async function() {
        await ps.run(fn, true);
        while(0 < ps.Es.length)
          await ps.step();
      })(),
      ps
    };
    this.Os.push(proc);
  });

  def("createevent", function() {
    this.Os.push({});
    // do we need anything else?
    console.log('createevent');
  });

  def("sendevent", function() {
    const event = this.Os.pop();
    // FIXME immediate dispatch to all promises
    console.log(processes.length);
  });

  def("waitprocess", async function() {
    const proc = this.Os.pop();
    await proc.promise;
    this.Os.push(proc.ps.Os.pop());
  });
  def("killprocess", function() {
    this.Os.pop();
  });

  // Listener process tools.
  def("expressinterest", function() {
    const filter = this.Os.pop();
    console.log('express', filter);
  });
  def("awaitevent", function() {
    new Promise(function(resolve, reject) {
      
    });
  });
}
  
export default class Wps {
  Ps: Ps0;
  constructor() {
    this.Ps = new Ps0();
    WpsMixin(this.Ps);
  }

  async parse() {
    var T = arguments;
    if(T.length)
      for(var I = 0; I < T.length; I++)
        await this.Ps.parse(T[I]);
    else await this.Ps.parse(T);
    return this.Ps.Os;
  }
}

