function Symbol(N) {
  if("/" == N[0]) {
    this.nm = N.substring(1);
    this.q = true;
  } else this.nm = N;
  return this;
}

function isSymbol(V) {
  return V &&  V.constructor == Symbol;
}

function isQuoted(V) {
  return V.q;
}

function symbolName(V) {
  return V.nm;
}

function ps0(L, F, S) {
  var N = L.length;
  var I = 0;

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

  function text() { // TODO hex text in <>
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
    var C = xchar();
    var N = member(C, "+-0123456789.");
    var F = "." == C;
    var L = [C];
    while(peek() && !member(peek(), "%/[]{}<>( \t\n")) {
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

  function proc() {
    xchar();
    var L = [];
    while(peek()) {
      var T = token();
      if("}" == T) break;
      if(T || T == 0) L.push(T);
    }
    return L;
  }

  function token() {
    skip();
    switch(peek()) { // TODO read dict in <<>>
      case false: return undefined;
      case "%": return comment();
      case "[": return xchar();
      case "]": return xchar();
      case "{": return proc();
      case "}": return xchar();
      case "(": return text();
      default: return symbol();
    }
  }

  function parse(E) {
    var G = true;
    while(G && peek()) {
      var T = token();
      if(T || T == 0) {
        if(isSymbol(T) && !isQuoted(T)) {
          var X = symbolName(T);
          if(F[X]) F[X]();
          else throw "Unknown operator '" + X + "'";
          if(E == X) G = false;
        } else S.push(T);
      }
    }
    return S;
  }

  return parse();
}

function wps(E, T) {
  var S = [];
  var F = {};
  var C = E.getContext("2d");

  // trivial
  F["true"] = function() {S.push(true);};
  F["false"] = function() {S.push(false);};
  F["null"] = function() {S.push(null);};

  // math
  F["neg"] = function() {S.push(-1 * S.pop());};
  F["add"] = function() {S.push(S.pop() + S.pop());};
  F["mul"] = function() {S.push(S.pop() * S.pop());};
  F["div"] = function() {var X = S.pop();S.push(S.pop() / X);};
  F["mod"] = function() {var X = S.pop();S.push(S.pop() % X);};

  // stack
  F["exch"] = function() {
    var Y = S.pop();
    var X = S.pop();
    S.push(Y);
    S.push(X);
  };
  F["dup"] = function() {var X = S.pop(); S.push(X); S.push(X);};
  F["clear"] = function() {S.length = 0;};
  F["pop"] = function() {S.pop();};
  F["index"] = function() {S.push(S[S.pop()]);}; // TODO from other end!!!
  F["roll"] = function() {
    var J = S.pop();
    var N = S.pop();
    var X = [];
    var Y = [];
    for(var I = 0; I < N; I++)
      if(I < J) X.unshift(S.pop());
      else Y.unshift(S.pop());
    for(I = 0; I < J; I++) S.push(X.shift());
    for(I = 0; I < N - J; I++) S.push(Y.shift());
  };
  F["copy"] = function() {
    var N = S.pop();
    for(var I = 0; I < N; I++)
      S.push(S[N - 1]); // TODO from other end!!!
  };

  F["eq"] = function() {var Y = S.pop(); var X = S.pop(); S.push(X == Y);};
  F["lt"] = function() {var Y = S.pop(); var X = S.pop(); S.push(X < Y);};

  //F["not"] = function() {var X = S.pop(); S.push(X == undefined || X == false);};
  //F[".nand"] = function() {S.push(F["not"]() || F["not"]());};

  F["ifelse"] = function() {
    var N = S.pop();
    var P = S.pop();
    var C = S.pop();
    if(C == true) run(P);
    else run(N);
  };
  F["repeat"] = function() {
    var B = S.pop();
    var N = S.pop();
    for(var I = 0; I < N; I++) run(B);
  };
  F["for"] = function() {
    var B = S.pop();
    var L = S.pop();
    var K = S.pop();
    var J = S.pop();
    if(K < 0) {
      for(var I = J; L <= I; I += K) {
        S.push(I);
        run(B);
      }
    } else {
      for(var I = J; I <= L; I += K) {
        S.push(I);
        run(B);
      }
    }
  };

  F["."] = function() {alert(S.pop());};
  F["pstack"] = function() {alert(S);};

  function run(C) {
    if(!C.length) S.push(C);
    else {
      var M = C.length;
      for(var I = 0; I < M; I++) {
        var T = C[I];
        if(isSymbol(T) && !isQuoted(T)) {
          var X = symbolName(T);
          if(F[X]) F[X]();
          else throw "Unknown operator '" + X + "'";
        } else S.push(T);
      }
    }
  }

  F["get"] = function() { // dict key -- any
    var K = S.pop();
    var D = S.pop();
    // TODO other datatypes http://www.capcode.de/help/get
    S.push(D[K]);
  };
  F["put"] = function() { // dict key any --
    var V = S.pop();
    var K = S.pop();
    var D = S.pop();
    // TODO other datatypes http://www.capcode.de/help/put
    D[K] = V;
  };

  F["def"] = function() {
    var C = S.pop();
    var N = S.pop();
    if(isSymbol(N) && isQuoted(N)) F[symbolName(N)] = function() {run(C);};
    else throw "Wrong operator name '" + N + "' as '" + typeof N
      + "' for '" + C + "'";
  };

  // js ffi operators

  F[".call"] = function() { // dict key nargs -- result
    var N = S.pop();
    var K = S.pop();
    var D = S.pop();
    var X = [];
    for(var I = 0; I < N; I++) X.unshift(S.pop());
    S.push(D[K].apply(D, X));
  };

  F[".gc"] = function() { // -- gc
    S.push(C);
  };
  F[".math"] = function() { // -- Math
    S.push(Math);
  };

  // html5 utility operators

  // TODO js ffi to manipulate strings so the following can be in ps
  F[".rgb"] = function() {
    var B = S.pop();
    var G = S.pop();
    var R = S.pop();
    S.push("rgb(" + R + "," + G + "," + B + ")");
  };
  F[".rgba"] = function() {
    var A = S.pop();
    var B = S.pop();
    var G = S.pop();
    var R = S.pop();
    S.push("rgba(" + R + "," + G + "," + B + "," + A + ")");
  };

  // "junk" for tiger.eps

  F["save"] = function() {S.push(true);};
  F["restore"] = function() {S.push(true);};
  F["bind"] = function() {};
  F["dict"] = function() {};
  F["load"] = function() {};
  F["begin"] = function() {};
  F["end"] = function() {};

  F["where"] = function() {};
  //F["currentflat"] = function() {S.push(0);};
  //F["setflat"] = function() {};
  //F["clippath"] = function() {};
  F["transform"] = function() {};
  //F["itransform"] = function() {};
  //F["currentpoint"] = function() {S.push(0); S.push(0);};
  F["*"] = function() {};
  //F["showpage"] = function() {};

  if(T.length)
    for(var I = 0; I < T.length; I++)
      ps0(T[I], F, S);
  else ps0(T, F, S);
}
