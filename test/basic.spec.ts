import Dewdrop from '../lib/index';
import { Symbol, quote } from '../lib/util';

import * as assert from 'assert';

describe('Basic interpreter tests', function() {
  this.timeout(5000);

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
});
