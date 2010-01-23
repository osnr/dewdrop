// TODO one run, exec function or name !quoted

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

function ps0(L, Os, Ds) { // TODO Nd name dict name=>sym?
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
    if(member(C, "()<>/% \t\n")) throw "Symbol expected";
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
    switch(peek()) { // TODO read dict in <> <~~> <<>>
      case false: return undefined;
      case "%": return comment();
      case "[": return new Symbol(xchar());
      case "]": return new Symbol(xchar());
      case "{": D++; return new Symbol(xchar());
      case "}": D--; return new Symbol(xchar());
      case "/": xchar(); var X = symbol(); return quote(X);
      case "(": return text();
      default: return symbol();
    }
  }

//   var Es = [];

  function exec() {
    var X = Os.pop();
    if(isSymbol(X) && !isQuoted(X)) { // executable name
      var K = symbolName(X);
      var D = inDs(Ds, K);
      var V = D && D[K];
      if(V) {
        Os.push(V);
        exec();
//         Es.push(V);
//         if("function" == typeof V) V();
//         //else Os.push(V);
//         else run(V);
      } else throw "Unknown operator 1 '" + K + "'";
    } else if(isArray(X) && isQuoted(X)) { // proc
      var M = X.length;
      for(var I = 0; I < M; I++) {
        //Es.push(X[I]);
        Os.push(X[I]);
        exec();
      }
    } else if("function" == typeof X) X(); // operator
    else Os.push(X);
  }

//   function run(T) {
//     if(T || T == 0) {
// //       if(isSymbol(T) && !isQuoted(T)) {
// //         var K = symbolName(T);
// //         var D = inDs(Ds, K);
// //         var V = D && D[K];
// //         if(V) {
// //           if("function" == typeof V) V();
// //           //else Os.push(V);
// //           else run(V);
// //         } else throw "Unknown operator 1 '" + K + "'";
// //       } else Os.push(T);
//     }
//   }

  function parse() {
    while(peek()) {
      var T = token();
      if(T || T == 0) {
        Os.push(T);
        if(D <= 0 || 1 == D && isSymbol(T) && "{" == symbolName(T))
          exec();
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
  Sd["neg"] = function() {Os.push(-1 * Os.pop());};
  Sd["add"] = function() {Os.push(Os.pop() + Os.pop());};
  Sd["mul"] = function() {Os.push(Os.pop() * Os.pop());};
  Sd["div"] = function() {var X = Os.pop(); Os.push(Os.pop() / X);};
  Sd["mod"] = function() {var X = Os.pop(); Os.push(Os.pop() % X);};

  // stack and array
  var M = {};
  Sd["mark"] = function() {Os.push(M);};
  Sd["counttomark"] = function() {
    var N = 0;
    for(var I = Os.length - 1; 0 <= I; I--)
      if(M === Os[I]) return N;
      else N++;
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
  Sd["roll"] = function() {
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
        N[I]=X[i];
    } else {
      var X = Os.length - N;
      for(var I = 0; I < N; I++)
        Os.push(X + I);
    }
  };

  Sd["length"] = function() {Os.push(Os.pop().length);};
  Sd["astore"] = function() {
    var A = Os.pop();
    var N = A.length;
    var X = Os.length - N;
    for(var I = 0; I < N; I++)
      A[I] = Os[X + I];
  };

  Sd["eq"] = function() {var Y = Os.pop(); var X = Os.pop(); Os.push(X == Y);};
  Sd["lt"] = function() {var Y = Os.pop(); var X = Os.pop(); Os.push(X < Y);};

  //Sd["not"] = function() {var X = Os.pop(); Os.push(X == undefined || X == false);};
  //Sd[".nand"] = function() {Os.push(Sd["not"]() || Sd["not"]());};

  Sd["ifelse"] = function() {
    var N = Os.pop();
    var P = Os.pop();
    var C = Os.pop();
    if(C == true) run(P);
    else run(N);
  };
  Sd["for"] = function() {
    var B = Os.pop();
    var L = Os.pop();
    var K = Os.pop();
    var J = Os.pop();
    if(K < 0) {
      for(var I = J; L <= I; I += K) {
        Os.push(I);
        run(B);
      }
    } else {
      for(var I = J; I <= L; I += K) {
        Os.push(I);
        run(B);
      }
    }
  };

  Sd["="] = function() {alert(Os.pop());};
  Sd["=="] = function() {alert(Os.pop());}; // TODO
  Sd["stack"] = function() {alert(Os);}; // TODO
  Sd["pstack"] = function() {alert(Os);}; // TODO

//   function run1(T) {
//     if(T || T == 0) {
//       if(isSymbol(T) && !isQuoted(T)) {
//         var K = symbolName(T);
//         var D = inDs(Ds, K);
//         var V = D && D[K];
//         if(V) {
//           if("function" == typeof V) V();
//           //else Os.push(V);
//           else run(V);
//         } else throw "Unknown operator 1 '" + K + "'";
//       } else Os.push(T);
//     }
//   }

//   function run(C) {
//     if(!C.length) Os.push(C); // TODO run?
//     else {
//       var M = C.length;
//       for(var I = 0; I < M; I++) {
//         var T = C[I];
//         run1(T);
// //         if(isSymbol(T) && !isQuoted(T)) {
// //           var X = symbolName(T);
// //           if(Sd[X]) Sd[X]();
// //           else throw "Missing operator '" + X + "'";
// //         } else Os.push(T);
//       }
//     }
//   }

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
    var K = Os.pop();
    var D = inDs(Ds, K);
	if(D) {
	  Os.push(D);
	  Os.push(true);
	} else Os.push(false);
  };

//   Sd["def"] = function() {
//     var C = Os.pop();
//     var N = Os.pop();
//     if(isSymbol(N) && isQuoted(N)) Sd[symbolName(N)] = function() {run(C);};
//     else throw "Wrong operator name '" + N + "' as '" + typeof N
//       + "' for '" + C + "'";
//   };

  Sd["array"] = function() {Os.push(new Array(Os.pop()));};

  Sd["restore"] = function() {Os.pop();}; // TODO
  Sd["save"] = function() {Os.push([]);}; // TODO

  Sd["bind"] = function() {}; // TODO
  Sd["load"] = function() {}; // TODO

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

  /////////////////////////////////////////////////////

  // html5 utility operators

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
      ps0(T[I], Os, Ds);
  else ps0(T, Os, Ds);
}
