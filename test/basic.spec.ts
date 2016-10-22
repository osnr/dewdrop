import Dewdrop from '../lib/index';
import { Symbol, quote } from '../lib/util';

import * as assert from 'assert';

describe('Basic interpreter tests', function() {
  this.timeout(10000);

  async function run(ps: string): Promise<any[]> {
    const dewdrop = await Dewdrop();
    return await dewdrop.parse(ps);
  }
  it('14 literal', async function() {
    assert.deepEqual(await run('14'), [14]);
  });
  it('(hello world) 7', async function() {
    assert.deepEqual(await run('(hello world) 7'), ['hello world', 7]);
  });
  it('2 3 add', async function() {
    assert.deepEqual(await run('2 3 add'), [5]);
  });
  it('survives after fork', async function() {
    assert.deepEqual((await run('{1} fork 12')).pop(), 12);
  });
  it('has fork actually do something', async function() {
    assert.deepEqual(await run('{4 3 add} fork waitprocess'), [7]);
  });
  it('repeats', async function() {
    assert.deepEqual(await run('5 {1} repeat'), [1, 1, 1, 1, 1]);
  });
  it('loops and exits', async function() {
    assert.deepEqual(await run('0 {dup 6 ne {1 add} {exit} ifelse} loop'), [6]);
  });
  it('nested loops and exits', async function() {
    assert.deepEqual(await run('1 10 {{dup 6 mod 0 ne {1 add} {1 add exit} ifelse} loop} repeat'), [61])
  });
  it('known bug', async function() {
    assert.deepEqual(await run('dictbegin /K (V) def dictend /K known'), [true]);
    assert.deepEqual(await run('dictbegin /K (V) def dictend /K2 known'), [false]);
  });
  it('awaits event', async function() {
    assert.deepEqual(await run(`
{
    createevent dup begin
    /Name /Hello def
    end expressinterest
    { awaitevent == } loop
} fork

createevent dup begin
    /Name /Hello def 
    /Action /Mumble def
end sendevent

killprocess
`), []);
  });
  it('executes array inside proc', async function() {
    assert.deepEqual(await run('{[2 3 add]} exec'), [[5]]);
  });
  it('append', async function() {
    assert.deepEqual(await run('[1 2 3] [4 5 6] append'), [[1, 2, 3, 4, 5, 6]]);
    assert.deepEqual(await run(`
dictbegin
  /Name /A def
  /Foo /Bar def
dictend
dictbegin
  /Name /B def
  /Baz /Qux def
dictend
append
dup ==
`), [{
      [new Symbol('Name')]: quote(new Symbol('B')),
      [new Symbol('Foo')]: quote(new Symbol('Bar')),
      [new Symbol('Baz')]: quote(new Symbol('Qux'))
    }]);
  });
  it('passes Densmore OOP test', async function() {
    assert.deepEqual(await run(`
% From Densmore (1986), Appendix B.

/One Object [] classbegin
  /test {1} def
  /result1 {/test self send} def
classend def

/Two One [] classbegin
  /test {2} def
classend def

/ex1 /new One send def
/ex2 /new Two send def

/test ex1 send
/result1 ex1 send
/test ex2 send
/result1 ex2 send

/Three Two [] classbegin
  /result2 {/result1 self send} def
  /result3 {/test super send} def
classend def
/Four Three [] classbegin
  /test {4} def
classend def

/ex3 /new Three send def
/ex4 /new Four send def

/test ex3 send
/result1 ex4 send
/result2 ex3 send
/result2 ex4 send
/result3 ex3 send
/result3 ex4 send
`), [1, 1, 2, 2, 2, 4, 2, 4, 2, 2]);
  });
});
