import { run } from '../lib';
import { readdirSync, readFileSync } from 'fs';

describe('Examples', function() {
  it('wps all work', function() {
    const files = readdirSync('examples/wps');
    files.forEach(file => {
      // console.log('parsing', file, readFileSync('examples/wps/' + file, 'utf8'));

      // run(readFileSync('lib/wps.wps', 'utf8'));
      run(readFileSync('examples/wps/' + file, 'utf8'));


      // for reference -- how it's used on http://logand.com/sw/wps:

      // wps.parse("save (xsquares) .setGc", $$("squares"), "restore");
      // wps.parse("save (xfill) .setGc", $$("fill"), "restore");
      // wps.parse("save (xheart) .setGc", $$("heart"), "restore");
    });
  });
});
