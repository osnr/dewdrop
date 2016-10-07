import Dewdrop from '../lib/index';

async function runDewdrop(framebuffer: HTMLCanvasElement, ps: string) {
  const dewdrop = await Dewdrop(framebuffer);
  dewdrop.parse(ps);
}
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
{
  createevent dup begin
    /Canvas cv def
    /Name /LeftMouseButton def
    /Action /UpTransition def
  end expressinterest
  {
    awaitevent begin
      0 0 moveto
      XLocation YLocation lineto stroke
    end
  } loop
} fork
`);

//
// runDewdrop(framebuffer, `
// /cv framebuffer newcanvas
// def
// framebuffer setcanvas
// 300 300 translate
// 0 0 100 0 360 arc
// cv reshapecanvas
// cv /Mapped true put
// cv setcanvas
// erasepage
// 0 0 moveto 100 100 lineto stroke
// `);
