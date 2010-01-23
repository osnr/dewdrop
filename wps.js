function isQuoted(V) {
  return V.q;
}

function quote(V) {
  V.q = true;
  return V;
}

function unquote(V) {
  delete V.q;
  return V;
}

function Symbol(N) {
  this.nm = N;
  return this;
}

function isSymbol(V) {
  return V &&  V.constructor === Symbol;
}

function symbolName(V) {
  return V.nm;
}

function isArray(V) {
  return V &&  V.constructor === Array;
}

function inDs(Ds, K) {
  for(var I = Ds.length - 1; 0 <= I; --I) {
	if("undefined" != typeof Ds[I][K])
	  return Ds[I];
  }
  return false;
}

function ps0(L, Os, Ds, Es) { // TODO Nd name dict name=>sym?
  var N = L.length;
  var I = 0;

  // TODO white space ffeed + null???
  function member(C, L) {return 0 <= L.indexOf(C);}
  function peek() {return I < N && L[I];}
  function xchar() {return I < N && L[I++];}
  function skip() {while(I < N && member(L[I], " \t\n")) I++;}

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

  var D = 0;

  function token() {
    skip();
    switch(peek()) { // TODO read dict in <> <~~> <<>> immediate literal //
      case false: return undefined;
      case "%": return comment();
      case "[": return new Symbol(xchar());
      case "]": return new Symbol(xchar());
      case "{": D++; return new Symbol(xchar());
      case "}": D--; return new Symbol(xchar());
      case "/": xchar(); var X = symbol(); return quote(X);
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

  //function Xexec() {Es.push([false, Os.pop()]);};

  function run(X, Z) {
    if(isSymbol(X) && !isQuoted(X)) { // executable name
      var K = symbolName(X);
      var D = inDs(Ds, K);
      if(!D) {
        throw "bind error '" + K + "'";
      }
      Es.push([false, D[K]]);
      //if(V !== undefined) Es.push([false, V, Xexec]);
      //else throw "Unknown operator '" + K + "' " + V;
    } else if(Z && isArray(X) && isQuoted(X)) { // proc from Es
      if(0 < X.length) {
        var F = X[0];
        var R = quote(X.slice(1));
        //if(0 < R.length) Es.push([false, R, Xexec]);
        if(0 < R.length) Es.push([false, R]);
        //run(F, true);
        run(F, false);
        //Es.push([false, F]);
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

  function parse() {
    while(peek()) {
      var T = token();
      if(T || T === 0) {
        Os.push(T);
        if(D <= 0 || isSymbol(T) &&
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

  return parse();
}

function wps(E, T) {
  var Os = [];
  var Sd = {};
  var Ds = [Sd];
  var Es = [];

  // trivial
  Sd[".true"] = function() {Os.push(true);};
  Sd[".false"] = function() {Os.push(false);};
  Sd[".null"] = function() {Os.push(null);};

  Sd["cvx"] = function() {
    var X = Os.pop();
    if(isSymbol(X) && isQuoted(X)) Os.push(unquote(X)); // executable name
    else if(isArray(X) && !isQuoted(X)) Os.push(quote(X)); // proc
    // TODO string -> parse
    else Os.push(X);
  };

  // math
  Sd["sub"] = function() {var X = Os.pop(); Os.push(Os.pop() - X);};
  Sd["mul"] = function() {Os.push(Os.pop() * Os.pop());};
  Sd["div"] = function() {var X = Os.pop(); Os.push(Os.pop() / X);};
  Sd["mod"] = function() {var X = Os.pop(); Os.push(Os.pop() % X);};

  // stack and array
  var M = {};
  Sd["mark"] = function() {Os.push(M);};
  Sd["counttomark"] = function() {
    var N = 0;
    for(var I = Os.length - 1; 0 <= I; I--)
      if(M === Os[I]) return Os.push(N);
      else N++;
    throw "Mark not found";
  };
  Sd["<<"] = Sd["mark"];
  Sd[">>"] = function() {
    var D = {};
    while(0 < Os.length) {
      var V = Os.pop();
      if(M === V) return Os.push(D);
      D[Os.pop()] = V;
    }
    throw "Mark not found";
  };

  Sd["exch"] = function() {
    var Y = Os.pop();
    var X = Os.pop();
    Os.push(Y);
    Os.push(X);
  };
  Sd["clear"] = function() {Os.length = 0;};
  Sd["pop"] = function() {Os.pop();};
  Sd["index"] = function() {
    Os.push(Os[Os.length - 2 - Os.pop()]);
  };
  Sd["roll"] = function() { // TODO in ps
    var J = Os.pop();
    var N = Os.pop();
    var X = [];
    var Y = [];
    for(var I = 0; I < N; I++)
      if(I < J) X.unshift(Os.pop());
      else Y.unshift(Os.pop());
    for(I = 0; I < J; I++) Os.push(X.shift());
    for(I = 0; I < N - J; I++) Os.push(Y.shift());
  };
  Sd["copy"] = function() {
	var N = Os.pop();
	if("object" == typeof N) {
	  var X = Os.pop();
	  for(var I in X)
        N[I] = X[I];
      Os.push(N);
    } else {
      var X = Os.length - N;
      for(var I = 0; I < N; I++)
        Os.push(Os[X + I]);
    }
  };

  Sd["length"] = function() {Os.push(Os.pop().length);};
  Sd["astore"] = function() {
    var A = Os.pop();
    var N = A.length;
    for(var I = N - 1; 0 <= I; I--)
      A[I] = Os.pop();
    Os.push(A);
  };

  Sd["eq"] = function() {var Y = Os.pop(); var X = Os.pop(); Os.push(X == Y);};
  Sd["lt"] = function() {var Y = Os.pop(); var X = Os.pop(); Os.push(X < Y);};

  //function Xexec() {Es.push([false, Os.pop()]);};
  //Sd["exec"] = Xexec;
  Sd["exec"] = function() {Es.push([false, Os.pop()]);};

  Sd["ifelse"] = function() {
    var N = Os.pop();
    var P = Os.pop();
    var C = Os.pop();
    Es.push([false, C === true ? P : N]);
  };
  Sd["for"] = function Xfor() { // TODO in ps
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
  };
  Sd["repeat"] = function Xrepeat() { // TODO in ps
    var B = Os.pop();
    var N = Os.pop();
    if(1 < N) Es.push([true, N - 1, B, Xrepeat]);
    if(0 < N) Es.push([false, B]);
  };

  Sd["="] = function() {var X = Os.pop(); alert(X && X.nm || X);};
  Sd["=="] = function() {alert(Os.pop());}; // TODO
  Sd["stack"] = function() {alert(Os);}; // TODO
  Sd["pstack"] = function() {alert(Os);}; // TODO

  Sd["dict"] = function() {Os.pop(); Os.push({});};
  Sd["get"] = function() { // dict key -- any
    var K = Os.pop();
    var D = Os.pop();
    // TODO other datatypes http://www.capcode.de/help/get
    if(isSymbol(K)) Os.push(D[symbolName(K)]);
    else Os.push(D[K]);
  };
  Sd["put"] = function() { // dict key any --
    var V = Os.pop();
    var K = Os.pop();
    var D = Os.pop();
    // TODO other datatypes http://www.capcode.de/help/put
    if(isSymbol(K)) D[symbolName(K)] = V;
    else D[K] = V;
  };
  Sd["begin"] = function() {Ds.push(Os.pop());};
  Sd["end"] = function() {Ds.pop();};
  Sd["currentdict"] = function() {Os.push(Ds[Ds.length - 1]);};
  Sd["where"] = function() {
    var K = symbolName(Os.pop());
    var D = inDs(Ds, K);
	if(D) {
	  Os.push(D);
	  Os.push(true);
	} else Os.push(false);
  };
  Sd["array"] = function() {Os.push(new Array(Os.pop()));};

  Sd["type"] = function() { // any -- name
    var A = Os.pop();
    var X;
    if(null === A) X = "nulltype";
    else if(true === A || false === A) X = "booleantype";
    else if(M === A) X = "marktype";
    else if("string" == typeof A) X = "stringtype";
    else if(isSymbol(A)) X = isQuoted(A) ? "nametype" : "operatortype";
    else if("function" == typeof A) X = "operatortype";
    else if(isArray(A)) X = "arraytype";
    else if("object" == typeof A) X = "dicttype";
    else if(1 * A == A) X = A % 1 == 0 ? "integertype" : "realtype";
    else throw "Undefined type '" + A + "'";
    Os.push(X);
    // filetype
    // packedarraytype (LanguageLevel 2)
    // fonttype
    // gstatetype (LanguageLevel 2)
    // savetype
  };

  Sd["restore"] = function() {Os.pop();}; // TODO
  Sd["save"] = function() {Os.push([]);}; // TODO

  var Sb = true;
  Sd[".strictBind"] = function() {Sb = true === Os.pop();}; // bool --
  Sd["bind"] = function() {Os.push(bind(Os.pop()));};
  function bind(X) {
    if(isSymbol(X) && !isQuoted(X)) {
      var K = symbolName(X);
      var D = inDs(Ds, K);
      if(Sb) {
        if(!D)
          throw "bind error '" + K + "'";
        return bind(D[K]);
      } else return !D ? X : bind(D[K]);
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

//   function bind(X) {
//     if(isSymbol(X) && !isQuoted(X)) {
//       var K = symbolName(X);
//       var D = inDs(Ds, K);
//       return !D ? X : bind(D[K]); // TODO .strictBind ???
// //       if(!D) {
// //         throw "bind error '" + K + "'";
// //       }
// //       return bind(D[K]);
//     } else if(isArray(X) && isQuoted(X)) {
//       var N = X.length;
//       var A = [];
//       for(var I = 0; I < N; I++) {
//         var Xi = X[I];
//         var Xb = bind(Xi);
//         if(isArray(Xi))
//           A = A.concat(isQuoted(Xi) ? quote([Xb]) : [Xb]);
//         else
//           A = A.concat(Xb);
//       }
//       return quote(A);
//     }
//     return X;
//   }
  //////////////////////////////////////////////////////////

  // js ffi operators

  Sd[".call"] = function() { // dict key nargs -- result
    var N = Os.pop();
    var K = Os.pop();
    var D = Os.pop();
    var X = [];
    for(var I = 0; I < N; I++) X.unshift(Os.pop());
    Os.push(D[K].apply(D, X));
  };
  Sd[".math"] = function() { // -- Math
    Os.push(Math);
  };
  Sd[".gc"] = function() { // -- gc
    Os.push(E.getContext("2d"));
  };
  Sd[".date"] = function() { // -- date
    Os.push(new Date());
  };
  Sd[".window"] = function() { // -- window
    Os.push(window);
  };
  Sd[".callback"] = function() { // body -- callback // TODO refactor properly
    var X = Os.pop();
    Os.push(function() { // TODO fix this mess
              //alert(".callback");
              //Es.push([false, X]); // TODO process event in ps0 ???
  function run(X, Z) {
    if(isSymbol(X) && !isQuoted(X)) { // executable name
      var K = symbolName(X);
      var D = inDs(Ds, K);
      if(!D) {
        throw "bind error '" + K + "'";
      }
      Es.push([false, D[K]]);
      //if(V !== undefined) Es.push([false, V, Xexec]);
      //else throw "Unknown operator '" + K + "' " + V;
    } else if(Z && isArray(X) && isQuoted(X)) { // proc from Es
      if(0 < X.length) {
        var F = X[0];
        var R = quote(X.slice(1));
        //if(0 < R.length) Es.push([false, R, Xexec]);
        if(0 < R.length) Es.push([false, R]);
        //run(F, true);
        run(F, false);
        //Es.push([false, F]);
      }
    } else if("function" == typeof X) X(); // operator
    else Os.push(X);
  }
  function step() {
    var C = Es.pop();
    var L = C.shift(); // TODO use for 'exit'
    var X = C.pop();
    for(var I = 0; I < C.length; I++)
      Os.push(C[I]);
    run(X, true);
  }
              run(X, true);
              while(0 < Es.length)
                step();
            });
  };

  /////////////////////////////////////////////////////

  // html5 utility operators

  Sd[".minv"] = function() { // m -- m^-1
    var M = Os.pop();
    var a = M[0]; var b = M[1];
    var d = M[2]; var e = M[3];
    var g = M[4]; var h = M[5];
    Os.push([e, b, d, a, d*h-e*g, b*g-a*h]);
  };
  Sd[".mmul"] = function() { // m1 m2 -- (m1 x m2)
    var B = Os.pop();
    var A = Os.pop();
    var a = A[0]; var b = A[1];
    var d = A[2]; var e = A[3];
    var g = A[4]; var h = A[5];
    var r = B[0]; var s = B[1];
    var u = B[2]; var v = B[3];
    var x = B[4]; var y = B[5];
    Os.push([a*r+b*u, a*s+b*v, d*r+e*u, d*s+e*v, g*r+h*u+x, g*s+h*v+y]);
  };
  Sd[".xy"] = function() { // x y m -- x' y'
    var M = Os.pop();
    var Y = Os.pop();
    var X = Os.pop();
    Os.push(M[0] * X + M[2] * Y + M[4]);
    Os.push(M[1] * X + M[3] * Y + M[5]);
  };

  // TODO js ffi to manipulate strings so the following can be in ps
  Sd[".rgb"] = function() {
    var B = Os.pop();
    var G = Os.pop();
    var R = Os.pop();
    Os.push("rgb(" + R + "," + G + "," + B + ")");
  };
  Sd[".rgba"] = function() {
    var A = Os.pop();
    var B = Os.pop();
    var G = Os.pop();
    var R = Os.pop();
    Os.push("rgba(" + R + "," + G + "," + B + "," + A + ")");
  };

  if(T.length)
    for(var I = 0; I < T.length; I++)
      ps0(T[I], Os, Ds, Es);
  else ps0(T, Os, Ds, Es);
}
