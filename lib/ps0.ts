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
        debugger;
        throw new Error("bind error '" + X + "'");
      }
      this.Es.push([false, D[X]]);

    } else if (Z && isArray(X) && isQuoted(X)) { // proc from Es
      if (0 < X.length) {
        var F = X[0];
        var R = quote(X.slice(1));
        if(0 < R.length) {
          this.Es.push([false, R]);
        }
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
    // This field is used for `exit`. TODO: Remove this useless lookup...
    // am I doing it wrong by mutating Es in `exit` instead of checking here?
    var L = C.shift();
    var X = C.pop();
    for(var I = 0; I < C.length; I++) {
      this.Os.push(C[I]);
    }
    await this.run(X, true);
  }

  async parse(L) {
    this.PsP.init(L);
    while (this.PsP.peek()) {
      var T = this.PsP.token();
      if (T || T === 0) {
        this.Os.push(T);
        // If not inside a procedure {} block, then run everything right away.
        // If inside a procedure, then only run the procedure brackets.
        if (this.PsP.D <= 0 ||
             (isSymbol(T) &&
               (member(symbolName(T), "{}") ||
                "<<" == symbolName(T) || ">>" == symbolName(T)))) {
          await this.exec();
          while(0 < this.Es.length) {
            await this.step();
          }
        }
      }
    }
    return this.Os;
  }

  suspended = new Set();
  awaitingEvent = false;

  static nextIdx = 0;
  idx = Ps0.nextIdx++;

  continuation: Function;

  async suspendFor(next: Ps0) {
    // console.log('suspendFor', this.idx, next.idx);
    this.suspended.add(this);

    await new Promise((resolve) => {
      this.continuation = resolve;
      next.continuation();
      // Suspended here.
    });

    // Just woke back up.
    this.suspended.delete(this);
    this.continuation = null;
  }

  async suspendForNext() {
    // Called on generic pause/wait.
    const suspended = Array.from(this.suspended);
    for (const proc of suspended) {
      if (proc.awaitingEvent) continue;
      // Yield to the first process we can find that's not blocked.
      await this.suspendFor(proc);
      return;
    }
  }

  async awaitEvent() {
    this.awaitingEvent = true;
    await this.suspendForNext();
  }

  async sendEvent(event: any, asyncSend: boolean = false) {
    if (new Symbol('TimeStamp') in event) {
      // Note that a future timestamp makes the sendEvent async
      // (so there's no immediate yield.)
      const timeStamp = event[new Symbol('TimeStamp')] * 60000;
      setTimeout(() => {
        delete event[new Symbol('TimeStamp')]; // FIXME: Do this properly.
        this.sendEvent(event, true);
      }, timeStamp - Date.now());
      return;
    }

    // Convert to array so we can compile the loop to ES5,
    // and so that the suspended-list doesn't change while
    // we're iterating through it.
    const suspended = Array.from(this.suspended);
    for (const proc of suspended) {
      // If the proc hasn't expressed any interest, assume it's
      // not interested in anything.
      if (proc.hasInterestIn && proc.awaitingEvent && proc.hasInterestIn(event)) {
        // FIXME: Reaches directly into the other process's state.
        // Kind of a hack.. this maybe should be in awaitevent somehow instead.
        proc.awaitingEvent = false;
        proc.Os.push(event);
        if (!asyncSend) {
          await this.suspendFor(proc);
        }
      }
    }
  }

  async fork(fn: Function) {
    const child = new Ps0(this.Os.slice(0), this.Ds.slice(0), []);
    child.suspended = this.suspended; // Should share same coroutine set.
    child.continuation = async function() {
      await child.run(fn, true);
      while (0 < child.Es.length)
        await child.step();
      // Child process is done now.
      this.suspended.values().next().value.continuation();
    };
    await this.suspendFor(child);
    return child;
  }
}
