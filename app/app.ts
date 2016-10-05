import { runDewdrop } from '../lib/index';

const framebuffer = document.getElementById('framebuffer') as HTMLCanvasElement;
framebuffer.getContext('2d').fillStyle = 'gray';
framebuffer.getContext('2d').fillRect(0, 0, 640, 480);

runDewdrop(framebuffer, `
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
