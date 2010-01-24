// (c) 2009 Tomas Hlavaty

// random markers for quoting and toString generated using picolisp
// (hex (in "/dev/random" (rd 4)))

function isQuoted(V) {return V.D16322F5;}
function quote(V) {V.D16322F5 = true; return V;}
function unquote(V) {delete V.D16322F5; return V;}

function Symbol(N) {this.nm = N; return this;}
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

function PsParser(Ds) {
  var Self = this;
  function init(L) {
    Self.L = L;
    Self.N = L.length;
    Self.I = 0;
    Self.D = 0;
  }
  function peek() {return Self.I < Self.N && Self.L[Self.I];}
  function xchar() {return Self.I < Self.N && Self.L[Self.I++];}
  function skip() { // TODO white space ffeed + null???
    while(Self.I < Self.N && member(Self.L[Self.I], " \t\n"))
      Self.I++;
  }
  function comment() {
    while("%" == peek()) {
      while(peek() && "\n" != peek())
        xchar();
      skip();
    }
  }
  function text() {
    // TODO hex text in <>
    // TODO ASCII base-85 <~ and ~>
    xchar();
    var L = [];
    var N = 1;
    while(0 < N && peek()) {
      var C = xchar();
      switch(C) {
        case "(":
          N++;
          break;
        case ")":
          N--;
          if(N <= 0) C = false;
          break;
        case "\\":
          C = xchar();
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
  function symbol() {
    // TODO 1e10 1E-5 real numbers
    // TODO radix numbers 8#1777 16#FFFE 2#1000
    // TODO if preceeded with / then cannot be number
    var C = xchar();
    if(member(C, "()<>/% \t\n")) throw "Symbol expected, got " + C;
    var N = member(C, "+-0123456789.");
    var F = "." == C;
    var L = [C];
    while(peek() && !member(peek(), "()<>[]{}/% \t\n")) {
      C = xchar();
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
  function token() {
    skip();
    switch(peek()) { // TODO read dict in <> <~~> <<>> immediate literal //
      case false: return undefined;
      case "%": return comment();
      case "[": return new Symbol(xchar());
      case "]": return new Symbol(xchar());
      case "{": Self.D++; return new Symbol(xchar());
      case "}": Self.D--; return new Symbol(xchar());
      case "/":
        xchar();
        if("/" == peek()) {
            xchar();
            var X = symbol();
            return inDs(Ds, X);
        } else {
            var X = symbol();
            return quote(X);
        }
      case "(": return text();
      case "<":
        xchar();
        if("<" != peek()) throw "Encoded strings not implemented yet";
        xchar();
        return new Symbol("<<");
      case ">":
        xchar();
        if(">" != peek()) throw "Unexpected >";
        xchar();
        return new Symbol(">>");
      default: return symbol();
    }
  }
  PsParser.prototype.init = init;
  PsParser.prototype.peek = peek;
  PsParser.prototype.token = token;
  return this;
}

function Ps0(Os, Ds, Es) {
  function run(X, Z) {
    if(isSymbol(X) && !isQuoted(X)) { // executable name
      var D = inDs(Ds, X);
      if(!D)
        throw "bind error '" + X + "'";
      Es.push([false, D[X]]);
    } else if(Z && isArray(X) && isQuoted(X)) { // proc from Es
      if(0 < X.length) {
        var F = X[0];
        var R = quote(X.slice(1));
        if(0 < R.length) Es.push([false, R]);
        run(F, false);
      }
    } else if("function" == typeof X) X(); // operator
    else Os.push(X);
  }
  function exec() {
    var X = Os.pop();
    run(X, false);
  }
  function step() {
    var C = Es.pop();
    var L = C.shift(); // TODO use for 'exit'
    var X = C.pop();
    for(var I = 0; I < C.length; I++)
      Os.push(C[I]);
    run(X, true);
  }
  var PsP = new PsParser(Ds);
  function parse(L) {
    PsP.init(L);
    while(PsP.peek()) {
      var T = PsP.token();
      if(T || T === 0) {
        Os.push(T);
        if(PsP.D <= 0 || isSymbol(T) &&
           (member(symbolName(T), "[]{}") ||
            "<<" == symbolName(T) || ">>" == symbolName(T))) {
          exec();
          while(0 < Es.length)
            step();
        }
      }
    }
    return Os;
  }
  Ps0.prototype.run = run;
  Ps0.prototype.exec = exec;
  Ps0.prototype.step = step;
  Ps0.prototype.parse = parse;
  return this;
}

function Wps() {
  var Os = [];
  var Sd = {};
  var Ds = [Sd];
  var Es = [];
  var Ps = new Ps0(Os, Ds, Es);

  function def(Nm, Fn) {Sd[new Symbol(Nm)] = Fn;}

  // trivial
  def("true", function() {Os.push(true);});
  def("false", function() {Os.push(false);});
  def("null", function() {Os.push(null);});
  // math
  def("sub", function() {var X = Os.pop(); Os.push(Os.pop() - X);});
  def("mul", function() {Os.push(Os.pop() * Os.pop());});
  def("div", function() {var X = Os.pop(); Os.push(Os.pop() / X);});
  def("mod", function() {var X = Os.pop(); Os.push(Os.pop() % X);});
  // stack
  var M = {};
  def("mark", function() {Os.push(M);});
  def("counttomark", function() {
    var N = 0;
    for(var I = Os.length - 1; 0 <= I; I--)
      if(M === Os[I]) return Os.push(N);
      else N++;
    throw "Mark not found";
  });
  def("<<", Sd[new Symbol("mark")]); // TODO doc
  def(">>", function() { // TODO doc
    var D = {};
    while(0 < Os.length) {
      var V = Os.pop();
      if(M === V) return Os.push(D);
      D[Os.pop()] = V;
    }
    throw "Mark not found";
  });
  def("exch", function() {
    var Y = Os.pop();
    var X = Os.pop();
    Os.push(Y);
    Os.push(X);
  });
  def("clear", function() {Os.length = 0;});
  def("pop", function() {Os.pop();});
  def("index", function() {
    Os.push(Os[Os.length - 2 - Os.pop()]);
  });
  def("roll", function() { // TODO in ps
    var J = Os.pop();
    var N = Os.pop();
    var X = [];
    var Y = [];
    for(var I = 0; I < N; I++)
      if(I < J) X.unshift(Os.pop());
      else Y.unshift(Os.pop());
    for(I = 0; I < J; I++) Os.push(X.shift());
    for(I = 0; I < N - J; I++) Os.push(Y.shift());
  });
  def("copy", function() {
	var N = Os.pop();
	if(isObject(N)) {
	  var X = Os.pop();
	  for(var I in X)
        N[I] = X[I];
      Os.push(N);
    } else {
      var X = Os.length - N;
      for(var I = 0; I < N; I++)
        Os.push(Os[X + I]);
    }
  });
  // array
  def("length", function() {Os.push(Os.pop().length);});
  def("astore", function() {
    var A = Os.pop();
    var N = A.length;
    for(var I = N - 1; 0 <= I; I--)
      A[I] = Os.pop();
    Os.push(A);
  });
  def("array", function() {Os.push(new Array(Os.pop()));});
  // conditionals
  def("eq", function() {var Y = Os.pop(); var X = Os.pop(); Os.push(X == Y);});
  def("lt", function() {var Y = Os.pop(); var X = Os.pop(); Os.push(X < Y);});
  // control
  def("ifelse", function() {
    var N = Os.pop();
    var P = Os.pop();
    var C = Os.pop();
    Es.push([false, C === true ? P : N]);
  });
  def("repeat", function Xrepeat() { // TODO in ps
    var B = Os.pop();
    var N = Os.pop();
    if(1 < N) Es.push([true, N - 1, B, Xrepeat]);
    if(0 < N) Es.push([false, B]);
  });
  def("for", function Xfor() { // TODO in ps
    var B = Os.pop();
    var L = Os.pop();
    var K = Os.pop();
    var J = Os.pop();
    if(K < 0) {
      if(L <= J + K) Es.push([true, J + K, K, L, B, Xfor]);
      if(L <= J) Es.push([false, J, B]);
    } else {
      if(J + K <= L) Es.push([true, J + K, K, L, B, Xfor]);
      if(J <= L) Es.push([false, J, B]);
    }
  });
  function XforallA() {
    var B = Os.pop();
    var A = Os.pop();
    var I = Os.pop();
    var N = A.length;
    if(1 < N - I) Es.push([true, I + 1, A, B, XforallA]);
    if(0 < N - I) Es.push([false, A[I], B]);
  }
  function XforallO() {
    var B = Os.pop();
    var O = Os.pop();
    var L = Os.pop();
    var N = L.length;
    var K;
    if(0 < N) K = L.pop();
    if(1 < N) Es.push([true, L, O, B, XforallO]);
    if(0 < N) Es.push([false, K, O[K], B]);
  }
  def("forall", function() { // TODO in ps
    var B = Os.pop();
    var O = Os.pop();
    if(isArray(O)) {
      Os.push(0);
      Os.push(O);
      Os.push(B);
      XforallA();
    } else if(isObject(O)) {
      var L = [];
      for(var K in O) {L.push(K);}
      Os.push(L);
      Os.push(O);
      Os.push(B);
      XforallO();
    } else if("string" == typeof O) {
      Os.push(0);
      Os.push(O.split(""));
      Os.push(B);
      XforallA();
    } else throw "Cannot apply forall to " + O;
  });
  def("exec", function() {Es.push([false, Os.pop()]);});
  def("cvx", function() {
    var X = Os.pop();
    if(isSymbol(X) && isQuoted(X)) Os.push(unquote(X)); // executable name
    else if(isArray(X) && !isQuoted(X)) Os.push(quote(X)); // proc
    // TODO string -> parse
    else Os.push(X);
  });
  def("cvlit", function() {
    var X = Os.pop();
    if(isSymbol(X) && !isQuoted(X)) Os.push(quote(X)); // un-executable name
    else if(isArray(X) && isQuoted(X)) Os.push(unquote(X)); // un-proc
    // TODO reverse? string -> parse
    else Os.push(X);
  });
  // dictionary
  def("dict", function() {Os.pop(); Os.push({});});
  def("get", function() {
    var K = Os.pop();
    var D = Os.pop();
    // TODO other datatypes
    if(isSymbol(K)) Os.push(D[K]);
    else Os.push(D[K]);
  });
  def("put", function() {
    var V = Os.pop();
    var K = Os.pop();
    var D = Os.pop();
    // TODO other datatypes
    if(isSymbol(K)) D[K] = V;
    else D[K] = V;
  });
  def("begin", function() {Ds.push(Os.pop());});
  def("end", function() {Ds.pop();});
  def("currentdict", function() {Os.push(Ds[Ds.length - 1]);});
  def("where", function() {
    var K = Os.pop();
    var D = inDs(Ds, K);
	if(D) {
	  Os.push(D);
	  Os.push(true);
	} else Os.push(false);
  });
  // miscellaneous
  def("save", function() {
    var X = Ds.slice();
    for(var I = 0; I < X.length; I++) {
      var A = X[I];
      var B = {};
      for(var J in A)
        B[J] = A[J];
      X[I] = B;
    }
    Os.push(X);
  });
  def("restore", function() {
    var X = Os.pop();
    while(0 < Ds.length)
      Ds.pop();
    while(0 < X.length)
      Ds.unshift(X.pop());
  });
  def("type", function() {
    var A = Os.pop();
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
    Os.push(X);
    // filetype
    // packedarraytype (LanguageLevel 2)
    // fonttype
    // gstatetype (LanguageLevel 2)
    // savetype
  });
  var Sb = true;
  def(".strictBind", function() {Sb = true === Os.pop();});
  def("bind", function() {Os.push(bind(Os.pop()));});
  function bind(X) {
    if(isSymbol(X) && !isQuoted(X)) {
      var D = inDs(Ds, X);
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
  // debugging
  def("=", function() {var X = Os.pop(); alert(X);}); // TODO
  def("==", function() {alert(Os.pop());}); // TODO
  def("stack", function() {alert(Os);}); // TODO
  def("pstack", function() {alert(Os);}); // TODO
  // js ffi
  def(".call", function() {
    var N = Os.pop();
    var K = Os.pop();
    var D = Os.pop();
    var X = [];
    for(var I = 0; I < N; I++) X.unshift(Os.pop());
    Os.push(D[K].apply(D, X));
  });
  def(".math", function() {Os.push(Math);});
  def(".date", function() {Os.push(new Date());}); // TODO split new and Date
  def(".window", function() {Os.push(window);});
  def(".callback", function() { // TODO event arg?
    var X = Os.pop();
    Os.push(function() {
              Ps.run(X, true);
              while(0 < Es.length)
                Ps.step();
            });
  });
  // html5
  def(".minv", function() { // TODO in ps
    var M = Os.pop();
    var a = M[0]; var b = M[1];
    var d = M[2]; var e = M[3];
    var g = M[4]; var h = M[5];
    Os.push([e, b, d, a, d*h-e*g, b*g-a*h]);
  });
  def(".mmul", function() { // TODO in ps
    var B = Os.pop();
    var A = Os.pop();
    var a = A[0]; var b = A[1];
    var d = A[2]; var e = A[3];
    var g = A[4]; var h = A[5];
    var r = B[0]; var s = B[1];
    var u = B[2]; var v = B[3];
    var x = B[4]; var y = B[5];
    Os.push([a*r+b*u, a*s+b*v, d*r+e*u, d*s+e*v, g*r+h*u+x, g*s+h*v+y]);
  });
  def(".xy", function() { // TODO in ps
    var M = Os.pop();
    var Y = Os.pop();
    var X = Os.pop();
    Os.push(M[0] * X + M[2] * Y + M[4]);
    Os.push(M[1] * X + M[3] * Y + M[5]);
  });
  // TODO js ffi to manipulate strings so the following can be in ps
  def(".rgb", function() { // TODO in ps
    var B = Os.pop();
    var G = Os.pop();
    var R = Os.pop();
    Os.push("rgb(" + R + "," + G + "," + B + ")");
  });
  def(".rgba", function() { // TODO in ps
    var A = Os.pop();
    var B = Os.pop();
    var G = Os.pop();
    var R = Os.pop();
    Os.push("rgba(" + R + "," + G + "," + B + "," + A + ")");
  });

  function parse() {
    var T = arguments;
    if(T.length)
      for(var I = 0; I < T.length; I++)
        Ps.parse(T[I]);
    else Ps.parse(T);
    return Os;
  }
  Wps.prototype.parse = parse;
  return this;
}
