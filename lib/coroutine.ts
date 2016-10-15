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
    // TODO: Do we need anything else?
  });

  def("sendevent", async function() {
    const event = this.Os.pop();
    await this.sendEvent(event);
  });

  def("waitprocess", async function() {
    const proc = this.Os.pop();
    while (this.suspended.has(proc)) {
      if (proc.awaitingEvent) {
        // FIXME: Hack so we don't wind up in a tight loop
        // w/o being able to yield for event dispatch.
        await new Promise((resolve) => {
          setTimeout(() => resolve(), 100);
        });
      }
      await this.suspendForNext();
    }
    this.Os.push(proc.Os.pop());
  });
  def("killprocess", function() {
    this.suspended.delete(this.Os.pop());
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
  });

  def("awaitevent", async function() {
    await this.awaitEvent();
  });
}
