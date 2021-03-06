/// WPS: PostScript and PDF interpreter for HTML 5 canvas
/// http://logand.com/sw/wps/index.html
/// (c) 2009, 2010, 2011 Tomas Hlavaty
/// Licensed under the GPLv3+ license.
/// http://www.fsf.org/licensing/licenses/gpl.html

import { Ps0 } from './ps0';
import { CorelibMixin } from './corelib';
import { CoroutineMixin } from './coroutine';
import { CanvasMixin } from './canvas';

const wpsLib = require('./stdlib.ps');
const oopLib = require('./oop.ps');

interface DewdropInstance {
  Ps: Ps0;
  parse: (...args: any[]) => Promise<any>;
}

export default async function Dewdrop(framebuffer?: HTMLCanvasElement, log?: Function): Promise<DewdropInstance> {
  const dewdrop = {
    Ps: new Ps0(),
    async parse(...args: any[]): Promise<any> { // FIXME placeholder type sig
      if(args.length)
        for(var I = 0; I < args.length; I++)
          await this.Ps.parse(args[I]);
      else await this.Ps.parse(args);
      return this.Ps.Os;
    }
  };

  CorelibMixin(dewdrop.Ps, log);
  CoroutineMixin(dewdrop.Ps);
  if (framebuffer) {
    // 'NeWS mode'
    // TODO: Have a getElementById-based option.
    CanvasMixin(dewdrop.Ps, framebuffer.getContext('2d'));
  }

  await dewdrop.parse(wpsLib);
  await dewdrop.parse(oopLib); // TODO: Only really need this for NeWS.

  return dewdrop;
}
