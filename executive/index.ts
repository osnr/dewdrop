import Dewdrop from '../lib/index';
import * as $ from 'jquery';

(window as any).jQuery = $;

import 'jq-console';

(async function (){
  const framebuffer = document.getElementById('framebuffer') as HTMLCanvasElement;

  const con = ($('<div></div>')
    .appendTo(document.body)
    .css({
      width: 500,
      height: 300,
      position: 'absolute',
      background: 'whitesmoke'
    }) as any)
    .jqconsole('Dewdrop executive\n', '> ', '? ', false);

  const dewdrop = await Dewdrop(framebuffer, function log(arg) {
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
