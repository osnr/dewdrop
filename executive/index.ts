import Dewdrop from '../lib/index';
import * as $ from 'jquery';

(window as any).jQuery = $;

import 'jq-console';

(async function() {
  const framebuffer = $('#framebuffer')[0] as HTMLCanvasElement;

  const con = ($('#console')
    .appendTo(document.body)
    .css({
      width: 500,
      height: 300,
      position: 'relative',
      background: 'whitesmoke'
    }) as any)
    .jqconsole('Dewdrop executive\n', '> ', '', false);

  const dewdrop = await Dewdrop(framebuffer, function log(arg) {
    console.log(arg);
    con.Write(arg + '\n');
  });

  (function startPrompt() {
    con.Prompt(true, async function(input) {
      try {
        await dewdrop.parse(input);
      } catch (e) {
        con.Write(e + '\n');
      }
      startPrompt();
    });
  })();
})();
