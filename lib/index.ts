import Wps from './interpreter';

import { readFileSync } from 'fs'; // FIXME
const Canvas = require('canvas'); // FIXME

export async function run(ps: string) {
  const wps = new Wps();
  await wps.parse(readFileSync('lib/wps.wps', 'utf8'));
  await wps.parse(readFileSync('lib/news.wps', 'utf8'));
  return await wps.parse(ps);
}

export function runGraphical(ps: string) {
  const canvas = new Canvas(200, 200);
  (global as any).window = global;
  (global as any).document = { getElementById: () => canvas };

  const wps = new Wps();
  wps.parse(readFileSync('lib/wps.wps', 'utf8'));
  return wps.parse(
    "save",
    "(xsquares) .setGc",
    ps,
    "restore"
  );
}

export function runNews(ps: string) {
  const canvas = new Canvas(200, 200);
  (global as any).window = global;
  (global as any).document = { getElementById: () => canvas };

  const wps = new Wps();
  wps.parse(readFileSync('lib/wps.wps', 'utf8'));
  wps.parse(readFileSync('lib/news.wps', 'utf8'));
  return wps.parse(
    "save",
    "(xsquares) .setGc",
    ps,
    "restore"
  );
}

