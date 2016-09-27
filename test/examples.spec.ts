import { run, runGraphical, runNews } from '../lib';
import { readdirSync, readFileSync } from 'fs';

describe('Examples', function() {
  describe('from original WPS', function() {
    const files = readdirSync('examples/wps');
    files.forEach(function(file) {
      it(file, function() {
        runGraphical(readFileSync('examples/wps/' + file, 'utf8'));
      });
      // for reference -- how it's used on http://logand.com/sw/wps:

      // wps.parse("save (xsquares) .setGc", $$("squares"), "restore");
      // wps.parse("save (xfill) .setGc", $$("fill"), "restore");
      // wps.parse("save (xheart) .setGc", $$("heart"), "restore");
    });
  });

  describe('from NeWS', function() {
    const files = readdirSync('examples/news');
    files.forEach(function(file) {
      it(file, async function() {
        await runNews(readFileSync('examples/news/' + file, 'utf8'));
      });
      // for reference -- how it's used on http://logand.com/sw/wps:

      // wps.parse("save (xsquares) .setGc", $$("squares"), "restore");
      // wps.parse("save (xfill) .setGc", $$("fill"), "restore");
      // wps.parse("save (xheart) .setGc", $$("heart"), "restore");
    });
  });
});
