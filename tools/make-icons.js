// Draws the app icon (the game's own top-down car on a road, with + and ×) and saves the PNG sizes phones need.
// Run: node tools/make-icons.js   (needs Playwright)
const { chromium } = require('playwright'), fs = require('fs'), path = require('path');
(async () => {
  const b = await chromium.launch(), pg = await b.newPage();
  await pg.goto('file://' + path.resolve(__dirname, '../index.html')); await pg.waitForTimeout(1200);
  const out = await pg.evaluate(async () => {
    await document.fonts.ready;
    const draw = (S, pad) => {   // pad: safe-zone margin for "maskable" icons (Android crops them into circles)
      const c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d'), u = S / 100;
      g.fillStyle = '#2b3137'; g.fillRect(0, 0, S, S);
      g.save(); g.translate(S / 2, S / 2); g.scale(1 - pad, 1 - pad); g.translate(-S / 2, -S / 2);
      g.save(); g.translate(S / 2, S / 2); g.rotate(-0.42);   // the road
      g.fillStyle = '#e84a4a'; g.fillRect(-90 * u, -27 * u, 180 * u, 54 * u);
      g.fillStyle = '#fff'; for (let x = -90; x < 90; x += 10) { g.fillRect(x * u, -27 * u, 5 * u, 54 * u); }
      g.fillStyle = '#4a4f57'; g.fillRect(-90 * u, -23 * u, 180 * u, 46 * u);
      g.fillStyle = '#F8C537'; for (let x = -90; x < 90; x += 16) g.fillRect(x * u, -1.2 * u, 9 * u, 2.4 * u);
      const car = NB.carTop('muscle', '#FF9D45', { eng: 3, nos: 3 }), k = (u * 13) / NB.carTop.PX;
      g.rotate(Math.PI / 2); g.drawImage(car, -car.width * k / 2, -car.height * k / 2 - 2 * u, car.width * k, car.height * k);
      g.restore();
      g.font = `italic 900 ${28 * u}px "Exo 2", "Arial Black", sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.lineWidth = 3 * u; g.strokeStyle = '#1d2126'; g.fillStyle = '#F8C537';
      g.strokeText('+', 20 * u, 22 * u); g.fillText('+', 20 * u, 22 * u);
      g.fillStyle = '#5EC3E8'; g.strokeText('×', 80 * u, 80 * u); g.fillText('×', 80 * u, 80 * u);
      g.restore();
      return c.toDataURL('image/png');
    };
    return { i192: draw(192, 0), i512: draw(512, 0), m512: draw(512, .2), a180: draw(180, 0) };
  });
  const dir = path.resolve(__dirname, '../img/icons'); fs.mkdirSync(dir, { recursive: true });
  const save = (n, d) => fs.writeFileSync(path.join(dir, n), Buffer.from(d.split(',')[1], 'base64'));
  save('icon-192.png', out.i192); save('icon-512.png', out.i512); save('maskable-512.png', out.m512); save('apple-touch-icon.png', out.a180);
  console.log('icons saved to img/icons'); await b.close();
})();
