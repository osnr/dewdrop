import { run } from '../lib';
import * as assert from 'assert';

describe('Basic interpreter tests', function() {
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
});
