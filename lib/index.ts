import Dewdrop from './interpreter';

export async function run(ps: string) {
  // Used for basic stack tests.
  const dewdrop = await Dewdrop();
  return await dewdrop.parse(ps);
}

// export function runGraphical(ps: string) {
//   const canvas = new Canvas(200, 200);
//   (global as any).window = global;
//   (global as any).document = { getElementById: () => canvas };
//
//   const wps = new Wps();
//   wps.parse(readFileSync('lib/wps.wps', 'utf8'));
//   return wps.parse(
//     "save",
//     "(xsquares) .setGc",
//     ps,
//     "restore"
//   );
// }

export async function runDewdrop(framebuffer: HTMLCanvasElement, ps: string) {
  const dewdrop = await Dewdrop(framebuffer);
  return await dewdrop.parse(ps);
}
