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

  function Xexec() {Es.push([false, Os.pop()]);};

  function run(X, Z) {
    if(isSymbol(X) && !isQuoted(X)) { // executable name
      var K = symbolName(X);
//       if("repeat" == K) {
//         alert("" + inDs(Ds, "def")["setrgbcolor"][1] + "XXX: " + Os + " Z: " + Z);
//       }
      var D = inDs(Ds, K);
      var V = D && D[K];
      if(V || V === 0) Es.push([false, V]);
      else throw "Unknown operator '" + K + "'";
    } else if(Z && isArray(X) && isQuoted(X)) { // proc from Es
      if(0 < X.length) {
        var F = X[0];
        var R = quote(X.slice(1));
        if(0 < R.length) Es.push([false, R, Xexec]);
        //if(isSymbol(X) && !isQuoted(X)) Es.push([false, F]);
        //else Os.push(F);
        //alert(R.map(function(E) {return E.nm;}) + "\n" + F.nm);
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
    for(var I = N - 1; 0 <= I; I--)
      A[I] = Os.pop();
    Os.push(A);
  };

  Sd["eq"] = function() {var Y = Os.pop(); var X = Os.pop(); Os.push(X == Y);};
  Sd["lt"] = function() {var Y = Os.pop(); var X = Os.pop(); Os.push(X < Y);};

  function Xexec() {Es.push([false, Os.pop()]);};

  Sd["exec"] = Xexec;
  Sd["ifelse"] = function() {
    var N = Os.pop();
    var P = Os.pop();
    var C = Os.pop();
    Es.push([false, C === true ? P : N, Xexec]);
  };
  Sd["for"] = function Xfor() {
    var B = Os.pop();
    var L = Os.pop();
    var K = Os.pop();
    var J = Os.pop();
    if(K < 0) {
      if(L <= J + K) Es.push([true, J + K, K, L, B, Xfor]);
      if(L <= J) Es.push([false, J, B, Xexec]);
    } else {
      if(J + K <= L) Es.push([true, J + K, K, L, B, Xfor]);
      if(J <= L) Es.push([false, J, B, Xexec]);
    }
  };
  Sd["repeat"] = function Xrepeat() {
    var B = Os.pop();
    var N = Os.pop();
    if(1 < N) Es.push([true, N - 1, B, Xrepeat]);
    if(0 < N) Es.push([false, B, Xexec]);
  };

  Sd["="] = function() {var X = Os.pop(); alert(X.nm || X.length || X);};
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

  Sd["restore"] = function() {Os.pop();}; // TODO
  Sd["save"] = function() {Os.push([]);}; // TODO

  Sd["bind"] = function() {}; // TODO

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

  Sd[".xy"] = function() { // x y m -- x' y'
    var M = Os.pop();
    var Y = Os.pop();
    var X = Os.pop();
    Os.push(M[0] * X + M[2] * Y + M[4]);
    Os.push(M[1] * X + M[3] * Y + M[5]);
  };
  Sd["translate"] = function() {
	var A = Os.pop();
	var B = Os.pop();
	if(typeof A == "object") Os.push([1, 0, 0, 1, Os.pop(), B]);
    else {
	  var M = [1, 0, 0, 1, B, A];
	  CTMupdate(M);
	  E.getContext("2d").translate(B, A);
	}
  };
  Sd["rotate"] = function() {
	var A = Os.pop();
	if(typeof A == "object") {
	  var B = opStack.pop();
      Os.push([Math.cos(d2r(B)), Math.sin(d2r(B)),
               -1 * Math.sin(d2r(B)), Math.cos(d2r(B)),
               0, 0]);
	} else {
	  var M = [Math.cos(d2r(A)), Math.sin(d2r(A)),
               -1 * Math.sin(d2r(A)), Math.cos(d2r(A)),
               0, 0];
      CTMupdate(M);
	  //E.getContext("2d").rotate(d2r(A));
	  E.getContext("2d").rotate(A);
	}
  };
  Sd["scale"] = function() {
	var A = Os.pop();
	var B = Os.pop();
	if(typeof A == "object") Os.push([Os.pop(), 0, 0, B, 0, 0]);
    else {
	  var M = [B, 0, 0, A, 0, 0,1];
	  CTMupdate(M);
	  ctx.scale(B, A);
	}
  };
  Sd["transform"] = function() {
	var A = Os.pop();
    Os.push(A);
	if(typeof A != "object")
      Sd[".tm"]();
    Sd[".xy"]();
  };
  Sd["itransform"] = function() {
	var A = Os.pop();
	if(typeof A == "object") Os.push(inverse(A));
    else {
      Os.push(A);
      Sd[".tm"]();
	  var M = Os.pop();
      Os.push(inverse(M));
    }
    Sd[".xy"]();
  };
  Sd["rlineto"] = function() {
	var Y = Os.pop();
	var X = Os.pop();
// 	pathY += yUnderMatrix(offX,offY,CTMdelta);
// 	pathX += xUnderMatrix(offX,offY,CTMdelta);
// 	var iCTMdelta = CTMdelta.inverse();
// 	currentX = xUnderMatrix(pathX,pathY,iCTMdelta);
// 	currentY = yUnderMatrix(pathX,pathY,iCTMdelta);
// 	pathX=currentX;
// 	pathY=currentY;
// 	CTMdelta = CTMident;

 	//ctx.lineTo(X, Y);
  };
  function d2r(A) {
    return Math.PI / 180 * A;
  }
  function CTMupdate(M) {
// 	currentX = xUnderMatrix(currentX,currentY,mat);
// 	currentY = yUnderMatrix(currentX,currentY,mat);
// 		CTMdelta = CTMdelta.timesMatrix(mat);
// 		CTM = CTM.timesMatrix(mat);
  }



  if(T.length)
    for(var I = 0; I < T.length; I++)
      ps0(T[I], Os, Ds, Es);
  else ps0(T, Os, Ds, Es);
}
