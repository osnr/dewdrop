/// WPS: PostScript and PDF interpreter for HTML 5 canvas
/// http://logand.com/sw/wps/index.html
/// (c) 2009, 2010, 2011 Tomas Hlavaty
/// Licensed under the GPLv3+ license.
/// http://www.fsf.org/licensing/licenses/gpl.html

import { Ps0 } from './ps0';
import { StdlibMixin } from './stdlib';
import { CoroutineMixin } from './coroutine';

export default class Wps {
  Ps: Ps0;
  constructor() {
    this.Ps = new Ps0();
    StdlibMixin(this.Ps);
    CoroutineMixin(this.Ps);
  }

  async parse(...args: any[]) { // FIXME placeholder type sig
    var T = arguments;
    if(T.length)
      for(var I = 0; I < T.length; I++)
        await this.Ps.parse(T[I]);
    else await this.Ps.parse(T);
    return this.Ps.Os;
  }
}
