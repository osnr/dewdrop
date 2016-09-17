import { run } from '../lib';
import * as assert from 'assert';

describe.only('Basic interpreter tests', function() {
  it('14 literal', async function() {
    assert.deepEqual(await run('14'), [14]);
  });
  it('(hello world) 7', async function() {
    assert.deepEqual(await run('(hello world) 7'), ['hello world', 7]);
  });
  it('2 3 +', async function() {
    assert.deepEqual(await run('2 3 +'), [5]);
  });
});
