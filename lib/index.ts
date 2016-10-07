/// WPS: PostScript and PDF interpreter for HTML 5 canvas
/// http://logand.com/sw/wps/index.html
/// (c) 2009, 2010, 2011 Tomas Hlavaty
/// Licensed under the GPLv3+ license.
/// http://www.fsf.org/licensing/licenses/gpl.html

import { Ps0 } from './ps0';
import { StdlibMixin } from './corelib';
import { CoroutineMixin } from './coroutine';
import { CanvasMixin } from './canvas';

const wpsLib = require('./stdlib.ps');

interface DewdropInstance {
  Ps: Ps0;
  parse: (...args: any[]) => Promise<any>;
}

export default async function Dewdrop(framebuffer?: HTMLCanvasElement): Promise<DewdropInstance> {
  const dewdrop = {
    Ps: new Ps0(),
    async parse(...args: any[]): Promise<any> { // FIXME placeholder type sig
      var T = arguments;
      if(T.length)
        for(var I = 0; I < T.length; I++)
          await this.Ps.parse(T[I]);
      else await this.Ps.parse(T);
      return this.Ps.Os;
    }
  };

  StdlibMixin(dewdrop.Ps);
  CoroutineMixin(dewdrop.Ps);
  if (framebuffer) {
    // 'NeWS mode'
    // TODO: Have a getElementById-based option.
    CanvasMixin(framebuffer.getContext('2d'), dewdrop.Ps);
  }

  await dewdrop.parse(wpsLib);

  return dewdrop;
}
