import { runDewdrop } from '../lib/index';

const framebuffer = document.getElementById('framebuffer');

runDewdrop(framebuffer as HTMLCanvasElement, `
/cv framebuffer newcanvas
def
framebuffer setcanvas
300 300 translate
0 0 100 0 360 arc
cv reshapecanvas
cv /Mapped true put
cv setcanvas
erasepage
0 0 moveto 100 100 lineto stroke
`);
