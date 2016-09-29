import { Ps0 } from './ps0';
import { Symbol } from './util';

export function CoroutineMixin(Ps: Ps0) {
  var Sd = {};
  Ps.Ds.push(Sd);

  function def(Nm, Fn) {Sd[new Symbol(Nm)] = Fn;}

  def("fork", async function() {
    const fn = this.Os.pop();
    this.Os.push(await Ps.fork(fn));
  });

  def("createevent", function() {
    this.Os.push({});
    // do we need anything else?
    console.log('createevent');
  });

  def("sendevent", async function() {
    const event = this.Os.pop();

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
  });

  def("waitprocess", async function() {
    const proc = this.Os.pop();
    console.log('will await proc', proc.idx);
    while (Ps0.suspended.has(proc)) {
      console.log('awaiting: suspended has proc');
      await this.suspendFor(proc);
      console.log('returned from suspension');
    }
    this.Os.push(proc.Os.pop());
  });
  def("killprocess", function() {
    console.log('killprocess');
    Ps0.suspended.delete(this.Os.pop());
  });

  // Listener process tools.
  def("expressinterest", function() {
    const filter = this.Os.pop();
    this.hasInterestIn = (event) => {
      for (const key in filter) {
        if (filter[key].nm !== event[key].nm) return false;
      }
      return true;
    };
    console.log('expressed interest via expressinterest');
  });

  def("awaitevent", async function() {
    console.log('awaitevent');
    await this.awaitEvent();
  });
}
