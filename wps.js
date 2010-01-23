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
   if(!S) S = [];

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

   function code() {
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
      switch(peek()) {
         case false: return undefined;
         case "%": return comment();
         case "[": return xchar();
         case "]": return xchar();
         case "{": return code();
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

function wps(E, W, H, T) {
   var S = [];
   var F = {};
   var C = E.getContext("2d");

   E.setAttribute("width", W);
   E.setAttribute("height", H);

   function min(X, Y) {
      return X < Y ? X : Y;
   }
   function max(X, Y) {
      return X < Y ? Y : X;
   }

   // basic operators

   F["true"] = function() {S.push(true);};
   F["false"] = function() {S.push(false);};
   F["null"] = function() {S.push(null);};

   F["neg"] = function() {S.push(- S.pop());};
   F["add"] = function() {S.push(S.pop() + S.pop());};
   F["sub"] = function() {F["neg"](); F["add"]();};
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
   F["clear"] = function() {S = [];};
   F["pop"] = function() {S.pop();};
   // TODO roll

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

   // html5 graphic operators

   //transform
   //setTransform
   //createLinearGradient
   //createRadialGradient
   //createPatternI
   //createPatternC
   //createPatternV
   F["clearRect"] = function() {
      var H = S.pop();
      var W = S.pop();
      var Y = S.pop();
      var X = S.pop();
      C.clearRect(X, Y, W, H);
   };
   F["fillRect"] = function() {
      var H = S.pop();
      var W = S.pop();
      var Y = S.pop();
      var X = S.pop();
      C.fillRect(X, Y, W, H);
   };
   F["strokeRect"] = function() {
      var H = S.pop();
      var W = S.pop();
      var Y = S.pop();
      var X = S.pop();
      C.strokeRect(X, Y, W, H);
   };
   //quadraticCurveTo
   F["rect"] = function() {
      var H = S.pop();
      var W = S.pop();
      var Y = S.pop();
      var X = S.pop();
      C.strokeRect(X, Y, W, H);
   };
   //isPointInPath
   //fillText
   //strokeText
   //measureText
   //drawImageI1
   //drawImageI2
   //drawImageC1
   //drawImageC2
   //drawImageV1
   //drawImageV2
   //createImageData1
   //createImageData2
   //getImageData
   //putImageData

   // html5 utility operators

   F["gput"] = function() {
      var K = S.pop();
      var V = S.pop();
      C[K.substring(1)] = isPdfT(V) ? V.V : V;
   };
   F["gget"] = function() {
      var K = S.pop();
      S.push(C[K.substring(1)]);
   };

   F["rgb"] = function() {
      var B = S.pop();
      var G = S.pop();
      var R = S.pop();
      S.push(new PdfT("rgba(" + R + "," + G + "," + B + ")"));
   };
   F["rgba"] = function() {
      var A = S.pop();
      var B = S.pop();
      var G = S.pop();
      var R = S.pop();
      S.push(new PdfT("rgba(" + R + "," + G + "," + B + "," + A + ")"));
   };

   // ps graphic operators

   F["gsave"] = function() {C.save();};
   F["grestore"] = function() {C.restore();};
   F["scale"] = function() {
      var Y = S.pop();
      var X = S.pop();
      C.scale(X, Y);
   };
   F["rotate"] = function() {
      var A = S.pop();
      C.rotate(A);
   };
   F["translate"] = function() {
      var Y = S.pop();
      var X = S.pop();
      C.translate(X, Y);
   };
   F["newpath"] = function() {C.beginPath();};
   F["closepath"] = function() {C.closePath();};
   F["moveto"] = function() {
      var Y = S.pop();
      var X = S.pop();
      C.moveTo(X, Y);
   };
   F["lineto"] = function() {
      var Y = S.pop();
      var X = S.pop();
      C.lineTo(X, Y);
   };
   F["arcto"] = function() {
      var R = S.pop();
      var Y2 = S.pop();
      var X2 = S.pop();
      var Y1 = S.pop();
      var X1 = S.pop();
      C.arcTo(X1, Y1, X2, Y2, R);
   };
   F["arc"] = function() {
      var A = S.pop();
      var E = S.pop();
      var B = S.pop();
      var R = S.pop();
      var Y = S.pop();
      var X = S.pop();
      C.arc(X, Y, R, B, E, A);
   };
   F["fill"] = function() {C.fill();};
   F["stroke"] = function() {C.stroke();};
   F["clip"] = function() {C.clip();};
   F["setgray"] = function() {
      var G = S.pop();
      C.fillStyle = "rgb(" + G * 255 + "," + G * 255 + "," + G * 255 + ")";
   };

   // TODO eps operators

   F["save"] = function() {S.push(true);};
   F["restore"] = function() {S.push(true);};
   F["bind"] = function() {};
   F["dict"] = function() {};
   F["load"] = function() {};
   F["begin"] = function() {};
   F["end"] = function() {};
   F["where"] = function() {};
   F["currentflat"] = function() {};
   F["setflat"] = function() {};
   F["_"] = function() {};
   F["clippath"] = function() {};

   // pdf graphic operators

   F["w"] = function() {C.lineWidth = S.pop();};
   F["J"] = function() {C.lineCap = S.pop();};
   F["j"] = function() {C.lineJoin = S.pop();};
   F["M"] = function() {C.mitterLimit = S.pop();};
   F["d"] = function() {
      var P = S.pop();
      var A = S.pop();
      alert("TODO d");
   };
   F["ri"] = function() {alert("TODO ri");};
   F["i"] = function() {alert("TODO i");};
   F["gs"] = function() {alert("TODO gs");};

   F["q"] = function() {C.save();};
   F["Q"] = function() {C.restore();};
   F["cm"] = function() { // TODO fix cm
      var Dy = S.pop();
      var Dx = S.pop();
      var M22 = S.pop();
      var M21 = S.pop();
      var M12 = S.pop();
      var M11 = S.pop();
      //alert(M11 +"|"+ M12 +"|"+ M21 +"|"+ M22 +"|"+ Dx +"|"+ Dy);
      //C.setTransform(M11, M12, M21, M22, Dx, Dy);
      C.transform(M11, M12, M21, M22, Dx, Dy);
   };

   F["m"] = function() {
      var Y = S.pop();
      var X = S.pop();
      C.beginPath(); // TODO only if not m previously
      C.moveTo(X, Y);
   };
   F["l"] = function() {
      var Y = S.pop();
      var X = S.pop();
      C.lineTo(X, Y);
   };
   F["c"] = function() {
      var Y3 = S.pop();
      var X3 = S.pop();
      var Y2 = S.pop();
      var X2 = S.pop();
      var Y1 = S.pop();
      var X1 = S.pop();
      C.bezierCurveTo(X1, Y1, X2, Y2, X3, Y3); // TODO the right c method
   };
//   F["c2"] = function() { // not in pdf
//      var Y3 = S.pop();
//      var X3 = S.pop();
//      var Y2 = S.pop();
//      var X2 = S.pop();
//      var Y1 = S.pop();
//      var X1 = S.pop();
//      C.bezierCurveTo(X1, Y1, X2, Y2, X3, Y3); // TODO the right c method
//   };
   F["v"] = function() {alert("TODO v");};
   F["y"] = function() {alert("TODO y");};
   F["h"] = function() {C.closePath();};
   F["re"] = function() {
      var Y2 = S.pop();
      var X2 = S.pop();
      var Y1 = S.pop();
      var X1 = S.pop();
      C.rect(X1, Y1, X2, Y2);
   };

   F["S"] = function() {C.stroke();};
   F["s"] = function() {F["h"](); F["S"]();};
   F["f"] = function() {C.fill();};
   F["F"] = function() {C.fill();};
   F["f*"] = function() {alert("TODO f*");};
   F["B"] = function() {F["f"](); F["S"]();};
   F["B*"] = function() {F["f*"](); F["S"]();};
   F["b"] = function() {F["h"](); F["B"]();};
   F["b*"] = function() {F["h"](); F["B*"]();};
   F["n"] = function() {alert("TODO n");};

   F["W"] = function() {C.clip();};
   F["W*"] = function() {alert("TODO W*");};

   F["BT"] = function() {alert("TODO BT");};
   F["ET"] = function() {alert("TODO ET");};

   F["Tc"] = function() {alert("TODO Tc");};
   F["Tw"] = function() {alert("TODO Tw");};
   F["Tz"] = function() {alert("TODO Tz");};
   F["TL"] = function() {alert("TODO Tf");};
   F["Tf"] = function() {
      var N = S.pop();
      var F = S.pop();
      C.font = N + "pt " + F.V;
   };
   F["Tr"] = function() {alert("TODO Tr");};
   F["Ts"] = function() {alert("TODO Ts");};

   F["Td"] = function() {alert("TODO Td");};
   F["TD"] = function() {alert("TODO TD");};
   F["Tm"] = function() {alert("TODO Tm");};
   F["T*"] = function() {alert("TODO T*");};

   F["Tj"] = function() {
      var T = S.pop();
      //alert(T.V);
      //if(C.strokeText) C.strokeText(T.V, 0, 0);
      if(C.fillText) C.fillText(T.V, 0, 0);
   };
   F["TJ"] = function() {alert("TODO TJ");};
   F["'"] = function() {alert("TODO '");};
   F["\""] = function() {alert("TODO \"");};

   F["d0"] = function() {alert("TODO d0");};
   F["d1"] = function() {alert("TODO d1");};

   F["CS"] = function() {alert("TODO CS");};
   F["cs"] = function() {alert("TODO cs");};
   F["SC"] = function() {alert("TODO SC");};
   F["SCN"] = function() {alert("TODO SCN");};
   F["sc"] = function() {alert("TODO sc");};
   F["scn"] = function() {alert("TODO scn");};
   F["G"] = function() {alert("TODO G");};
   F["g"] = function() {alert("TODO g");};
   F["RG"] = function() {alert("TODO RG");};
   F["rg"] = function() { // TODO color spaces
      var B = S.pop();
      var G = S.pop();
      var R = S.pop();
      C.fillStyle = "rgb(" + R + "," + G + "," + B + ")";
   };
   F["K"] = function() {alert("TODO K");};
   F["k"] = function() {alert("TODO k");};

   F["sh"] = function() {alert("TODO sh");};

   F["BI"] = function() {alert("TODO BI");};
   F["ID"] = function() {alert("TODO ID");};
   F["EI"] = function() {alert("TODO EI");};

   F["Do"] = function() {alert("TODO Do");};

   F["MP"] = function() {alert("TODO MP");};
   F["DP"] = function() {alert("TODO DP");};
   F["BMC"] = function() {alert("TODO BMC");};
   F["BDC"] = function() {alert("TODO BDC");};
   F["EMC"] = function() {alert("TODO EMC");};

   F["BX"] = function() {alert("TODO BX");};
   F["EX"] = function() {alert("TODO EX");};

  if(T.length)
    for(var I = 0; I < T.length; I++)
      ps0(T[I], F, S);
  else ps0(T, F, S);
}
