import { Symbol, inDs, quote, isSymbol, isArray, isQuoted, symbolName } from './util';

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

// PostScript context for a single coroutine.
export class Ps0 {
  PsP: PsParser;
  constructor(
    public Os = [], // Operand stack
    public Ds = [], // Dictionary stack
    public Es = [] // Execution stack
  ) {
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
    while (this.PsP.peek()) {
      var T = this.PsP.token();
      if (T || T === 0) {
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

  static suspended = new Set();

  static nextIdx = 0;
  idx = Ps0.nextIdx++;

  awaitingEvent = false;
  continuation: Function;

  async suspendFor(next: Ps0) {
    console.log('suspendFor', this.idx, next.idx);
    Ps0.suspended.add(this);
    await new Promise((resolve) => {
      this.continuation = resolve;
      next.continuation();
    });
    Ps0.suspended.delete(this);
    this.continuation = null;
    console.log('awoke', this.idx);
  }

  async suspendForNext() {
    await this.suspendFor(Ps0.suspended.values().next().value);
  }

  async awaitEvent() {
    // Kind of like suspendFor except it yields without a known yieldee
    // and shouldn't be woken up unless a matching event pops up.
    this.awaitingEvent = true;
    await this.suspendForNext();
  }

  async sendEvent(event: any) {
    const fixedSuspended = new Set(Ps0.suspended);
    for (const proc of fixedSuspended) {
      if (proc.hasInterestIn(event)) {
        console.log('interested!', proc.continuation);
        proc.Os.push(event); // FIXME Kind of a hack.. this maybe should be in awaitevent somehow
        await this.suspendFor(proc);
      } else {
        console.log('not interested :(');
      }
    }
    console.log('sent event');
  }

  async fork(fn: Function) {
    const child = new Ps0(this.Os.slice(0), this.Ds.slice(0), []);
    child.continuation = async function() {
      await child.run(fn, true);
      while (0 < child.Es.length)
        await child.step();
      // Child process is done now.
      Ps0.suspended.values().next().value.continuation();
    };
    await this.suspendFor(child);
    return child;
  }
}
