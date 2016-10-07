import Dewdrop from '../lib/index';

declare var require: any;

describe('Examples', function() {
  function runExamples(req: any) {
    req.keys().forEach(runExample.bind(this, req));
  }
  function runExample(req: any, examplePath: string) {
    const example = req(examplePath);
    it(examplePath, async function() {
      // Hack so graphical output shows inline in test report.
      const uls = document.getElementsByTagName('ul');
      const canvas = document.createElement('canvas');
      canvas.width = 300;
      canvas.height = 300;
      canvas.style.background = 'whitesmoke';
      uls[uls.length - 1].appendChild(canvas);

      const dewdrop = await Dewdrop(canvas);
      await dewdrop.parse(example);
    });
  }

  describe('from original WPS', function() {
    runExamples(require.context('../examples/wps', true, /\.ps$/));
  });

  describe('from NeWS', function() {
    runExamples(require.context('../examples/news', true, /\.ps$/));
  });
});
