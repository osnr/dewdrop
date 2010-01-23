function PdfT(V) {
  this.V = V;
  return this;
}

function isPdfT(V) {
  return V.constructor == PdfT; // TODO better test
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
    return new PdfT(L.join(""));
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
    return N ? (F ? parseFloat(L) : parseInt(L, 10)) : L;
  }

  function proc() { // TODO supress evaluation???
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

//   function quoted(T) {
//      return typeof T == "string" && "/" == T.charAt(0);
//   }

  function parse(E) {
    var G = true;
    while(G && peek()) {
      var T = token();
      if(T || T == 0) {
        if(typeof T == "number" || typeof T == "object" || quoted(T))
          S.push(T);
        else {
          if(F[T]) F[T]();
          else throw "Unknown operator '" + T + "' " + typeof T;
          if(E == T) G = false;
        }
      }
    }
    return S;
  }

  return parse();
}

function quoted(T) {
  return typeof T == "string" && "/" == T.charAt(0);
}

function wps(E, T) {
  var S = [];
  var F = {};
  var C = E.getContext("2d");

  F["get"] = function() { // dict key -- any
    var K = S.pop();
    var D = S.pop();
    // TODO other datatypes http://www.capcode.de/help/get
    S.push(D[K.substring(1)]);
  };
  F["put"] = function() { // dict key any --
    var V = S.pop();
    var K = S.pop();
    var D = S.pop();
    // TODO other datatypes http://www.capcode.de/help/put
    D[K.substring(1)] = V;
  };

  F["true"] = function() {S.push(true);};
  F["false"] = function() {S.push(false);};
  F["null"] = function() {S.push(null);};

  F["neg"] = function() {S.push(- S.pop());};
  F["add"] = function() {S.push(S.pop() + S.pop());};
  F["mul"] = function() {S.push(S.pop() * S.pop());};
  F["div"] = function() {
    var X = S.pop();
    S.push(S.pop() / X);
  };
  F["idiv"] = function() {
    var X = S.pop();
    S.push(Math.floor(S.pop() / X));
  };
  F["mod"] = function() {
    var X = S.pop();
    S.push(S.pop() % X);
  };
  // TODO sqrt, exp, ceiling, sin
  F["exch"] = function() {
    var Y = S.pop();
    var X = S.pop();
    S.push(Y);
    S.push(X);
  };

  F["dup"] = function() {var X = S.pop(); S.push(X); S.push(X);};
  F["clear"] = function() {S.length = 0;};
  F["pop"] = function() {S.pop();};
  F["roll"] = function() { // n j --
    var J = S.pop();
    var N = S.pop();
    var X = [];
    var Y = [];
    //alert("roll 1 " + N + " " + J + " " + S);
    for(var I = 0; I < N; I++)
      if(I < J) X.unshift(S.pop());
      else Y.unshift(S.pop());
    for(I = 0; I < J; I++) S.push(X.shift());
    for(I = 0; I < N - J; I++) S.push(Y.shift());
    //alert("roll 2 " + N + " " + J + " " + S);
  };

  F["eq"] = function() {
    var Y = S.pop();
    var X = S.pop();
    S.push(X == Y);
  };
  F["ne"] = function() {
    var Y = S.pop();
    var X = S.pop();
    S.push(X != Y);
  };
  F["gt"] = function() {
    var Y = S.pop();
    var X = S.pop();
    S.push(X > Y);
  };
  F["lt"] = function() {
    var Y = S.pop();
    var X = S.pop();
    S.push(X < Y);
  };
  F["ge"] = function() {
    var Y = S.pop();
    var X = S.pop();
    S.push(X >= Y);
  };
  F["le"] = function() {
    var Y = S.pop();
    var X = S.pop();
    S.push(X <= Y);
  };

  F["if"] = function() {
    var B = S.pop();
    var C = S.pop();
    if(C == true) run(B);
  };
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
  F["=="] = function() {alert(S[0]);};
  F["pstack"] = function() {alert(S);};

   function run(C) {
      if(!C.length) S.push(C);
         else {
            var M = C.length;
            for(var I = 0; I < M; I++) {
               var T = C[I];
               if(typeof T == "number" || typeof T == "object" || quoted(T))
                  S.push(T);
               else {
                  if(F[T]) F[T]();
                  else throw "Unknown operator '" + T + "' " + typeof T;
               }
            }
         }
   }

   F["def"] = function() {
      var C = S.pop();
      var N = S.pop();
      if(quoted(N)) F[N.substring(1)] = function() {run(C);};
      else throw "Wrong operator name " + N + " for " + C;
   };

  // js ffi operators

  F["call"] = function() { // fn nargs -- ...
    var A = S.pop();
    var N = S.pop();
    var X = [];
    for(var I = 0; I < A; I++) {
      // TODO fix PdfT + quoted
      var V = S.pop();
      X.unshift(isPdfT(V) ? V.V : (quoted(V) ? V.substring(1) : V));
    }
    alert("call " + N + " " + A);
    N.apply(this, X);
  };

  F["gc"] = function() { // -- gc
    S.push(C);
  };

  // html5 utility operators

  F["rgb"] = function() {
    var B = S.pop();
    var G = S.pop();
    var R = S.pop();
    S.push(new PdfT("rgb(" + R + "," + G + "," + B + ")"));
  };
  F["rgba"] = function() {
    var A = S.pop();
    var B = S.pop();
    var G = S.pop();
    var R = S.pop();
    S.push(new PdfT("rgba(" + R + "," + G + "," + B + "," + A + ")"));
  };

  if(T.length)
    for(var I = 0; I < T.length; I++)
      ps0(T[I], F, S);
  else ps0(T, F, S);
}
