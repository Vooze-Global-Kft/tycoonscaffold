/**
 * The smallest use of scripts/art/headless.ts: one shape, drawn as a picture, written to a PNG.
 *   npx tsx scripts/art/example.ts [out.png]
 */
import { headless } from './headless';

headless(async ({ Skia, PaintStyle, sheet, font }) => {
  const fill = Skia.Paint();
  fill.setColor(Skia.Color('#1B2A4A'));
  fill.setAntiAlias(true);
  const line = Skia.Paint();
  line.setColor(Skia.Color('#5FE3FF'));
  line.setStyle(PaintStyle.Stroke);
  line.setStrokeWidth(1.5);
  line.setAntiAlias(true);

  // A picture, recorded once, the way the app's art is baked.
  const recorder = Skia.PictureRecorder();
  const c = recorder.beginRecording(Skia.XYWHRect(-48, -48, 96, 96));
  const hex = Skia.PathBuilder.Make();
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i;
    if (i) hex.lineTo(40 * Math.cos(a), 40 * Math.sin(a));
    else hex.moveTo(40, 0);
  }
  hex.close();
  const shape = hex.build();
  c.drawPath(shape, fill);
  c.drawPath(shape, line);
  c.drawCircle(0, 0, 10, line);
  const picture = recorder.finishRecordingAsPicture();

  const label = font('games/pizza-empire/assets/fonts/LilitaOne.ttf', 14);
  const ink = Skia.Paint();
  ink.setColor(Skia.Color('#FFFFFF'));
  const out = await sheet(process.argv[2] ?? 'scripts/art/out/example.png', { width: 240, height: 140, scale: 2, background: '#0B1020' }, (canvas) => {
    for (const [x, turn] of [[60, 0], [180, 30]] as const) {
      canvas.save();
      canvas.translate(x, 60);
      canvas.rotate(turn, 0, 0);
      canvas.drawPicture(picture);
      canvas.restore();
    }
    canvas.drawText('two copies of one picture', 44, 128, ink, label);
  });
  console.log('wrote', out);
});
