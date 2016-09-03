import Wps from './interpreter';

import { readFileSync } from 'fs'; // FIXME
const Canvas = require('canvas'); // FIXME

export function run(ps: string) {
  const canvas = new Canvas(200, 200);
  (global as any).window = global;
  (global as any).document = { getElementById: () => canvas };

  const wps = new Wps();
  wps.parse(readFileSync('lib/wps.wps', 'utf8'));
  wps.parse(
    "save (xsquares) .setGc",
    ps,
    "restore"
  );
  console.log(canvas.toDataURL());
}
