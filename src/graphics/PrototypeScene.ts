/**
 * Escena prototipo de T-Lynx (A-02).
 * Dibuja el escenario solo con primitivas de Canvas 2D: líneas, rectángulos,
 * polígonos y arcos. Más adelante se reemplaza por sprites y entidades reales.
 */

const SceneColors = {
  sky: '#8fd3ff',
  ground: '#c9a46a',
  groundLine: '#5b4026',
  cloud: '#ffffff',
  building: '#6f8fb3',
  buildingWindow: '#cfe6ff',
  lynx: '#d98c3f',
  lynxOutline: '#3b2412',
  airplane: '#f4f4f4',
  airplaneFold: '#9aa7b4',
  books: ['#c0392b', '#2e86c1', '#27ae60', '#8e44ad'],
  bookOutline: '#1e1e1e',
} as const;

const GROUND_Y = 300;

export function drawPrototypeScene(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
): void {
  drawSky(ctx, width, height);
  drawBuildings(ctx);
  drawClouds(ctx);
  drawGround(ctx, width, height);
  drawLynx(ctx, 64, GROUND_Y);
  drawBookStack(ctx, 260, GROUND_Y, 16, 1);
  drawBookStack(ctx, 380, GROUND_Y, 24, 2);
  drawBookStack(ctx, 500, GROUND_Y, 32, 3);
  drawAirplane(ctx, 430, 236);
}

/** Color de fondo de día. */
function drawSky(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  ctx.fillStyle = SceneColors.sky;
  ctx.fillRect(0, 0, width, height);
}

/** Siluetas de edificios del campus con rectángulos. */
function drawBuildings(ctx: CanvasRenderingContext2D): void {
  const buildings = [
    { x: 20, width: 90, height: 110 },
    { x: 130, width: 60, height: 150 },
    { x: 210, width: 120, height: 90 },
    { x: 350, width: 70, height: 130 },
    { x: 440, width: 100, height: 100 },
    { x: 560, width: 70, height: 140 },
  ];

  for (const building of buildings) {
    const top = GROUND_Y - building.height;

    ctx.fillStyle = SceneColors.building;
    ctx.fillRect(building.x, top, building.width, building.height);

    ctx.fillStyle = SceneColors.buildingWindow;
    for (let wy = top + 12; wy < GROUND_Y - 16; wy += 22) {
      for (let wx = building.x + 10; wx < building.x + building.width - 14; wx += 20) {
        ctx.fillRect(wx, wy, 8, 10);
      }
    }
  }
}

/** Nubes formadas por varios círculos con arc. */
function drawClouds(ctx: CanvasRenderingContext2D): void {
  drawCloud(ctx, 110, 60, 1);
  drawCloud(ctx, 330, 40, 1.3);
  drawCloud(ctx, 540, 75, 0.9);
}

function drawCloud(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
  const circles = [
    { dx: 0, dy: 0, r: 14 },
    { dx: 16, dy: -8, r: 18 },
    { dx: 34, dy: 0, r: 14 },
    { dx: 18, dy: 6, r: 14 },
  ];

  ctx.fillStyle = SceneColors.cloud;
  ctx.beginPath();
  for (const c of circles) {
    const cx = x + c.dx * size;
    const cy = y + c.dy * size;
    ctx.moveTo(cx + c.r * size, cy);
    ctx.arc(cx, cy, c.r * size, 0, Math.PI * 2);
  }
  ctx.fill();
}

/** Suelo y línea de suelo con lineTo / stroke. */
function drawGround(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  ctx.fillStyle = SceneColors.ground;
  ctx.fillRect(0, GROUND_Y, width, height - GROUND_Y);

  ctx.strokeStyle = SceneColors.groundLine;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, GROUND_Y);
  ctx.lineTo(width, GROUND_Y);
  ctx.stroke();
}

/** Lince provisional: rectángulo de 32x32 apoyado en el suelo. */
function drawLynx(ctx: CanvasRenderingContext2D, x: number, groundY: number): void {
  const size = 32;
  const top = groundY - size;

  ctx.fillStyle = SceneColors.lynx;
  ctx.fillRect(x, top, size, size);

  ctx.strokeStyle = SceneColors.lynxOutline;
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, top + 1, size - 2, size - 2);
}

/**
 * Pila de libros apoyada en el suelo. El obstáculo mide 16 de ancho y
 * totalHeight de alto (16, 24 o 32), dividido entre la cantidad de libros.
 */
function drawBookStack(
  ctx: CanvasRenderingContext2D,
  x: number,
  groundY: number,
  totalHeight: number,
  bookCount: number,
): void {
  const width = 16;
  const bookHeight = totalHeight / bookCount;

  for (let i = 0; i < bookCount; i++) {
    const y = groundY - bookHeight * (i + 1);
    const color = SceneColors.books[i % SceneColors.books.length];

    ctx.fillStyle = color;
    ctx.fillRect(x, y, width, bookHeight);

    ctx.strokeStyle = SceneColors.bookOutline;
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, width - 1, bookHeight - 1);
  }
}

/** Avión de papel: triángulo (polígono) con moveTo / lineTo / fill. */
function drawAirplane(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  const width = 24;
  const height = 16;

  ctx.fillStyle = SceneColors.airplane;
  ctx.beginPath();
  ctx.moveTo(x, y + height / 2);
  ctx.lineTo(x + width, y);
  ctx.lineTo(x + width, y + height);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = SceneColors.airplaneFold;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, y + height / 2);
  ctx.lineTo(x + width, y + height / 2 + 2);
  ctx.stroke();
}