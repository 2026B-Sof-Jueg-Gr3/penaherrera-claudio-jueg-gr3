/* ============================================================
   BOXING ARENA: EL DESAFÍO DEL RING
   Autor: Claudio Peñaherrera
   Taller: Setup, Desarrollo y Despliegue con Phaser 3
   Motor: Phaser 3.90.0 + Phaser Arcade Physics
   ============================================================ */

(() => {
  'use strict';

  // ------------------------------------------------------------
  // Constantes generales
  // ------------------------------------------------------------

  const GAME_WIDTH = 800;
  const GAME_HEIGHT = 600;

  const FONT_DISPLAY = '"Arial Black", "Arial Bold", Impact, "Trebuchet MS", sans-serif';
  const FONT_BODY = '"Trebuchet MS", "Segoe UI", Verdana, sans-serif';

  const COLORS = Object.freeze({
    ink: 0x050b14,
    panel: 0x0a1727,
    panelLight: 0x102943,
    navy: 0x071426,
    blue: 0x2e8cff,
    blueLight: 0x8bd5ff,
    blueDark: 0x123e80,
    red: 0xff4d5e,
    redLight: 0xffa395,
    redDark: 0x8d1828,
    gold: 0xffc857,
    goldDeep: 0xc8871c,
    cream: 0xf7ead1,
    white: 0xffffff,
    green: 0x58e0a0
  });

  const RING = Object.freeze({
    MIN_X: 154,
    MAX_X: 646,
    GROUND_Y: 526,
    WALL_Y: 458
  });

  const COMBAT = Object.freeze({
    MAX_HEALTH: 100,
    ROUND_MS: 60000,
    PLAYER_SPEED: 265,
    RIVAL_SPEED: 208,
    BLOCK_MULTIPLIER: 0.25,
    PLAYER_START_X: 306,
    RIVAL_START_X: 496,
    FAST: Object.freeze({
      id: 'fast',
      label: 'JAB',
      damage: 6,
      range: 120,
      windup: 100,
      activeWindow: 95,
      duration: 365,
      stun: 190,
      visualReach: 94,
      shake: 0.0028
    }),
    STRONG: Object.freeze({
      id: 'strong',
      label: 'CRUZADO',
      damage: 13,
      range: 140,
      windup: 245,
      activeWindow: 110,
      duration: 655,
      stun: 330,
      visualReach: 112,
      shake: 0.0052
    })
  });

  const getFighter = (player) =>
    player
      ? {
          name: 'AZUL',
          role: 'TÚ',
          skin: 0xd39a6b,
          skinShade: 0xa96f47,
          hair: 0x1b2430,
          trunks: 0x1764b4,
          trunksDark: 0x0d3a6b,
          accent: 0x2e8cff,
          accentSoft: 0x8bd5ff,
          glove: 0x1f79e6,
          gloveLight: 0x79ccff,
          gloveDark: 0x0d3f7d,
          scale: 1
        }
      : {
          name: 'ROJO',
          role: 'RIVAL',
          skin: 0xa96b4b,
          skinShade: 0x7d4933,
          hair: 0x1b1210,
          trunks: 0xb42537,
          trunksDark: 0x72111f,
          accent: 0xff4d5e,
          accentSoft: 0xffa395,
          glove: 0xd32e43,
          gloveLight: 0xff887a,
          gloveDark: 0x741322,
          scale: 1.045
        };

  // ------------------------------------------------------------
  // Utilidades
  // ------------------------------------------------------------

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const clamp01 = (value) => clamp(value, 0, 1);
  const lerp = (a, b, amount) => a + (b - a) * amount;
  const smoothstep = (value) => {
    const t = clamp01(value);
    return t * t * (3 - 2 * t);
  };

  function makeText(scene, x, y, value, options = {}) {
    const {
      size = 16,
      family = FONT_BODY,
      color = '#f7ead1',
      align = 'center',
      originX = 0.5,
      originY = 0.5,
      stroke = null,
      strokeThickness = 0,
      shadow = true,
      letterSpacing = 0,
      lineSpacing = 0,
      fontStyle = 'normal'
    } = options;

    const text = scene.add.text(x, y, String(value), {
      fontFamily: family,
      fontSize: `${size}px`,
      color,
      align,
      fontStyle
    });

    text.setOrigin(originX, originY);
    if (stroke) text.setStroke(stroke, strokeThickness);
    if (shadow) text.setShadow(0, 3, '#000000', 7, true, true);
    if (letterSpacing && typeof text.setLetterSpacing === 'function') {
      text.setLetterSpacing(letterSpacing);
    }
    if (lineSpacing && typeof text.setLineSpacing === 'function') {
      text.setLineSpacing(lineSpacing);
    }
    return text;
  }

  function hideLoadingOverlay() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.classList.add('is-hidden');
    window.__BOXING_ARENA_READY__ = true;
  }

  function showFatalError(message) {
    window.__BOXING_ARENA_ERROR__ = true;
    const errorBox = document.getElementById('fatal-error');
    const errorMessage = document.getElementById('fatal-error-message');
    if (errorMessage && message) errorMessage.textContent = message;
    if (errorBox) errorBox.hidden = false;
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.classList.add('is-hidden');
  }

  if (typeof Phaser === 'undefined') {
    showFatalError('Phaser 3 no está disponible. Comprueba tu conexión o la copia local en assets/vendor y abre el proyecto con Live Server.');
    return;
  }

  // Las teclas de juego se capturan desde cada escena con addCapture().
  // Phaser llama a preventDefault() después de procesar la entrada, por lo que
  // las flechas y ESPACIO no desplazan la página y el motor sí recibe las teclas.

  // ------------------------------------------------------------
  // Texturas generadas y arte del escenario
  // ------------------------------------------------------------

  function createCanvasTexture(scene, key, width, height, draw) {
    if (scene.textures.exists(key)) return;
    const texture = scene.textures.createCanvas(key, width, height);
    if (!texture) return;
    const context = texture.getContext();
    context.clearRect(0, 0, width, height);
    draw(context, width, height);
    texture.refresh();
  }

  function makeSeededRandom(seedValue) {
    let seed = seedValue >>> 0;
    return () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
  }

  function ensureSharedTextures(scene) {
    createCanvasTexture(scene, 'px', 4, 4, (ctx) => {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 4, 4);
    });

    createCanvasTexture(scene, 'soft-glow', 128, 128, (ctx) => {
      const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
      gradient.addColorStop(0, 'rgba(255,255,255,0.95)');
      gradient.addColorStop(0.25, 'rgba(255,255,255,0.55)');
      gradient.addColorStop(0.62, 'rgba(255,255,255,0.13)');
      gradient.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 128, 128);
    });

    createCanvasTexture(scene, 'spark', 28, 28, (ctx) => {
      const gradient = ctx.createRadialGradient(14, 14, 0, 14, 14, 14);
      gradient.addColorStop(0, 'rgba(255,255,255,1)');
      gradient.addColorStop(0.35, 'rgba(255,235,170,0.9)');
      gradient.addColorStop(1, 'rgba(255,200,87,0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 28, 28);
    });

    createCanvasTexture(scene, 'vignette', GAME_WIDTH, GAME_HEIGHT, (ctx) => {
      const gradient = ctx.createRadialGradient(400, 310, 165, 400, 310, 525);
      gradient.addColorStop(0, 'rgba(0,0,0,0)');
      gradient.addColorStop(0.66, 'rgba(0,0,0,0.22)');
      gradient.addColorStop(1, 'rgba(0,0,0,0.82)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    });
  }

  function drawArenaBackground(scene) {
    createCanvasTexture(scene, 'arena-background', GAME_WIDTH, GAME_HEIGHT, (ctx, width, height) => {
      const random = makeSeededRandom(20262026);

      const base = ctx.createLinearGradient(0, 0, 0, height);
      base.addColorStop(0, '#02060d');
      base.addColorStop(0.28, '#071426');
      base.addColorStop(0.66, '#0a1d34');
      base.addColorStop(1, '#02050a');
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, width, height);

      const centerGlow = ctx.createRadialGradient(400, 240, 20, 400, 240, 430);
      centerGlow.addColorStop(0, 'rgba(61,134,215,0.24)');
      centerGlow.addColorStop(0.55, 'rgba(25,66,111,0.09)');
      centerGlow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = centerGlow;
      ctx.fillRect(0, 0, width, height);

      // Estructura metálica del estadio.
      ctx.strokeStyle = 'rgba(93,137,181,0.12)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 8; i += 1) {
        const y = 18 + i * 27;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(800, y - 46);
        ctx.stroke();
      }
      for (let i = 0; i < 12; i += 1) {
        const x = 30 + i * 70;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x - 80, 285);
        ctx.stroke();
      }

      // Paneles y gradas del fondo.
      ctx.fillStyle = 'rgba(2,8,16,0.62)';
      ctx.fillRect(0, 150, 800, 175);
      ctx.strokeStyle = 'rgba(255,200,87,0.12)';
      ctx.lineWidth = 1;
      ctx.strokeRect(0, 150, 800, 1);

      // Luces del estadio.
      const drawLampRig = (x, y, tint) => {
        const glow = ctx.createRadialGradient(x, y, 2, x, y, 92);
        glow.addColorStop(0, tint);
        glow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = glow;
        ctx.fillRect(x - 95, y - 95, 190, 190);

        ctx.fillStyle = '#08111d';
        ctx.strokeStyle = 'rgba(140,180,220,0.22)';
        ctx.lineWidth = 2;
        ctx.fillRect(x - 47, y - 12, 94, 20);
        ctx.strokeRect(x - 47, y - 12, 94, 20);
        for (let row = 0; row < 2; row += 1) {
          for (let col = 0; col < 5; col += 1) {
            ctx.fillStyle = row === 0 ? '#ffe9b0' : '#fff6d7';
            ctx.beginPath();
            ctx.arc(x - 36 + col * 18, y - 5 + row * 10, 3.4, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      };
      drawLampRig(112, 86, 'rgba(255,211,130,0.24)');
      drawLampRig(400, 52, 'rgba(162,213,255,0.18)');
      drawLampRig(688, 86, 'rgba(255,190,160,0.18)');

      // Haces de luz.
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const beamOne = ctx.createLinearGradient(0, 70, 0, 450);
      beamOne.addColorStop(0, 'rgba(118,181,255,0.12)');
      beamOne.addColorStop(1, 'rgba(118,181,255,0)');
      ctx.fillStyle = beamOne;
      ctx.beginPath();
      ctx.moveTo(85, 78);
      ctx.lineTo(275, 78);
      ctx.lineTo(465, 460);
      ctx.lineTo(150, 460);
      ctx.closePath();
      ctx.fill();

      const beamTwo = ctx.createLinearGradient(800, 70, 800, 440);
      beamTwo.addColorStop(0, 'rgba(255,127,130,0.10)');
      beamTwo.addColorStop(1, 'rgba(255,127,130,0)');
      ctx.fillStyle = beamTwo;
      ctx.beginPath();
      ctx.moveTo(715, 78);
      ctx.lineTo(525, 78);
      ctx.lineTo(335, 460);
      ctx.lineTo(650, 460);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // Pancarta central.
      ctx.save();
      ctx.fillStyle = 'rgba(4,12,23,0.82)';
      ctx.strokeStyle = 'rgba(255,200,87,0.4)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(274, 165, 252, 48, 6);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,200,87,0.9)';
      ctx.font = '700 17px "Arial Black", Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('BOXING ARENA', 400, 187);
      ctx.fillStyle = 'rgba(199,224,255,0.42)';
      ctx.font = '10px "Trebuchet MS", Arial, sans-serif';
      ctx.fillText('EL DESAFÍO DEL RING · 2026', 400, 203);
      ctx.restore();

      // Textos de esquina del estadio.
      ctx.save();
      ctx.font = '700 12px "Arial Black", Arial, sans-serif';
      ctx.fillStyle = 'rgba(122,202,255,0.33)';
      ctx.fillText('AZUL', 60, 232);
      ctx.fillStyle = 'rgba(255,120,120,0.33)';
      ctx.fillText('ROJO', 704, 232);
      ctx.restore();

      // Publicidad perimetral.
      ctx.fillStyle = 'rgba(3,10,19,0.9)';
      ctx.fillRect(0, 345, 800, 22);
      ctx.strokeStyle = 'rgba(255,200,87,0.16)';
      ctx.strokeRect(0, 345, 800, 1);
      ctx.font = '700 9px "Trebuchet MS", Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(247,234,209,0.25)';
      for (let x = 70; x < 800; x += 150) {
        ctx.fillText('BOXING ARENA', x, 359);
      }

      // Polvo ambiental del fondo.
      for (let i = 0; i < 70; i += 1) {
        const x = random() * width;
        const y = random() * 380;
        const alpha = 0.03 + random() * 0.12;
        ctx.fillStyle = `rgba(190,225,255,${alpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(x, y, random() * 1.5 + 0.3, 0, Math.PI * 2);
        ctx.fill();
      }

      // Niebla inferior.
      const haze = ctx.createLinearGradient(0, 300, 0, 540);
      haze.addColorStop(0, 'rgba(8,22,39,0)');
      haze.addColorStop(1, 'rgba(3,9,17,0.58)');
      ctx.fillStyle = haze;
      ctx.fillRect(0, 300, width, 240);
    });
  }

  function drawCrowdTexture(scene) {
    createCanvasTexture(scene, 'crowd-strip', 800, 215, (ctx) => {
      const random = makeSeededRandom(99117);
      const palette = [
        ['#10263e', '#1b4164'],
        ['#291620', '#4a2430'],
        ['#111f2c', '#243f52'],
        ['#1f1a2f', '#3c3155'],
        ['#142727', '#28514b'],
        ['#262018', '#4f402a']
      ];

      for (let row = 0; row < 8; row += 1) {
        const y = 22 + row * 23;
        const spacing = 17 + row * 1.4;
        const radius = 5.2 + row * 0.34;
        for (let x = -12; x < 816; x += spacing + random() * 10) {
          const drift = (random() - 0.5) * 8;
          const paletteEntry = palette[Math.floor(random() * palette.length)];
          ctx.fillStyle = paletteEntry[0];
          ctx.beginPath();
          ctx.ellipse(x + drift, y + 8, radius * 2.5, radius * 2.2, 0, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = paletteEntry[1];
          ctx.globalAlpha = 0.75;
          ctx.beginPath();
          ctx.arc(x + drift, y - 2, radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;

          // Algunos aficionados con acentos azules o rojos.
          if (random() > 0.91) {
            ctx.fillStyle = random() > 0.5 ? '#277dcc' : '#ba2f40';
            ctx.globalAlpha = 0.5;
            ctx.beginPath();
            ctx.arc(x + drift - 2, y + 6, radius * 1.9, Math.PI, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
          }

          // Luces de teléfonos.
          if (random() > 0.975) {
            ctx.fillStyle = 'rgba(255,245,205,0.82)';
            ctx.beginPath();
            ctx.arc(x + drift + 4, y + 2, 1.3, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // Oscurece la base de la grada para integrarla con el ring.
      const fade = ctx.createLinearGradient(0, 150, 0, 215);
      fade.addColorStop(0, 'rgba(2,7,13,0)');
      fade.addColorStop(1, 'rgba(2,7,13,0.88)');
      ctx.fillStyle = fade;
      ctx.fillRect(0, 150, 800, 65);
    });
  }

  function ensureArenaTextures(scene) {
    ensureSharedTextures(scene);
    drawArenaBackground(scene);
    drawCrowdTexture(scene);
  }

  function addRingRopes(scene, graphics) {
    const ropes = [
      { y: 286, color: 0xe6d7b8, highlight: 0xfffbe9 },
      { y: 338, color: 0x3888dc, highlight: 0x93d2ff },
      { y: 390, color: 0xc53b4b, highlight: 0xff9a8b }
    ];

    ropes.forEach((rope) => {
      graphics.lineStyle(9, 0x02060d, 0.8);
      graphics.lineBetween(100, rope.y + 2, 700, rope.y + 2);
      graphics.lineStyle(5, rope.color, 0.96);
      graphics.lineBetween(100, rope.y, 700, rope.y);
      graphics.lineStyle(1.4, rope.highlight, 0.5);
      graphics.lineBetween(101, rope.y - 1.5, 699, rope.y - 1.5);
    });
  }

  function drawRing(scene) {
    ensureSharedTextures(scene);
    const graphics = scene.add.graphics().setDepth(2);

    // Sombra y plataforma bajo el ring.
    graphics.fillStyle(0x000000, 0.42);
    graphics.fillEllipse(400, 568, 775, 64);
    graphics.fillStyle(0x071321, 1);
    graphics.fillPoints([
      { x: 15, y: 558 },
      { x: 785, y: 558 },
      { x: 800, y: 600 },
      { x: 0, y: 600 }
    ], true);
    graphics.fillStyle(0x0d1e31, 1);
    graphics.fillPoints([
      { x: 42, y: 558 },
      { x: 758, y: 558 },
      { x: 775, y: 578 },
      { x: 25, y: 578 }
    ], true);
    graphics.lineStyle(2, COLORS.gold, 0.58);
    graphics.lineBetween(20, 558, 780, 558);
    graphics.lineStyle(1, 0x8bd5ff, 0.16);
    graphics.lineBetween(28, 565, 772, 565);

    // Lona con perspectiva.
    const matTop = 358;
    const matBottom = 558;
    const bandColors = [0x12395c, 0x10324f, 0x0e2c46, 0x0c263d, 0x0a2135, 0x091c2e, 0x08182a, 0x071524];
    const topLeft = 102;
    const topRight = 698;
    const bottomLeft = 20;
    const bottomRight = 780;

    for (let i = 0; i < bandColors.length; i += 1) {
      const t0 = i / bandColors.length;
      const t1 = (i + 1) / bandColors.length;
      const y0 = lerp(matTop, matBottom, t0);
      const y1 = lerp(matTop, matBottom, t1);
      const x0Left = lerp(topLeft, bottomLeft, t0);
      const x0Right = lerp(topRight, bottomRight, t0);
      const x1Left = lerp(topLeft, bottomLeft, t1);
      const x1Right = lerp(topRight, bottomRight, t1);
      graphics.fillStyle(bandColors[i], 1);
      graphics.fillPoints([
        { x: x0Left, y: y0 },
        { x: x0Right, y: y0 },
        { x: x1Right, y: y1 },
        { x: x1Left, y: y1 }
      ], true);
    }

    // Líneas de perspectiva de la lona.
    graphics.lineStyle(1, 0x8bc9ff, 0.055);
    for (let i = 0; i <= 10; i += 1) {
      const t = i / 10;
      const topX = lerp(topLeft, topRight, t);
      const bottomX = lerp(bottomLeft, bottomRight, t);
      graphics.lineBetween(topX, matTop, bottomX, matBottom);
    }
    for (let i = 1; i < 8; i += 1) {
      const t = i / 8;
      const y = lerp(matTop, matBottom, t);
      graphics.lineBetween(lerp(topLeft, bottomLeft, t), y, lerp(topRight, bottomRight, t), y);
    }

    // Borde de la lona.
    graphics.lineStyle(3, COLORS.goldDeep, 0.38);
    graphics.strokePoints([
      { x: topLeft, y: matTop },
      { x: topRight, y: matTop },
      { x: bottomRight, y: matBottom },
      { x: bottomLeft, y: matBottom }
    ], true);
    graphics.lineStyle(1, 0x8bd5ff, 0.22);
    graphics.lineBetween(topLeft + 8, matTop + 2, topRight - 8, matTop + 2);

    // Medallón central.
    graphics.lineStyle(2, COLORS.gold, 0.15);
    graphics.strokeEllipse(400, 464, 248, 98);
    graphics.lineStyle(1, 0x8bd5ff, 0.12);
    graphics.strokeEllipse(400, 464, 206, 76);
    graphics.fillStyle(0x081a2d, 0.4);
    graphics.fillEllipse(400, 464, 196, 70);

    const matMark = makeText(scene, 400, 461, 'BOXING ARENA', {
      size: 28,
      family: FONT_DISPLAY,
      color: '#8bd5ff',
      letterSpacing: 5
    });
    matMark.setAlpha(0.1).setDepth(2.1);

    const matMarkSmall = makeText(scene, 400, 486, 'EL DESAFÍO DEL RING', {
      size: 10,
      family: FONT_BODY,
      color: '#ffc857',
      letterSpacing: 3
    });
    matMarkSmall.setAlpha(0.18).setDepth(2.1);

    // Cuerdas y postes.
    addRingRopes(scene, graphics);

    const drawPost = (x, padColor, padHighlight) => {
      graphics.fillStyle(0x000000, 0.34);
      graphics.fillEllipse(x + 7, 558, 54, 17);
      graphics.fillStyle(0x081522, 1);
      graphics.fillRoundedRect(x - 12, 246, 24, 314, 4);
      graphics.fillStyle(0x19344c, 1);
      graphics.fillRoundedRect(x - 9, 247, 9, 308, 4);
      graphics.fillStyle(0x0b1b2b, 1);
      graphics.fillRoundedRect(x + 2, 247, 8, 308, 4);
      graphics.lineStyle(1.5, COLORS.goldDeep, 0.48);
      graphics.strokeRoundedRect(x - 12, 246, 24, 314, 4);

      // Protecciones de esquina.
      graphics.fillStyle(padColor, 0.95);
      graphics.fillRoundedRect(x - 20, 270, 40, 140, 7);
      graphics.lineStyle(2, 0x040b14, 0.8);
      graphics.strokeRoundedRect(x - 20, 270, 40, 140, 7);
      graphics.fillStyle(padHighlight, 0.8);
      graphics.fillRoundedRect(x - 14, 277, 6, 126, 3);
      graphics.fillStyle(COLORS.gold, 0.9);
      graphics.fillRect(x - 22, 307, 44, 3);
      graphics.fillRect(x - 22, 371, 44, 3);

      graphics.fillStyle(COLORS.gold, 0.92);
      graphics.fillRoundedRect(x - 15, 238, 30, 10, 3);
      graphics.fillStyle(0x0a1727, 0.88);
      graphics.fillRoundedRect(x - 18, 548, 36, 12, 3);
    };

    drawPost(100, COLORS.blue, COLORS.blueLight);
    drawPost(700, COLORS.red, COLORS.redLight);

    const leftLabel = makeText(scene, 100, 258, 'AZUL', {
      size: 7,
      family: FONT_DISPLAY,
      color: '#d9f2ff',
      letterSpacing: 1,
      shadow: false
    });
    leftLabel.setDepth(2.1).setAlpha(0.7);
    const rightLabel = makeText(scene, 700, 258, 'ROJO', {
      size: 7,
      family: FONT_DISPLAY,
      color: '#ffe2dc',
      letterSpacing: 1,
      shadow: false
    });
    rightLabel.setDepth(2.1).setAlpha(0.7);

    // Vinilo del faldón frontal.
    const apronLabel = makeText(scene, 400, 584, 'BOXING ARENA  ·  EL DESAFÍO DEL RING', {
      size: 10,
      family: FONT_DISPLAY,
      color: '#ffc857',
      letterSpacing: 3,
      shadow: false
    });
    apronLabel.setDepth(2.20).setAlpha(0.38);

    graphics.lineStyle(1, COLORS.gold, 0.25);
    graphics.lineBetween(210, 575, 590, 575);
  }

  function addSpotlightBeam(scene, x, color, alpha, width, delay) {
    const beam = scene.add.container(x, 58).setDepth(4).setAlpha(0);
    const beamGraphics = scene.add.graphics();
    beamGraphics.fillStyle(color, alpha);
    beamGraphics.fillPoints([
      { x: -18, y: 0 },
      { x: 18, y: 0 },
      { x: width, y: 470 },
      { x: -width, y: 470 }
    ], true);
    beam.add(beamGraphics);
    beam.rotation = -0.03;

    scene.tweens.add({
      targets: beam,
      alpha: 1,
      duration: 1300,
      delay,
      ease: 'Sine.easeOut'
    });
    scene.tweens.add({
      targets: beam,
      rotation: 0.035,
      duration: 5200 + delay,
      delay,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    return beam;
  }

  function addArenaAmbience(scene) {
    ensureSharedTextures(scene);

    addSpotlightBeam(scene, 184, 0x62b5ff, 0.045, 142, 100);
    addSpotlightBeam(scene, 602, 0xff6d79, 0.038, 132, 600);

    const dustLayer = scene.add.container(0, 0).setDepth(6);
    for (let i = 0; i < 19; i += 1) {
      const x = 70 + Math.random() * 660;
      const y = 210 + Math.random() * 300;
      const mote = scene.add.image(x, y, 'spark');
      mote.setScale(0.05 + Math.random() * 0.07);
      mote.setTint(Math.random() > 0.45 ? 0x9ed8ff : 0xffd77e);
      mote.setAlpha(0.12 + Math.random() * 0.24);
      dustLayer.add(mote);

      scene.tweens.add({
        targets: mote,
        x: x + (Math.random() - 0.5) * 45,
        y: y - 45 - Math.random() * 90,
        alpha: 0,
        duration: 4200 + Math.random() * 4000,
        delay: Math.random() * 2200,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    }

    const sideGlow = scene.add.image(400, 342, 'soft-glow');
    sideGlow.setTint(0x4b93dd);
    sideGlow.setAlpha(0.1);
    sideGlow.setScale(6.8, 2.4);
    sideGlow.setDepth(5);
    scene.tweens.add({
      targets: sideGlow,
      alpha: 0.16,
      duration: 3400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  function addArenaBase(scene, options = {}) {
    const { dim = 0, crowdMotion = true } = options;
    ensureArenaTextures(scene);

    const background = scene.add.image(400, 300, 'arena-background').setDepth(0);
    background.setDisplaySize(800, 600);

    const crowd = scene.add.image(400, 298, 'crowd-strip').setDepth(1);
    if (crowdMotion) {
      scene.tweens.add({
        targets: crowd,
        y: 300.5,
        duration: 2800,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    }

    drawRing(scene);

    if (dim > 0) {
      scene.add.rectangle(400, 300, 800, 600, 0x020711, dim).setDepth(7);
    }

    scene.add.image(400, 300, 'vignette').setDepth(70).setAlpha(0.86);
    return { background, crowd };
  }

  // ------------------------------------------------------------
  // Componentes de interfaz reutilizables
  // ------------------------------------------------------------

  function drawPanel(scene, x, y, width, height, accent = COLORS.gold, alpha = 0.82) {
    const panel = scene.add.graphics().setDepth(90);
    panel.fillStyle(0x000000, 0.28);
    panel.fillRoundedRect(x - width / 2 + 4, y - height / 2 + 5, width, height, 9);
    panel.fillStyle(COLORS.panel, alpha);
    panel.fillRoundedRect(x - width / 2, y - height / 2, width, height, 9);
    panel.lineStyle(1.5, accent, 0.44);
    panel.strokeRoundedRect(x - width / 2, y - height / 2, width, height, 9);
    panel.lineStyle(1, 0xffffff, 0.04);
    panel.strokeRoundedRect(x - width / 2 + 4, y - height / 2 + 4, width - 8, height - 8, 6);

    // Pequeños remaches de esquina.
    const offsetX = width / 2 - 9;
    const offsetY = height / 2 - 9;
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy]) => {
      panel.fillStyle(accent, 0.62);
      panel.fillCircle(x + sx * offsetX, y + sy * offsetY, 1.6);
    });
    return panel;
  }

  function drawKeycap(scene, x, y, width, label, accent = COLORS.gold) {
    const graphics = scene.add.graphics().setDepth(120);
    graphics.fillStyle(0x000000, 0.4);
    graphics.fillRoundedRect(x - width / 2 + 2, y - 13, width, 31, 5);
    graphics.fillStyle(0x13283f, 1);
    graphics.fillRoundedRect(x - width / 2, y - 16, width, 31, 5);
    graphics.lineStyle(1, accent, 0.55);
    graphics.strokeRoundedRect(x - width / 2, y - 16, width, 31, 5);
    graphics.fillStyle(0xffffff, 0.07);
    graphics.fillRoundedRect(x - width / 2 + 3, y - 13, width - 6, 10, 3);

    const text = makeText(scene, x, y - 1, label, {
      size: width > 65 ? 12 : 13,
      family: FONT_DISPLAY,
      color: '#f7ead1',
      letterSpacing: 0.5,
      shadow: false
    });
    text.setDepth(121);
    return { graphics, text };
  }

  function createArcadeButton(scene, options) {
    const {
      x,
      y,
      width = 306,
      height = 70,
      label = 'JUGAR',
      subtitle = '',
      accent = COLORS.gold,
      labelSize = null,
      onClick = () => {}
    } = options;

    const container = scene.add.container(x, y).setDepth(130);
    const glow = scene.add.graphics();
    glow.fillStyle(accent, 0.12);
    glow.fillRoundedRect(-width / 2 - 10, -height / 2 - 9, width + 20, height + 18, 14);
    glow.lineStyle(1, accent, 0.3);
    glow.strokeRoundedRect(-width / 2 - 8, -height / 2 - 7, width + 16, height + 14, 12);
    glow.setAlpha(0.35);

    const plate = scene.add.graphics();
    plate.fillStyle(0x000000, 0.52);
    plate.fillRoundedRect(-width / 2 + 3, -height / 2 + 8, width, height, 8);
    plate.fillStyle(0x071321, 1);
    plate.fillRoundedRect(-width / 2, -height / 2, width, height, 8);
    plate.fillStyle(accent, 0.12);
    plate.fillRoundedRect(-width / 2 + 3, -height / 2 + 3, width - 6, height - 6, 6);
    plate.fillStyle(0xffffff, 0.055);
    plate.fillRoundedRect(-width / 2 + 6, -height / 2 + 5, width - 12, 22, 5);
    plate.lineStyle(2, accent, 0.95);
    plate.strokeRoundedRect(-width / 2, -height / 2, width, height, 8);
    plate.lineStyle(1, 0xffffff, 0.09);
    plate.strokeRoundedRect(-width / 2 + 5, -height / 2 + 5, width - 10, height - 10, 5);
    plate.fillStyle(accent, 0.9);
    plate.fillTriangle(-width / 2 + 9, -9, -width / 2 + 9, 9, -width / 2 + 19, 0);
    plate.fillTriangle(width / 2 - 9, -9, width / 2 - 9, 9, width / 2 - 19, 0);

    const labelText = makeText(scene, 0, subtitle ? -7 : 1, label, {
      size: labelSize || (subtitle ? 22 : 25),
      family: FONT_DISPLAY,
      color: '#fff8e7',
      letterSpacing: 2.5,
      stroke: '#07111f',
      strokeThickness: 4
    });

    container.add([glow, plate, labelText]);

    if (subtitle) {
      const subtitleText = makeText(scene, 0, 19, subtitle, {
        size: 8,
        family: FONT_DISPLAY,
        color: '#ffc857',
        letterSpacing: 1.6,
        shadow: false
      });
      container.add(subtitleText);
    }

    const zone = scene.add.zone(x, y, width, height)
      .setDepth(131)
      .setInteractive({ useHandCursor: true });

    let hovered = false;
    const setHover = (value) => {
      hovered = value;
      scene.tweens.killTweensOf(container);
      scene.tweens.add({
        targets: container,
        scaleX: value ? 1.035 : 1,
        scaleY: value ? 1.035 : 1,
        duration: 130,
        ease: 'Sine.easeOut'
      });
      scene.tweens.killTweensOf(glow);
      scene.tweens.add({
        targets: glow,
        alpha: value ? 1 : 0.35,
        duration: 150,
        ease: 'Sine.easeOut'
      });
      labelText.setColor(value ? '#ffffff' : '#fff8e7');
    };

    zone.on('pointerover', () => setHover(true));
    zone.on('pointerout', () => setHover(false));
    zone.on('pointerdown', () => {
      if (!zone.input || !zone.input.enabled) return;
      scene.tweens.killTweensOf(container);
      scene.tweens.add({
        targets: container,
        scaleX: 0.975,
        scaleY: 0.975,
        duration: 65,
        yoyo: true,
        ease: 'Sine.easeOut'
      });
      onClick();
    });

    return {
      container,
      zone,
      glow,
      plate,
      labelText,
      setHover,
      isHovered: () => hovered,
      disable: () => {
        zone.disableInteractive();
        container.setAlpha(0.5);
      }
    };
  }

  // ------------------------------------------------------------
  // Boxeador: cuerpo físico invisible + representación vectorial
  // ------------------------------------------------------------

  class Boxer {
    constructor(scene, isPlayer, x) {
      this.scene = scene;
      this.isPlayer = isPlayer;
      this.config = getFighter(isPlayer);
      this.maxHealth = COMBAT.MAX_HEALTH;
      this.health = COMBAT.MAX_HEALTH;
      this.facing = isPlayer ? 1 : -1;
      this.state = 'idle';
      this.attack = null;
      this.attackLockUntil = 0;
      this.hurtUntil = 0;
      this.blocking = false;
      this.blockFlashUntil = 0;
      this.ko = false;
      this.walkPhase = Math.random() * Math.PI * 2;
      this.hitsLanded = 0;
      this.blocks = 0;
      this.baseScale = this.config.scale;
      this.speed = isPlayer ? COMBAT.PLAYER_SPEED : COMBAT.RIVAL_SPEED;
      this.lastPose = null;

      // El cuerpo de físicas es invisible; la silueta visual se sincroniza con él.
      this.sprite = scene.physics.add.sprite(x, RING.GROUND_Y - 68, 'px');
      this.sprite.setVisible(false);
      this.sprite.setMaxVelocity(420, 0);
      this.sprite.body.setSize(54, 136, true);
      this.sprite.body.setAllowGravity(false);
      this.sprite.body.setDragX(1250);
      if (typeof this.sprite.setPushable === 'function') {
        this.sprite.setPushable(true);
      }

      this.shadow = scene.add.ellipse(x, RING.GROUND_Y + 4, 96, 22, 0x000000, 0.42)
        .setDepth(8);

      this.visual = scene.add.container(x, RING.GROUND_Y).setDepth(11);
      this.visual.setScale(this.facing * this.baseScale, this.baseScale);

      this.legsBack = scene.add.graphics();
      this.legsFront = scene.add.graphics();
      this.backArm = scene.add.graphics();
      this.torso = scene.add.graphics();
      this.head = scene.add.graphics();
      this.guardShield = scene.add.graphics();
      this.frontArm = scene.add.graphics();

      this.visual.add([
        this.legsBack,
        this.legsFront,
        this.backArm,
        this.torso,
        this.head,
        this.guardShield,
        this.frontArm
      ]);

      this.drawTorsoGraphic();
      this.drawHeadGraphic();
      this.drawPose(scene.time.now);
      this.syncVisual(scene.time.now, 16);
    }

    drawTorsoGraphic() {
      const graphics = this.torso;
      const c = this.config;

      // Silueta del torso con un contorno oscuro para despegarlo del fondo.
      graphics.fillStyle(c.skinShade, 1);
      graphics.beginPath();
      graphics.moveTo(-32, -157);
      graphics.lineTo(28, -159);
      graphics.lineTo(25, -106);
      graphics.lineTo(-17, -106);
      graphics.lineTo(-28, -138);
      graphics.closePath();
      graphics.fillPath();

      graphics.fillStyle(c.skin, 1);
      graphics.fillPoints([
        { x: -28, y: -155 },
        { x: 24, y: -156 },
        { x: 21, y: -110 },
        { x: -15, y: -110 },
        { x: -24, y: -139 }
      ], true);

      // Volumen del pecho y abdomen.
      graphics.fillStyle(0xffdfb8, 0.12);
      graphics.fillEllipse(8, -140, 32, 20);
      graphics.fillStyle(c.skinShade, 0.24);
      graphics.fillEllipse(-8, -120, 20, 19);
      graphics.lineStyle(1, c.skinShade, 0.48);
      graphics.lineBetween(-5, -127, -3, -113);
      graphics.lineBetween(4, -132, 7, -114);
      graphics.lineBetween(-17, -137, 16, -139);

      // Cuello.
      graphics.fillStyle(c.skinShade, 1);
      graphics.fillRoundedRect(-10, -175, 21, 24, 5);
      graphics.fillStyle(c.skin, 1);
      graphics.fillRoundedRect(-7, -173, 15, 23, 4);

      // Trunks.
      graphics.fillStyle(c.trunksDark, 1);
      graphics.fillPoints([
        { x: -31, y: -108 },
        { x: 31, y: -108 },
        { x: 29, y: -70 },
        { x: 8, y: -70 },
        { x: 3, y: -88 },
        { x: -3, y: -88 },
        { x: -8, y: -70 },
        { x: -28, y: -70 }
      ], true);
      graphics.fillStyle(c.trunks, 1);
      graphics.fillPoints([
        { x: -28, y: -106 },
        { x: 28, y: -106 },
        { x: 26, y: -73 },
        { x: 7, y: -73 },
        { x: 2, y: -85 },
        { x: -2, y: -85 },
        { x: -7, y: -73 },
        { x: -25, y: -73 }
      ], true);

      // Franja lateral y cinturón dorado.
      graphics.fillStyle(c.accent, 0.95);
      graphics.fillPoints([
        { x: 18, y: -105 },
        { x: 27, y: -105 },
        { x: 25, y: -73 },
        { x: 17, y: -73 }
      ], true);
      graphics.fillStyle(0x08111c, 0.7);
      graphics.fillRect(-30, -113, 60, 3);
      graphics.fillStyle(COLORS.gold, 1);
      graphics.fillRect(-29, -111, 58, 8);
      graphics.fillStyle(0xfff1b8, 0.72);
      graphics.fillRect(-25, -109, 50, 2);
      graphics.fillStyle(COLORS.goldDeep, 1);
      graphics.fillTriangle(-5, -112, 5, -112, 0, -103);
      graphics.fillStyle(0xfff1b8, 0.82);
      graphics.fillCircle(0, -109, 2);

      // Tatuaje original: estrella de campeón o rayo de desafío.
      if (this.isPlayer) {
        const star = [];
        for (let i = 0; i < 10; i += 1) {
          const angle = -Math.PI / 2 + (i * Math.PI) / 5;
          const radius = i % 2 === 0 ? 7 : 3;
          star.push({ x: 11 + Math.cos(angle) * radius, y: -135 + Math.sin(angle) * radius });
        }
        graphics.fillStyle(c.accent, 0.58);
        graphics.fillPoints(star, true);
      } else {
        graphics.fillStyle(c.accent, 0.55);
        graphics.fillPoints([
          { x: 8, y: -146 },
          { x: 16, y: -146 },
          { x: 12, y: -138 },
          { x: 19, y: -138 },
          { x: 8, y: -125 },
          { x: 11, y: -136 },
          { x: 5, y: -136 }
        ], true);
      }

      // Brillo de contorno.
      graphics.lineStyle(1, 0xffffff, 0.09);
      graphics.strokePoints([
        { x: -27, y: -154 },
        { x: 23, y: -155 },
        { x: 20, y: -111 }
      ], false);
    }

    drawHeadGraphic() {
      const graphics = this.head;
      const c = this.config;

      // Oreja.
      graphics.fillStyle(c.skinShade, 1);
      graphics.fillEllipse(-20, -181, 13, 21);
      graphics.fillStyle(c.skin, 1);
      graphics.fillEllipse(-19, -181, 8, 15);
      graphics.lineStyle(1, c.skinShade, 0.7);
      graphics.strokeEllipse(-19, -181, 5, 9);

      // Cráneo y mandíbula.
      graphics.fillStyle(c.skinShade, 1);
      graphics.fillEllipse(2, -184, 54, 61);
      graphics.fillStyle(c.skin, 1);
      graphics.fillEllipse(2, -185, 47, 55);
      graphics.fillStyle(0xffdfb8, 0.12);
      graphics.fillEllipse(9, -196, 24, 20);
      graphics.fillStyle(c.skinShade, 0.18);
      graphics.fillEllipse(2, -169, 36, 23);

      // Cabello y rasgos distintivos.
      if (this.isPlayer) {
        graphics.fillStyle(c.hair, 1);
        graphics.fillEllipse(-7, -201, 35, 22);
        graphics.fillEllipse(-16, -192, 20, 22);
        graphics.fillPoints([
          { x: -23, y: -199 },
          { x: -16, y: -211 },
          { x: -8, y: -203 },
          { x: -2, y: -211 },
          { x: 7, y: -202 },
          { x: 16, y: -205 },
          { x: 18, y: -195 },
          { x: -23, y: -192 }
        ], true);

        // Cinta azul del jugador.
        graphics.fillStyle(c.accent, 1);
        graphics.fillPoints([
          { x: -24, y: -201 },
          { x: 19, y: -204 },
          { x: 20, y: -193 },
          { x: -23, y: -189 }
        ], true);
        graphics.fillStyle(c.accentSoft, 0.6);
        graphics.fillRect(-21, -199, 38, 2);
        graphics.fillStyle(c.accent, 1);
        graphics.fillTriangle(-24, -198, -37, -204, -30, -191);
        graphics.fillTriangle(-24, -195, -33, -185, -24, -188);
      } else {
        // Sienes rapadas.
        graphics.fillStyle(c.hair, 0.9);
        graphics.fillEllipse(-17, -195, 22, 25);
        graphics.fillEllipse(-4, -203, 30, 19);

        // Cresta roja del rival.
        graphics.fillStyle(c.hair, 1);
        graphics.fillPoints([
          { x: -18, y: -200 },
          { x: -13, y: -219 },
          { x: -7, y: -204 },
          { x: -1, y: -225 },
          { x: 4, y: -207 },
          { x: 10, y: -220 },
          { x: 16, y: -202 },
          { x: 6, y: -199 }
        ], true);
        graphics.fillStyle(c.accent, 0.72);
        graphics.fillPoints([
          { x: -10, y: -204 },
          { x: -6, y: -214 },
          { x: -2, y: -205 },
          { x: 2, y: -216 },
          { x: 6, y: -204 }
        ], true);

        // Barba corta y pendiente dorada.
        graphics.fillStyle(c.hair, 0.62);
        graphics.fillEllipse(2, -165, 34, 13);
        graphics.fillStyle(COLORS.gold, 1);
        graphics.fillCircle(-24, -173, 2.2);
      }

      // Ojos y cejas.
      graphics.fillStyle(0xf7ead1, 1);
      graphics.fillEllipse(10, -186, 11, 6);
      graphics.fillStyle(0x111827, 1);
      graphics.fillCircle(12, -186, 2.5);
      graphics.fillStyle(0xffffff, 0.8);
      graphics.fillCircle(12.8, -187, 0.8);
      graphics.lineStyle(2, c.hair, 0.95);
      if (this.isPlayer) {
        graphics.lineBetween(3, -193, 17, -195);
      } else {
        graphics.lineBetween(3, -195, 17, -191);
      }

      // Nariz, boca y protector bucal.
      graphics.fillStyle(c.skinShade, 0.75);
      graphics.fillTriangle(19, -184, 28, -174, 17, -171);
      graphics.fillStyle(0xffdfb8, 0.25);
      graphics.fillTriangle(20, -182, 25, -176, 19, -175);
      graphics.fillStyle(0x3b1214, 0.85);
      graphics.fillRoundedRect(8, -168, 18, 8, 3);
      graphics.fillStyle(this.isPlayer ? 0xbfe9ff : 0xffd3c9, 0.9);
      graphics.fillRoundedRect(10, -167, 14, 4, 2);

      // Sudor y marcas de esfuerzo.
      graphics.fillStyle(0xbfe9ff, 0.65);
      graphics.fillEllipse(24, -192, 3, 5);
      graphics.lineStyle(1, c.skinShade, 0.55);
      graphics.lineBetween(2, -170, 8, -168);
      graphics.lineBetween(-5, -190, -12, -188);
    }

    drawLegsGraphic(time) {
      const c = this.config;
      this.legsBack.clear();
      this.legsFront.clear();

      const velocityX = this.sprite.body ? this.sprite.body.velocity.x : 0;
      const isWalking = this.state === 'walk' && Math.abs(velocityX) > 12;
      let frontFootX = 15;
      let backFootX = -17;
      let frontLift = 0;
      let backLift = 0;
      let crouch = 0;

      if (this.state === 'block') {
        frontFootX = 20;
        backFootX = -23;
        crouch = 3;
      } else if (this.state === 'attack') {
        frontFootX = 21;
        backFootX = -23;
      } else if (this.state === 'hurt') {
        frontFootX = 26;
        backFootX = -19;
      } else if (this.ko) {
        frontFootX = 29;
        backFootX = -10;
      }

      if (isWalking) {
        const swing = Math.sin(this.walkPhase);
        frontFootX += swing * 13;
        backFootX -= swing * 13;
        frontLift = Math.max(0, Math.cos(this.walkPhase)) * 7;
        backLift = Math.max(0, -Math.cos(this.walkPhase)) * 7;
      }

      const drawLeg = (graphics, hipX, footX, lift, skinColor, shoeColor, isFront) => {
        const footY = -2 - lift;
        const ankleX = footX;
        const ankleY = footY - 7;
        const kneeX = (hipX + ankleX) / 2 + (isFront ? 5 : -2);
        const kneeY = -42 - lift * 0.25 + crouch;
        const hipY = -74 + crouch;

        graphics.lineStyle(22, 0x2a120d, 0.8);
        graphics.beginPath();
        graphics.moveTo(hipX, hipY);
        graphics.lineTo(kneeX, kneeY);
        graphics.lineTo(ankleX, ankleY);
        graphics.strokePath();

        graphics.lineStyle(17, skinColor, 1);
        graphics.beginPath();
        graphics.moveTo(hipX, hipY);
        graphics.lineTo(kneeX, kneeY);
        graphics.lineTo(ankleX, ankleY);
        graphics.strokePath();
        graphics.fillStyle(skinColor, 1);
        graphics.fillCircle(kneeX, kneeY, 8.5);
        graphics.fillCircle(ankleX, ankleY, 7);

        // Calcetín alto y zapato.
        graphics.fillStyle(shoeColor, 1);
        graphics.fillRoundedRect(ankleX - 11, ankleY - 2, 22, 11, 4);
        graphics.fillStyle(0xf7ead1, 0.88);
        graphics.fillRoundedRect(ankleX - 11, ankleY - 3, 22, 3, 2);
        graphics.fillStyle(0x08111c, 1);
        graphics.fillRoundedRect(ankleX - 14, footY - 7, 30, 10, 5);
        graphics.fillStyle(c.accent, 0.95);
        graphics.fillRoundedRect(ankleX - 6, footY - 6, 8, 3, 2);
        graphics.fillStyle(0xffffff, 0.2);
        graphics.fillRoundedRect(ankleX - 9, footY - 6, 12, 2, 1);
      };

      drawLeg(this.legsBack, -10, backFootX, backLift, c.skinShade, c.trunksDark, false);
      drawLeg(this.legsFront, 10, frontFootX, frontLift, c.skin, c.trunks, true);

      // Cordones de las botas del pie delantero.
      this.legsFront.lineStyle(1, 0xffffff, 0.23);
      this.legsFront.lineBetween(frontFootX - 4, -10 - frontLift, frontFootX + 5, -10 - frontLift);
      this.legsFront.lineBetween(frontFootX - 3, -7 - frontLift, frontFootX + 6, -7 - frontLift);
    }

    computePunchAmount(progress, attackId) {
      const reachAt = attackId === 'fast' ? 0.28 : 0.37;
      if (progress < 0.12) {
        return -0.12 * Math.sin((progress / 0.12) * (Math.PI / 2));
      }
      if (progress < reachAt) {
        const t = (progress - 0.12) / (reachAt - 0.12);
        return lerp(-0.12, 1, smoothstep(t));
      }
      if (progress < 0.56) return 1;
      return 1 - smoothstep((progress - 0.56) / 0.44);
    }

    drawPose(time, delta = 16) {
      const c = this.config;
      const velocityX = this.sprite.body ? this.sprite.body.velocity.x : 0;
      const moving = this.state === 'walk' && Math.abs(velocityX) > 12;

      if (moving) {
        this.walkPhase += delta * 0.0085;
      }

      let bob = Math.sin(time * 0.0034 + (this.isPlayer ? 0 : 1.7)) * 1.35;
      let crouch = 0;
      let lean = 0;
      let backTarget = { x: -5, y: -156 + bob };
      let frontTarget = { x: 21, y: -158 + bob };
      let shieldAlpha = 0;

      if (this.state === 'walk') {
        bob += -Math.abs(Math.sin(this.walkPhase)) * 2.1;
        backTarget.y += bob;
        frontTarget.y += bob;
      } else if (this.state === 'block') {
        crouch = 3;
        shieldAlpha = 0.95;
        backTarget = { x: 12, y: -176 };
        frontTarget = { x: 25, y: -188 };
      } else if (this.state === 'attack' && this.attack) {
        const { definition, startedAt } = this.attack;
        const progress = clamp01((time - startedAt) / definition.duration);
        const amount = this.computePunchAmount(progress, definition.id);
        lean = Math.max(0, amount) * 4;

        if (definition.id === 'fast') {
          frontTarget = {
            x: lerp(21, definition.visualReach, amount),
            y: -158 - Math.max(0, amount) * 4
          };
          backTarget = { x: -3, y: -160 };
        } else {
          backTarget = {
            x: lerp(-5, definition.visualReach, amount),
            y: -153 - Math.max(0, amount) * 5
          };
          frontTarget = { x: 15, y: -170 };
        }
      } else if (this.state === 'hurt') {
        const shake = Math.sin(time * 0.09) * 2;
        backTarget = { x: -12 + shake, y: -148 };
        frontTarget = { x: 5 + shake, y: -145 };
      } else if (this.state === 'ko') {
        backTarget = { x: -18, y: -128 };
        frontTarget = { x: 20, y: -126 };
      }

      this.currentPose = { bob, crouch, lean, shieldAlpha };

      this.drawLegsGraphic(time);
      this.backArm.clear();
      this.frontArm.clear();
      this.guardShield.clear();

      this.drawArmGraphic(
        this.backArm,
        { x: -14, y: -146 },
        backTarget,
        c.skinShade,
        c.gloveDark,
        c.glove,
        false
      );
      this.drawArmGraphic(
        this.frontArm,
        { x: 14, y: -148 },
        frontTarget,
        c.skin,
        c.glove,
        c.gloveLight,
        true
      );

      if (shieldAlpha > 0) {
        const pulse = 0.65 + Math.sin(time * 0.012) * 0.18;
        const flash = time < this.blockFlashUntil;
        const color = flash ? 0xffffff : c.accent;
        this.guardShield.lineStyle(14, color, flash ? 0.18 : 0.055);
        this.guardShield.beginPath();
        this.guardShield.arc(29, -145, 53, -1.06, 1.06, false);
        this.guardShield.strokePath();
        this.guardShield.lineStyle(2.5, color, flash ? 0.9 : pulse);
        this.guardShield.beginPath();
        this.guardShield.arc(29, -145, 53, -1.06, 1.06, false);
        this.guardShield.strokePath();
        this.guardShield.lineStyle(1, c.accentSoft, 0.33);
        this.guardShield.beginPath();
        this.guardShield.arc(29, -145, 47, -0.95, 0.95, false);
        this.guardShield.strokePath();
      }
    }

    drawArmGraphic(graphics, shoulder, target, skinColor, gloveColor, gloveLight, isFront) {
      const dx = target.x - shoulder.x;
      const dy = target.y - shoulder.y;
      const distance = Math.max(1, Math.hypot(dx, dy));
      const midX = (shoulder.x + target.x) / 2;
      const midY = (shoulder.y + target.y) / 2;
      let normalX = -dy / distance;
      let normalY = dx / distance;
      if (normalY < 0) {
        normalX *= -1;
        normalY *= -1;
      }
      const bend = clamp(21 - Math.max(0, distance - 35) * 0.1, 5, 21);
      const elbowX = midX + normalX * bend;
      const elbowY = midY + normalY * bend + 3;

      // Contorno del brazo.
      graphics.lineStyle(23, 0x25100b, 0.76);
      graphics.beginPath();
      graphics.moveTo(shoulder.x, shoulder.y);
      graphics.lineTo(elbowX, elbowY);
      graphics.lineTo(target.x, target.y);
      graphics.strokePath();

      // Brazo y antebrazo.
      graphics.lineStyle(18, skinColor, 1);
      graphics.beginPath();
      graphics.moveTo(shoulder.x, shoulder.y);
      graphics.lineTo(elbowX, elbowY);
      graphics.strokePath();
      graphics.lineStyle(14, skinColor, 1);
      graphics.beginPath();
      graphics.moveTo(elbowX, elbowY);
      graphics.lineTo(target.x, target.y);
      graphics.strokePath();
      graphics.fillStyle(skinColor, 1);
      graphics.fillCircle(elbowX, elbowY, 8.5);
      graphics.fillCircle(shoulder.x, shoulder.y, 9.5);

      // Muñequera.
      const wristT = 0.78;
      const wristX = lerp(elbowX, target.x, wristT);
      const wristY = lerp(elbowY, target.y, wristT);
      graphics.lineStyle(12, this.config.accent, 0.9);
      graphics.beginPath();
      graphics.moveTo(wristX, wristY - 1);
      graphics.lineTo(target.x, target.y);
      graphics.strokePath();

      // Guante.
      const gloveScale = isFront ? 1 : 0.94;
      const radius = 16 * gloveScale;
      graphics.fillStyle(0x1e0c0a, 0.8);
      graphics.fillCircle(target.x, target.y, radius + 2.5);
      graphics.fillStyle(gloveColor, 1);
      graphics.fillCircle(target.x, target.y, radius);
      graphics.fillStyle(gloveLight, 0.36);
      graphics.fillEllipse(target.x - 4, target.y - 5, 12, 8);
      graphics.fillStyle(gloveColor, 1);
      graphics.fillCircle(target.x + 7, target.y + 9, 5.5);
      graphics.lineStyle(1, 0xffffff, 0.22);
      graphics.strokeCircle(target.x, target.y, radius);

      // Puño del guante.
      graphics.fillStyle(0x1e0c0a, 0.82);
      graphics.fillRoundedRect(target.x - 25, target.y - 8, 17, 17, 5);
      graphics.fillStyle(gloveColor, 0.95);
      graphics.fillRoundedRect(target.x - 23, target.y - 7, 14, 15, 4);
      graphics.fillStyle(COLORS.goldDeep, 0.85);
      graphics.fillRect(target.x - 22, target.y - 3, 12, 2);

      // Brillo del nudillo.
      graphics.lineStyle(1.2, 0xffffff, 0.26);
      graphics.beginPath();
      graphics.arc(target.x - 2, target.y - 1, radius - 4, 3.5, 5.2, false);
      graphics.strokePath();
    }

    syncVisual(time) {
      const bodyX = this.sprite.x;
      if (this.ko) {
        this.visual.x = bodyX;
        this.shadow.x = bodyX;
        return;
      }

      const pose = this.currentPose || { bob: 0, crouch: 0, lean: 0 };
      let shakeX = 0;
      let shakeY = 0;
      let rotation = 0;

      if (this.state === 'hurt') {
        const remaining = clamp01((this.hurtUntil - time) / 260);
        shakeX = Math.sin(time * 0.09) * 4.5 * remaining;
        shakeY = -1.5 * remaining;
        rotation = -0.035 * this.facing * remaining;
      } else if (time < this.blockFlashUntil) {
        shakeX = Math.sin(time * 0.16) * 2.2;
        rotation = 0.015 * this.facing;
      }

      this.visual.x = bodyX + pose.lean * this.facing + shakeX;
      this.visual.y = RING.GROUND_Y + pose.bob + pose.crouch + shakeY;
      this.visual.rotation = rotation;
      this.visual.setScale(this.facing * this.baseScale, this.baseScale);

      this.shadow.x = bodyX;
      const shadowStretch = this.state === 'walk' ? 1.04 : 1;
      this.shadow.scaleX = shadowStretch;
      this.shadow.alpha = this.ko ? 0.22 : 0.42;
    }

    update(time, delta) {
      if (this.ko) {
        this.syncVisual(time);
        return;
      }

      if (this.state === 'hurt' && time >= this.hurtUntil) {
        this.state = this.blocking ? 'block' : 'idle';
      }

      if (this.attack && time >= this.attack.startedAt + this.attack.definition.duration) {
        this.attack = null;
        if (this.state === 'attack') {
          this.state = this.blocking ? 'block' : 'idle';
        }
      }

      this.drawPose(time, delta);
      this.syncVisual(time);
    }

    faceTowards(otherX) {
      if (this.ko) return;
      const nextFacing = otherX >= this.sprite.x ? 1 : -1;
      if (nextFacing !== this.facing) {
        this.facing = nextFacing;
        this.visual.setScale(this.facing * this.baseScale, this.baseScale);
      }
    }

    applyMovement(direction, time) {
      if (this.ko || this.blocking || this.state === 'hurt' || this.state === 'attack') {
        if (this.state === 'walk') this.state = 'idle';
        return;
      }
      const velocity = direction * this.speed;
      this.sprite.setVelocityX(velocity);
      this.state = Math.abs(velocity) > 1 ? 'walk' : 'idle';
    }

    setBlocking(value, time) {
      const allowed = Boolean(value)
        && !this.ko
        && time >= this.hurtUntil
        && !this.attack
        && time >= this.attackLockUntil;

      if (allowed === this.blocking) {
        if (allowed) this.sprite.setVelocityX(0);
        return;
      }

      this.blocking = allowed;
      if (allowed) {
        this.state = 'block';
        this.sprite.setVelocityX(0);
      } else if (this.state === 'block') {
        this.state = 'idle';
      }
    }

    canAct(time) {
      return !this.ko
        && !this.blocking
        && !this.attack
        && time >= this.hurtUntil
        && time >= this.attackLockUntil;
    }

    tryAttack(definition, time) {
      if (!this.canAct(time)) return false;

      this.attack = {
        definition,
        startedAt: time,
        hitDone: false
      };
      this.state = 'attack';
      this.attackLockUntil = time + definition.duration;
      this.sprite.setVelocityX(0);
      return true;
    }

    getActiveAttack(time) {
      if (!this.attack || this.attack.hitDone || this.ko) return null;
      const { definition, startedAt } = this.attack;
      const impactStarts = startedAt + definition.windup;
      if (time >= impactStarts && time <= impactStarts + definition.activeWindow) {
        return this.attack;
      }
      return null;
    }

    markAttackHit() {
      if (this.attack) this.attack.hitDone = true;
    }

    receiveHit(rawDamage, sourceX, time, stunDuration = 240) {
      if (this.ko || this.health <= 0) {
        return { blocked: false, damage: 0, ko: this.ko };
      }

      const wasBlocking = this.blocking;
      const damage = wasBlocking
        ? Math.max(1, Math.round(rawDamage * COMBAT.BLOCK_MULTIPLIER))
        : rawDamage;

      this.health = clamp(this.health - damage, 0, this.maxHealth);

      if (wasBlocking) {
        this.blocks += 1;
        this.blockFlashUntil = time + 180;
        this.hurtUntil = Math.max(this.hurtUntil, time + 80);
      } else {
        this.attack = null;
        this.blocking = false;
        this.state = 'hurt';
        this.hurtUntil = time + stunDuration;
        this.attackLockUntil = Math.max(this.attackLockUntil, time + stunDuration);
        this.sprite.setVelocityX(Math.sign(this.sprite.x - sourceX || 1) * (stunDuration > 270 ? 178 : 112));
        this.sprite.setVelocityY(0);
        this.scene.tweens.add({
          targets: this.visual,
          alpha: { from: 0.58, to: 1 },
          duration: 80,
          yoyo: true,
          repeat: 1
        });
      }

      if (this.health <= 0) {
        this.enterKO(time);
      }

      return { blocked: wasBlocking, damage, ko: this.ko };
    }

    enterKO(time) {
      this.ko = true;
      this.health = 0;
      this.blocking = false;
      this.attack = null;
      this.state = 'ko';
      this.sprite.setVelocity(0, 0);
      if (this.sprite.body) this.sprite.body.enable = false;
      this.guardShield.clear();
      this.drawPose(time, 16);

      this.scene.tweens.add({
        targets: this.visual,
        rotation: this.facing * 1.28,
        y: RING.GROUND_Y + 9,
        duration: 650,
        ease: 'Cubic.easeIn'
      });
      this.scene.tweens.add({
        targets: this.shadow,
        scaleX: 1.22,
        alpha: 0.2,
        duration: 620,
        ease: 'Sine.easeOut'
      });
    }

    getHealthRatio() {
      return clamp01(this.health / this.maxHealth);
    }

  }

  // ------------------------------------------------------------
  // Escena 1: menú principal
  // ------------------------------------------------------------

  class MenuScene extends Phaser.Scene {
    constructor() {
      super('MenuScene');
    }

    preload() {
      // El emblema local demuestra el uso de preload() y funciona en GitHub Pages.
      this.load.svg('ring-logo', 'assets/ring-logo.svg', { width: 200, height: 200 });
      this.load.once(Phaser.Loader.Events.LOAD_ERROR, (file) => {
        console.warn(`No se pudo cargar el recurso opcional: ${file.key}`);
      });
    }

    create() {
      hideLoadingOverlay();
      ensureSharedTextures(this);
      addArenaBase(this, { dim: 0.48, crowdMotion: true });
      addArenaAmbience(this);

      // Placa oscura para dar contraste al título sobre la lona y la pancarta del estadio.
      const titlePlate = this.add.graphics().setDepth(118);
      titlePlate.fillStyle(0x02070d, 0.94);
      titlePlate.fillRoundedRect(62, 150, 676, 121, 9);
      titlePlate.lineStyle(1, COLORS.gold, 0.2);
      titlePlate.strokeRoundedRect(62, 150, 676, 121, 9);
      titlePlate.lineStyle(1, 0xffffff, 0.035);
      titlePlate.strokeRoundedRect(68, 156, 664, 109, 6);
      titlePlate.fillStyle(COLORS.gold, 0.55);
      titlePlate.fillTriangle(62, 150, 76, 150, 62, 164);
      titlePlate.fillTriangle(738, 150, 724, 150, 738, 164);
      titlePlate.fillTriangle(62, 271, 76, 271, 62, 257);
      titlePlate.fillTriangle(738, 271, 724, 271, 738, 257);

      this.transitioning = false;
      this.inputLockedUntil = this.time.now + 260;
      this.cameras.main.fadeIn(450, 0, 0, 0);

      this.ui = this.add.container(0, 0).setDepth(120);

      // Línea superior de campeonato.
      const topEyebrow = makeText(this, 400, 38, 'CAMPEONATO ARCADE  //  2026', {
        size: 10,
        family: FONT_DISPLAY,
        color: '#ffc857',
        letterSpacing: 4,
        stroke: '#07111f',
        strokeThickness: 3
      });
      topEyebrow.setAlpha(0.82);
      this.ui.add(topEyebrow);

      const headerLine = this.add.graphics();
      headerLine.lineStyle(1, COLORS.gold, 0.28);
      headerLine.lineBetween(238, 47, 330, 47);
      headerLine.lineBetween(470, 47, 562, 47);
      headerLine.fillStyle(COLORS.gold, 0.7);
      headerLine.fillCircle(400, 47, 1.8);
      this.ui.add(headerLine);

      // Emblema con halo.
      const logoGlow = this.add.image(400, 108, 'soft-glow')
        .setTint(0x3d91e6)
        .setScale(1.25)
        .setAlpha(0.22);
      this.ui.add(logoGlow);
      this.tweens.add({
        targets: logoGlow,
        alpha: 0.36,
        scaleX: 1.36,
        scaleY: 1.36,
        duration: 2300,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });

      if (this.textures.exists('ring-logo')) {
        const logo = this.add.image(400, 108, 'ring-logo').setDisplaySize(86, 86);
        this.ui.add(logo);
        this.tweens.add({
          targets: logo,
          y: 104,
          duration: 2400,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        });
      } else {
        const fallback = this.add.graphics();
        fallback.fillStyle(COLORS.panel, 1);
        fallback.fillCircle(400, 108, 42);
        fallback.lineStyle(2, COLORS.gold, 0.9);
        fallback.strokeCircle(400, 108, 42);
        fallback.lineStyle(1, COLORS.blueLight, 0.4);
        fallback.strokeCircle(400, 108, 35);
        const fallbackText = makeText(this, 400, 107, 'BA', {
          size: 23,
          family: FONT_DISPLAY,
          color: '#ffc857',
          letterSpacing: 1
        });
        this.ui.add([fallback, fallbackText]);
      }

      // Título y subtítulo.
      const title = makeText(this, 400, 190, 'BOXING ARENA', {
        size: 57,
        family: FONT_DISPLAY,
        color: '#fff6e2',
        letterSpacing: 2.5,
        stroke: '#06101d',
        strokeThickness: 8
      });
      this.ui.add(title);

      const subtitle = makeText(this, 400, 234, 'EL DESAFÍO DEL RING', {
        size: 16,
        family: FONT_DISPLAY,
        color: '#ffc857',
        letterSpacing: 7,
        stroke: '#07111f',
        strokeThickness: 3
      });
      subtitle.setAlpha(0.94);
      this.ui.add(subtitle);

      const ornament = this.add.graphics();
      ornament.lineStyle(1, COLORS.gold, 0.45);
      ornament.lineBetween(284, 257, 380, 257);
      ornament.lineBetween(420, 257, 516, 257);
      ornament.fillStyle(COLORS.gold, 0.9);
      ornament.fillTriangle(400, 252, 406, 257, 400, 262);
      ornament.fillTriangle(400, 252, 394, 257, 400, 262);
      this.ui.add(ornament);

      const modeLabel = makeText(this, 400, 279, 'MODO ARCADE  ·  1 JUGADOR VS CPU', {
        size: 9,
        family: FONT_BODY,
        color: '#bcd8ee',
        letterSpacing: 2.2,
        shadow: false
      });
      modeLabel.setAlpha(0.62);
      this.ui.add(modeLabel);

      // Botón principal.
      this.playButton = createArcadeButton(this, {
        x: 400,
        y: 331,
        width: 304,
        height: 68,
        label: 'JUGAR',
        subtitle: 'VS CPU · 60 SEGUNDOS',
        accent: COLORS.gold,
        onClick: () => this.startGame()
      });
      this.ui.add(this.playButton.container);

      const prompt = makeText(this, 400, 385, 'PRESIONA ESPACIO O HAZ CLIC EN JUGAR', {
        size: 9,
        family: FONT_DISPLAY,
        color: '#ffdc8a',
        letterSpacing: 2.3,
        shadow: false
      });
      prompt.setAlpha(0.7);
      this.ui.add(prompt);
      this.tweens.add({
        targets: prompt,
        alpha: 0.28,
        duration: 1000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });

      // Panel de controles.
      const instructionsPanel = drawPanel(this, 400, 466, 704, 100, COLORS.gold, 0.78);
      this.ui.add(instructionsPanel);

      const controlsTitle = makeText(this, 400, 426, 'CONTROLES', {
        size: 9,
        family: FONT_DISPLAY,
        color: '#ffc857',
        letterSpacing: 3,
        shadow: false
      });
      this.ui.add(controlsTitle);

      const groups = [
        { x: 152, key: '←   →', width: 82, label: 'MOVER' },
        { x: 323, key: 'A', width: 48, label: 'JAB RÁPIDO' },
        { x: 480, key: 'S', width: 48, label: 'GOLPE FUERTE' },
        { x: 640, key: 'D', width: 48, label: 'BLOQUEAR' }
      ];

      groups.forEach((group) => {
        const keycap = drawKeycap(this, group.x, 457, group.width, group.key, group.key === 'D' ? COLORS.blueLight : COLORS.gold);
        const label = makeText(this, group.x, 484, group.label, {
          size: 8,
          family: FONT_BODY,
          color: '#d8e7f4',
          letterSpacing: 1.2,
          shadow: false
        });
        label.setAlpha(0.74);
        this.ui.add([keycap.graphics, keycap.text, label]);
      });

      const objective = makeText(this, 400, 539, 'REDUCE LA SALUD DEL RIVAL A CERO O LIDERA EL MARCADOR AL SONAR LA CAMPANA', {
        size: 8,
        family: FONT_BODY,
        color: '#9fb9ce',
        letterSpacing: 1.1,
        shadow: false
      });
      objective.setAlpha(0.62);
      this.ui.add(objective);

      const footer = makeText(this, 400, 565, '60 SEGUNDOS  ·  100 HP  ·  UN SOLO CAMPEÓN', {
        size: 9,
        family: FONT_DISPLAY,
        color: '#ffc857',
        letterSpacing: 2.6,
        shadow: false
      });
      footer.setAlpha(0.68);
      this.ui.add(footer);

      // Indicadores de esquina.
      const corner = this.add.graphics();
      corner.lineStyle(1, COLORS.gold, 0.25);
      corner.lineBetween(28, 30, 66, 30);
      corner.lineBetween(28, 30, 28, 68);
      corner.lineBetween(772, 30, 734, 30);
      corner.lineBetween(772, 30, 772, 68);
      corner.lineBetween(28, 570, 66, 570);
      corner.lineBetween(28, 570, 28, 532);
      corner.lineBetween(772, 570, 734, 570);
      corner.lineBetween(772, 570, 772, 532);
      this.ui.add(corner);

      // Controles de teclado.
      this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
      this.enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
      this.input.keyboard.addCapture([
        Phaser.Input.Keyboard.KeyCodes.LEFT,
        Phaser.Input.Keyboard.KeyCodes.RIGHT,
        Phaser.Input.Keyboard.KeyCodes.UP,
        Phaser.Input.Keyboard.KeyCodes.DOWN,
        Phaser.Input.Keyboard.KeyCodes.SPACE,
        Phaser.Input.Keyboard.KeyCodes.A,
        Phaser.Input.Keyboard.KeyCodes.S,
        Phaser.Input.Keyboard.KeyCodes.D,
        Phaser.Input.Keyboard.KeyCodes.ENTER
      ]);

      this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown, this);
    }

    startGame() {
      if (this.transitioning) return;
      this.transitioning = true;
      this.playButton.disable();
      this.cameras.main.fadeOut(260, 3, 8, 18);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
        this.scene.start('FightScene');
      });
    }

    update(time) {
      if (this.transitioning || time < this.inputLockedUntil) return;
      if (Phaser.Input.Keyboard.JustDown(this.spaceKey) || Phaser.Input.Keyboard.JustDown(this.enterKey)) {
        this.startGame();
      }
    }

    handleShutdown() {
      this.tweens.killAll();
      this.time.removeAllEvents();
    }
  }

  // ------------------------------------------------------------
  // Escena 2: combate
  // ------------------------------------------------------------

  class FightScene extends Phaser.Scene {
    constructor() {
      super('FightScene');
    }

    preload() {
      // Todas las texturas del combate se generan en create(); no hay cargas remotas.
    }

    create() {
      ensureArenaTextures(this);
      ensureSharedTextures(this);
      addArenaBase(this, { dim: 0.04, crowdMotion: true });
      addArenaAmbience(this);

      this.roundOver = false;
      this.roundStarted = false;
      this.remainingMs = COMBAT.ROUND_MS;
      this.matchStartAt = this.time.now + 1850;
      this.lastTimerSecond = COMBAT.ROUND_MS / 1000;
      this.resultData = null;

      // Boxeadores: el jugador siempre aparece a la izquierda.
      this.player = new Boxer(this, true, COMBAT.PLAYER_START_X);
      this.rival = new Boxer(this, false, COMBAT.RIVAL_START_X);
      this.player.faceTowards(this.rival.sprite.x);
      this.rival.faceTowards(this.player.sprite.x);

      this.createRingBoundaries();

      this.fighterCollider = this.physics.add.collider(this.player.sprite, this.rival.sprite);

      this.createHud();
      this.createInput();
      this.createIntro();
      this.syncFighterDepths();

      this.cameras.main.fadeIn(450, 0, 0, 0);
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown, this);
    }

    createRingBoundaries() {
      // Paredes invisibles de Arcade Physics que impiden salir de la lona.
      const leftWall = this.add.rectangle(118, 452, 16, 250, 0xff0000, 0);
      const rightWall = this.add.rectangle(682, 452, 16, 250, 0xff0000, 0);
      this.physics.add.existing(leftWall, true);
      this.physics.add.existing(rightWall, true);

      this.ringWalls = [leftWall, rightWall];
      this.ringWalls.forEach((wall) => {
        this.physics.add.collider(this.player.sprite, wall);
        this.physics.add.collider(this.rival.sprite, wall);
      });
    }

    createInput() {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.keyA = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
      this.keyS = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
      this.keyD = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
      this.input.keyboard.addCapture([
        Phaser.Input.Keyboard.KeyCodes.LEFT,
        Phaser.Input.Keyboard.KeyCodes.RIGHT,
        Phaser.Input.Keyboard.KeyCodes.UP,
        Phaser.Input.Keyboard.KeyCodes.DOWN,
        Phaser.Input.Keyboard.KeyCodes.SPACE,
        Phaser.Input.Keyboard.KeyCodes.A,
        Phaser.Input.Keyboard.KeyCodes.S,
        Phaser.Input.Keyboard.KeyCodes.D
      ]);
    }

    createIntro() {
      const overlay = this.add.container(0, 0).setDepth(200);
      const shade = this.add.rectangle(400, 300, 800, 600, 0x02060d, 0.58);
      const topRule = this.add.graphics();
      topRule.lineStyle(1, COLORS.gold, 0.55);
      topRule.lineBetween(238, 212, 562, 212);
      topRule.lineBetween(238, 379, 562, 379);
      topRule.fillStyle(COLORS.gold, 0.9);
      topRule.fillCircle(400, 212, 2);
      topRule.fillCircle(400, 379, 2);

      const roundText = makeText(this, 400, 246, 'RONDA ÚNICA', {
        size: 11,
        family: FONT_DISPLAY,
        color: '#ffc857',
        letterSpacing: 5,
        shadow: false
      });

      const versusText = makeText(this, 400, 302, 'AZUL   VS   ROJO', {
        size: 33,
        family: FONT_DISPLAY,
        color: '#fff6e2',
        letterSpacing: 3,
        stroke: '#06101d',
        strokeThickness: 7
      });

      const readyText = makeText(this, 400, 346, '60 SEGUNDOS · 100 HP · UN SOLO CAMPEÓN', {
        size: 9,
        family: FONT_BODY,
        color: '#9fc4df',
        letterSpacing: 1.8,
        shadow: false
      });

      overlay.add([shade, topRule, roundText, versusText, readyText]);
      overlay.setAlpha(0);
      this.tweens.add({
        targets: overlay,
        alpha: 1,
        duration: 240,
        ease: 'Sine.easeOut'
      });
      this.tweens.add({
        targets: versusText,
        scaleX: { from: 1.08, to: 1 },
        scaleY: { from: 1.08, to: 1 },
        duration: 650,
        ease: 'Sine.easeOut'
      });

      this.time.delayedCall(1240, () => {
        this.tweens.add({
          targets: overlay,
          alpha: 0,
          duration: 320,
          ease: 'Sine.easeIn',
          onComplete: () => overlay.destroy()
        });
      });

      this.time.delayedCall(1620, () => this.showFightCallout());
    }

    showFightCallout() {
      if (!this.scene.isActive()) return;
      const callout = makeText(this, 400, 294, '¡PELEA!', {
        size: 48,
        family: FONT_DISPLAY,
        color: '#ffc857',
        letterSpacing: 3,
        stroke: '#07111f',
        strokeThickness: 8
      });
      callout.setDepth(205).setAlpha(0).setScale(0.65);
      this.tweens.add({
        targets: callout,
        alpha: 1,
        scaleX: 1,
        scaleY: 1,
        duration: 170,
        ease: 'Back.easeOut'
      });
      this.tweens.add({
        targets: callout,
        alpha: 0,
        y: 272,
        delay: 620,
        duration: 300,
        ease: 'Sine.easeIn',
        onComplete: () => callout.destroy()
      });
    }

    createHud() {
      this.hud = this.add.container(0, 0).setDepth(100);

      const frame = this.add.graphics();
      frame.fillStyle(0x02070d, 0.88);
      frame.fillRect(0, 0, 800, 104);
      frame.fillStyle(0x061322, 0.94);
      frame.fillRoundedRect(16, 10, 768, 84, 9);
      frame.lineStyle(1.5, COLORS.gold, 0.36);
      frame.strokeRoundedRect(16, 10, 768, 84, 9);
      frame.lineStyle(1, 0xffffff, 0.045);
      frame.strokeRoundedRect(21, 15, 758, 74, 6);

      // Franja de color del jugador y del rival.
      frame.fillStyle(COLORS.blue, 0.8);
      frame.fillRect(16, 91, 334, 3);
      frame.fillStyle(COLORS.red, 0.8);
      frame.fillRect(450, 91, 334, 3);

      // Panel central del temporizador.
      frame.fillStyle(0x040b14, 0.98);
      frame.fillRoundedRect(334, 18, 132, 68, 7);
      frame.lineStyle(1.5, COLORS.gold, 0.72);
      frame.strokeRoundedRect(334, 18, 132, 68, 7);
      frame.fillStyle(COLORS.gold, 0.10);
      frame.fillRoundedRect(338, 22, 124, 25, 4);
      frame.lineStyle(1, COLORS.gold, 0.22);
      frame.lineBetween(344, 83, 456, 83);

      // Pequeños diamantes junto a los nombres.
      frame.fillStyle(COLORS.blue, 1);
      frame.fillTriangle(34, 22, 40, 28, 34, 34);
      frame.fillStyle(COLORS.red, 1);
      frame.fillTriangle(766, 22, 760, 28, 766, 34);

      this.hud.add(frame);

      this.playerNameText = makeText(this, 46, 29, 'TÚ  ·  AZUL', {
        size: 13,
        family: FONT_DISPLAY,
        color: '#dff5ff',
        originX: 0,
        letterSpacing: 1.8,
        shadow: false
      });
      this.rivalNameText = makeText(this, 754, 29, 'RIVAL  ·  ROJO', {
        size: 13,
        family: FONT_DISPLAY,
        color: '#ffe7e2',
        originX: 1,
        letterSpacing: 1.8,
        shadow: false
      });
      this.playerHealthText = makeText(this, 324, 74, '100 HP', {
        size: 9,
        family: FONT_DISPLAY,
        color: '#91d8ff',
        originX: 1,
        letterSpacing: 1,
        shadow: false
      });
      this.rivalHealthText = makeText(this, 476, 74, '100 HP', {
        size: 9,
        family: FONT_DISPLAY,
        color: '#ffa79a',
        originX: 0,
        letterSpacing: 1,
        shadow: false
      });

      const timerCaption = makeText(this, 400, 28, 'TIEMPO', {
        size: 7,
        family: FONT_DISPLAY,
        color: '#c8a85f',
        letterSpacing: 2.2,
        shadow: false
      });
      this.timerText = makeText(this, 400, 53, '60', {
        size: 35,
        family: FONT_DISPLAY,
        color: '#ffc857',
        stroke: '#07111f',
        strokeThickness: 5,
        shadow: false
      });
      this.roundLabel = makeText(this, 400, 79, 'RONDA ÚNICA', {
        size: 7,
        family: FONT_BODY,
        color: '#8fa9be',
        letterSpacing: 1.6,
        shadow: false
      });

      this.hudBarGraphics = this.add.graphics();
      this.hud.add([
        this.playerNameText,
        this.rivalNameText,
        this.playerHealthText,
        this.rivalHealthText,
        timerCaption,
        this.timerText,
        this.roundLabel,
        this.hudBarGraphics
      ]);

      this.hudHealth = {
        playerTrail: COMBAT.MAX_HEALTH,
        rivalTrail: COMBAT.MAX_HEALTH
      };

      this.drawHealthBars();
    }

    update(time, delta) {
      if (!this.player || !this.rival) return;

      this.player.faceTowards(this.rival.sprite.x);
      this.rival.faceTowards(this.player.sprite.x);

      if (!this.roundStarted) {
        if (time >= this.matchStartAt) {
          this.roundStarted = true;
        } else {
          this.player.applyMovement(0, time);
          this.rival.applyMovement(0, time);
          this.player.update(time, delta);
          this.rival.update(time, delta);
          this.updateHud(time, delta);
          return;
        }
      }

      if (this.roundOver) {
        this.player.update(time, Math.min(delta, 60));
        this.rival.update(time, Math.min(delta, 60));
        this.updateHud(time, Math.min(delta, 60));
        return;
      }

      const safeDelta = Math.min(delta, 100);
      this.remainingMs = Math.max(0, this.remainingMs - safeDelta);

      this.updatePlayerControls(time);
      this.updateAI(time);

      this.player.update(time, safeDelta);
      this.rival.update(time, safeDelta);
      this.syncFighterDepths();

      this.checkAttackHits(time);
      this.constrainBoxer(this.player);
      this.constrainBoxer(this.rival);
      this.updateHud(time, safeDelta);

      if (!this.roundOver && this.remainingMs <= 0) {
        this.endMatch('TIME');
      }
    }

    updatePlayerControls(time) {
      const fastPressed = Phaser.Input.Keyboard.JustDown(this.keyA);
      const strongPressed = Phaser.Input.Keyboard.JustDown(this.keyS);
      const blocking = this.keyD.isDown;

      let direction = 0;
      if (this.cursors.left.isDown && !this.cursors.right.isDown) direction = -1;
      if (this.cursors.right.isDown && !this.cursors.left.isDown) direction = 1;

      this.player.setBlocking(blocking, time);

      if (blocking) {
        this.player.applyMovement(0, time);
        return;
      }

      this.player.applyMovement(direction, time);

      // La defensa tiene prioridad: no se puede golpear mientras D esté pulsada.
      if (fastPressed) {
        this.player.tryAttack(COMBAT.FAST, time);
      } else if (strongPressed) {
        this.player.tryAttack(COMBAT.STRONG, time);
      }
    }

    updateAI(time) {
      const rival = this.rival;
      const player = this.player;

      if (!this.ai) {
        this.ai = {
          blockUntil: 0,
          nextBlockAt: time + 1200,
          nextDecisionAt: time + 650,
          nextAttackAt: time + 850,
          retreatUntil: 0
        };
      }

      if (rival.ko || this.roundOver) {
        rival.applyMovement(0, time);
        return;
      }

      if (rival.state === 'hurt' || rival.state === 'attack') {
        return;
      }

      const gap = Math.abs(player.sprite.x - rival.sprite.x);
      const towardPlayer = Math.sign(player.sprite.x - rival.sprite.x) || 1;
      const awayFromPlayer = -towardPlayer;

      // Reacción defensiva: el rival puede cubrirse al detectar un ataque cercano.
      const playerAttack = player.attack;
      const playerIsThreatening = Boolean(playerAttack)
        && time <= playerAttack.startedAt + playerAttack.definition.windup + playerAttack.definition.activeWindow;

      if (time < this.ai.blockUntil) {
        rival.setBlocking(true, time);
        if (rival.blocking) return;
      } else if (rival.blocking) {
        rival.setBlocking(false, time);
      }

      if (
        playerIsThreatening
        && gap < 170
        && time >= this.ai.nextBlockAt
        && rival.canAct(time)
      ) {
        const blockChance = playerAttack.definition.id === 'strong' ? 0.58 : 0.34;
        if (Math.random() < blockChance) {
          this.ai.blockUntil = time + 280 + Math.random() * 240;
          this.ai.nextBlockAt = time + 1450 + Math.random() * 1100;
          rival.setBlocking(true, time);
          return;
        }
        this.ai.nextBlockAt = time + 420;
      }

      // Toma de decisiones periódica, con pausas para no atacar sin descanso.
      if (time >= this.ai.nextDecisionAt) {
        if (gap <= 156) {
          const roll = Math.random();

          if (roll < 0.12 && time >= this.ai.nextBlockAt && rival.canAct(time)) {
            this.ai.blockUntil = time + 320 + Math.random() * 280;
            this.ai.nextBlockAt = time + 1500 + Math.random() * 1000;
            this.ai.nextDecisionAt = time + 520 + Math.random() * 300;
            rival.setBlocking(true, time);
            return;
          }

          if (roll < 0.24) {
            this.ai.retreatUntil = time + 320 + Math.random() * 260;
            this.ai.nextDecisionAt = time + 620 + Math.random() * 320;
          } else if (time >= this.ai.nextAttackAt && rival.canAct(time)) {
            const canReachFast = gap <= COMBAT.FAST.range - 6;
            const canReachStrong = gap <= COMBAT.STRONG.range - 6;
            const preferStrong = Math.random() < 0.34;
            let definition = null;

            if (preferStrong && canReachStrong) {
              definition = COMBAT.STRONG;
            } else if (canReachFast) {
              definition = COMBAT.FAST;
            } else if (canReachStrong) {
              definition = COMBAT.STRONG;
            }

            if (definition && rival.tryAttack(definition, time)) {
              const basePause = definition.id === 'strong' ? 980 : 760;
              this.ai.nextAttackAt = time + basePause + Math.random() * 380;
              this.ai.nextDecisionAt = time + 520 + Math.random() * 260;
              return;
            }
            this.ai.nextDecisionAt = time + 240 + Math.random() * 200;
          } else {
            this.ai.nextDecisionAt = time + 260 + Math.random() * 220;
          }
        } else {
          this.ai.nextDecisionAt = time + 320 + Math.random() * 260;
        }
      }

      // Movimiento: acercarse, mantener distancia de golpe o retroceder.
      let direction = 0;
      if (time < this.ai.retreatUntil) {
        direction = awayFromPlayer;
      } else if (gap > 126) {
        direction = towardPlayer;
      } else if (gap < 80) {
        direction = awayFromPlayer;
      }

      rival.applyMovement(direction, time);
    }

    checkAttackHits(time) {
      this.resolveAttackHit(this.player, this.rival, time);
      if (this.roundOver) return;
      this.resolveAttackHit(this.rival, this.player, time);
    }

    resolveAttackHit(attacker, defender, time) {
      const activeAttack = attacker.getActiveAttack(time);
      if (!activeAttack) return;

      const gap = Math.abs(defender.sprite.x - attacker.sprite.x);
      const attackIsForward = (defender.sprite.x - attacker.sprite.x) * attacker.facing > 0;
      if (gap > activeAttack.definition.range || !attackIsForward) return;

      // Marca el golpe antes de aplicar daño para impedir impactos múltiples.
      attacker.markAttackHit();

      const result = defender.receiveHit(
        activeAttack.definition.damage,
        attacker.sprite.x,
        time,
        activeAttack.definition.stun
      );

      const hitX = defender.sprite.x + defender.facing * 8;
      const hitY = RING.GROUND_Y - 178;

      if (result.blocked) {
        this.spawnBlockEffect(hitX, hitY, defender.config.accent, result.damage);
        this.cameras.main.shake(50, 0.0012);
      } else {
        attacker.hitsLanded += 1;
        this.spawnHitEffect(
          hitX,
          hitY,
          defender.isPlayer ? 0xff6b78 : 0xffd166,
          activeAttack.definition.id === 'strong',
          result.damage
        );
        this.cameras.main.shake(
          activeAttack.definition.id === 'strong' ? 125 : 70,
          activeAttack.definition.shake
        );
        this.flashScreen(defender.isPlayer ? 0xff4d5e : 0xffffff, 0.07);
      }

      if (result.ko) {
        this.endMatch('KO');
      }
    }

    spawnHitEffect(x, y, color, isStrong, damage) {
      const glow = this.add.image(x, y, 'soft-glow')
        .setTint(isStrong ? 0xfff0b0 : color)
        .setScale(isStrong ? 0.3 : 0.2)
        .setAlpha(0.95)
        .setDepth(74)
        .setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({
        targets: glow,
        scaleX: isStrong ? 1.35 : 0.95,
        scaleY: isStrong ? 1.35 : 0.95,
        alpha: 0,
        duration: isStrong ? 280 : 210,
        ease: 'Sine.easeOut',
        onComplete: () => glow.destroy()
      });

      const star = this.add.star(x, y, 8, isStrong ? 9 : 6, isStrong ? 30 : 20, 0xfff3c4, 0.95)
        .setDepth(76)
        .setAngle(Math.random() * 45);
      this.tweens.add({
        targets: star,
        angle: star.angle + (isStrong ? 90 : 45),
        scaleX: 1.7,
        scaleY: 1.7,
        alpha: 0,
        duration: isStrong ? 340 : 250,
        ease: 'Cubic.easeOut',
        onComplete: () => star.destroy()
      });

      const sparkCount = isStrong ? 9 : 5;
      for (let i = 0; i < sparkCount; i += 1) {
        const angle = Math.random() * Math.PI * 2;
        const distance = (isStrong ? 42 : 28) + Math.random() * (isStrong ? 52 : 30);
        const spark = this.add.image(x, y, 'spark')
          .setTint(Math.random() > 0.35 ? 0xfff0bc : color)
          .setScale(0.1 + Math.random() * 0.16)
          .setAlpha(0.9)
          .setDepth(75)
          .setBlendMode(Phaser.BlendModes.ADD);
        this.tweens.add({
          targets: spark,
          x: x + Math.cos(angle) * distance,
          y: y + Math.sin(angle) * distance - 8,
          alpha: 0,
          scaleX: 0.03,
          scaleY: 0.03,
          duration: 260 + Math.random() * 220,
          ease: 'Cubic.easeOut',
          onComplete: () => spark.destroy()
        });
      }

      const damageText = makeText(this, x, y - 18, `-${damage}`, {
        size: isStrong ? 20 : 15,
        family: FONT_DISPLAY,
        color: isStrong ? '#ffdf8a' : '#ffffff',
        stroke: '#07111f',
        strokeThickness: 4,
        shadow: false
      });
      damageText.setDepth(79);
      this.tweens.add({
        targets: damageText,
        y: y - 58,
        alpha: 0,
        duration: 700,
        ease: 'Cubic.easeOut',
        onComplete: () => damageText.destroy()
      });
    }

    spawnBlockEffect(x, y, color, damage) {
      const ring = this.add.circle(x, y, 30, 0x000000, 0)
        .setStrokeStyle(3, color, 0.82)
        .setDepth(76);
      this.tweens.add({
        targets: ring,
        scaleX: 1.8,
        scaleY: 1.8,
        alpha: 0,
        duration: 260,
        ease: 'Cubic.easeOut',
        onComplete: () => ring.destroy()
      });

      const shieldGlow = this.add.image(x, y, 'soft-glow')
        .setTint(color)
        .setScale(0.38)
        .setAlpha(0.4)
        .setDepth(74)
        .setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({
        targets: shieldGlow,
        alpha: 0,
        scaleX: 0.8,
        scaleY: 0.8,
        duration: 250,
        onComplete: () => shieldGlow.destroy()
      });

      const blockText = makeText(this, x, y - 20, `BLOQUEO  -${damage}`, {
        size: 11,
        family: FONT_DISPLAY,
        color: '#bfe9ff',
        stroke: '#07111f',
        strokeThickness: 4,
        letterSpacing: 0.8,
        shadow: false
      });
      blockText.setDepth(79);
      this.tweens.add({
        targets: blockText,
        y: y - 52,
        alpha: 0,
        duration: 650,
        ease: 'Cubic.easeOut',
        onComplete: () => blockText.destroy()
      });
    }

    flashScreen(color, alpha) {
      const flash = this.add.rectangle(400, 300, 800, 600, color, alpha)
        .setDepth(73)
        .setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({
        targets: flash,
        alpha: 0,
        duration: 170,
        ease: 'Sine.easeOut',
        onComplete: () => flash.destroy()
      });
    }

    drawHealthBars() {
      const graphics = this.hudBarGraphics;
      if (!graphics || !this.player || !this.rival) return;
      graphics.clear();

      const playerRatio = this.player.getHealthRatio();
      const rivalRatio = this.rival.getHealthRatio();
      const playerTrail = clamp01(this.hudHealth.playerTrail / COMBAT.MAX_HEALTH);
      const rivalTrail = clamp01(this.hudHealth.rivalTrail / COMBAT.MAX_HEALTH);

      const drawBar = (x, y, width, height, ratio, trail, accent, accentLight, isRight) => {
        graphics.fillStyle(0x02070d, 0.96);
        graphics.fillRoundedRect(x, y, width, height, 4);
        graphics.lineStyle(1, accent, 0.44);
        graphics.strokeRoundedRect(x, y, width, height, 4);

        const innerX = x + 2;
        const innerY = y + 2;
        const innerWidth = width - 4;
        const innerHeight = height - 4;

        // Estela de daño reciente.
        if (trail > ratio) {
          const ghostWidth = innerWidth * trail;
          const ghostX = isRight ? innerX + innerWidth - ghostWidth : innerX;
          graphics.fillStyle(0xffd166, 0.28);
          graphics.fillRect(ghostX, innerY, ghostWidth, innerHeight);
        }

        if (ratio > 0) {
          const fillWidth = Math.max(2, innerWidth * ratio);
          const fillX = isRight ? innerX + innerWidth - fillWidth : innerX;
          graphics.fillStyle(accent, 1);
          graphics.fillRect(fillX, innerY, fillWidth, innerHeight);
          graphics.fillStyle(accentLight, 0.32);
          graphics.fillRect(fillX, innerY, fillWidth, 3);
          graphics.fillStyle(0x02070d, 0.18);
          graphics.fillRect(fillX, innerY + innerHeight - 3, fillWidth, 3);

          graphics.fillStyle(0xffffff, 0.34);
          const edgeX = isRight ? fillX + fillWidth - 2 : fillX;
          graphics.fillRect(edgeX, innerY, 2, innerHeight);
        }

        // Segmentos de salud.
        graphics.lineStyle(1, 0x000000, 0.32);
        for (let i = 1; i < 10; i += 1) {
          const segmentX = innerX + (innerWidth * i) / 10;
          graphics.lineBetween(segmentX, innerY + 1, segmentX, innerY + innerHeight - 1);
        }

        graphics.lineStyle(1, 0xffffff, 0.1);
        graphics.lineBetween(innerX, innerY + 1, innerX + innerWidth, innerY + 1);

        // Pequeño indicador en el extremo.
        graphics.fillStyle(accent, 0.9);
        graphics.fillCircle(isRight ? x + width - 6 : x + 6, y + height + 9, 1.5);
      };

      drawBar(34, 42, 290, 20, playerRatio, playerTrail, COLORS.blue, COLORS.blueLight, false);
      drawBar(476, 42, 290, 20, rivalRatio, rivalTrail, COLORS.red, COLORS.redLight, true);
    }

    updateHud(time, delta) {
      if (!this.player || !this.rival) return;

      const follow = Math.min(1, Math.max(0.015, delta * 0.0048));
      if (this.hudHealth.playerTrail > this.player.health) {
        this.hudHealth.playerTrail = Math.max(
          this.player.health,
          this.hudHealth.playerTrail + (this.player.health - this.hudHealth.playerTrail) * follow
        );
      } else {
        this.hudHealth.playerTrail = this.player.health;
      }
      if (this.hudHealth.rivalTrail > this.rival.health) {
        this.hudHealth.rivalTrail = Math.max(
          this.rival.health,
          this.hudHealth.rivalTrail + (this.rival.health - this.hudHealth.rivalTrail) * follow
        );
      } else {
        this.hudHealth.rivalTrail = this.rival.health;
      }

      const playerHp = Math.max(0, Math.ceil(this.player.health));
      const rivalHp = Math.max(0, Math.ceil(this.rival.health));
      const playerLabel = `${playerHp} HP`;
      const rivalLabel = `${rivalHp} HP`;
      if (this.playerHealthText.text !== playerLabel) this.playerHealthText.setText(playerLabel);
      if (this.rivalHealthText.text !== rivalLabel) this.rivalHealthText.setText(rivalLabel);

      const seconds = Math.max(0, Math.ceil(this.remainingMs / 1000));
      const timerLabel = String(seconds).padStart(2, '0');
      if (this.timerText.text !== timerLabel) this.timerText.setText(timerLabel);
      if (this.lastTimerSecond !== seconds) this.lastTimerSecond = seconds;

      const lowTime = seconds <= 10 && !this.roundOver;
      if (lowTime) {
        this.timerText.setColor('#ff7373');
        this.timerText.setScale(1 + Math.sin(time * 0.014) * 0.025);
        if (this.roundLabel.text !== 'ÚLTIMOS SEGUNDOS') {
          this.roundLabel.setText('ÚLTIMOS SEGUNDOS');
          this.roundLabel.setColor('#ff9a8a');
        }
      } else {
        this.timerText.setColor(this.roundOver && seconds === 0 ? '#ff7373' : '#ffc857');
        this.timerText.setScale(1);
        if (!this.roundOver && this.roundLabel.text !== 'RONDA ÚNICA') {
          this.roundLabel.setText('RONDA ÚNICA');
          this.roundLabel.setColor('#8fa9be');
        }
      }

      this.drawHealthBars();
    }

    endMatch(reason) {
      if (this.roundOver) return;
      this.roundOver = true;
      if (reason === 'TIME') this.remainingMs = 0;

      this.player.attack = null;
      this.rival.attack = null;
      this.player.blocking = false;
      this.rival.blocking = false;
      this.player.guardShield.clear();
      this.rival.guardShield.clear();

      if (!this.player.ko) {
        this.player.state = 'idle';
        this.player.hurtUntil = 0;
        this.player.attackLockUntil = this.time.now + 9999;
        this.player.sprite.setVelocity(0, 0);
      }
      if (!this.rival.ko) {
        this.rival.state = 'idle';
        this.rival.hurtUntil = 0;
        this.rival.attackLockUntil = this.time.now + 9999;
        this.rival.sprite.setVelocity(0, 0);
      }

      let outcome = 'draw';
      if (this.player.health > this.rival.health) outcome = 'win';
      if (this.player.health < this.rival.health) outcome = 'lose';

      this.resultData = {
        outcome,
        reason,
        playerHealth: Math.max(0, Math.round(this.player.health)),
        rivalHealth: Math.max(0, Math.round(this.rival.health)),
        remainingSeconds: Math.max(0, Math.ceil(this.remainingMs / 1000)),
        playerHits: this.player.hitsLanded,
        rivalHits: this.rival.hitsLanded,
        playerBlocks: this.player.blocks,
        rivalBlocks: this.rival.blocks
      };

      this.cameras.main.shake(160, 0.0045);
      this.flashScreen(reason === 'KO' ? 0xffd166 : 0xbfe9ff, 0.16);
      this.showEndCallout(
        reason === 'KO' ? '¡K.O.!' : 'TIEMPO',
        reason === 'KO' ? 'FUERA DE COMBATE' : 'DECISIÓN DE LOS JUECES',
        reason === 'KO' ? '#ffcf6e' : '#bfe9ff'
      );
      this.updateHud(this.time.now, 16);

      this.time.delayedCall(1850, () => {
        if (!this.scene.isActive()) return;
        this.cameras.main.fadeOut(450, 2, 6, 13);
        this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
          this.scene.start('ResultScene', this.resultData);
        });
      });
    }

    showEndCallout(titleValue, subtitleValue, colorHex) {
      const banner = this.add.container(0, 0).setDepth(210).setAlpha(0);
      const backdrop = this.add.rectangle(400, 293, 800, 126, 0x02060d, 0.58);
      const lineGraphics = this.add.graphics();
      lineGraphics.lineStyle(1.5, COLORS.gold, 0.55);
      lineGraphics.lineBetween(246, 236, 554, 236);
      lineGraphics.lineBetween(246, 350, 554, 350);
      lineGraphics.fillStyle(COLORS.gold, 0.85);
      lineGraphics.fillCircle(400, 236, 2.2);
      lineGraphics.fillCircle(400, 350, 2.2);

      const title = makeText(this, 400, 285, titleValue, {
        size: 61,
        family: FONT_DISPLAY,
        color: colorHex,
        letterSpacing: 4,
        stroke: '#07111f',
        strokeThickness: 9
      });
      const subtitle = makeText(this, 400, 331, subtitleValue, {
        size: 9,
        family: FONT_DISPLAY,
        color: '#f7ead1',
        letterSpacing: 3.4,
        shadow: false
      });

      banner.add([backdrop, lineGraphics, title, subtitle]);
      this.tweens.add({
        targets: banner,
        alpha: 1,
        duration: 240,
        ease: 'Sine.easeOut'
      });
      this.tweens.add({
        targets: title,
        scaleX: { from: 0.74, to: 1 },
        scaleY: { from: 0.74, to: 1 },
        duration: 380,
        ease: 'Back.easeOut'
      });
    }

    constrainBoxer(boxer) {
      if (!boxer || !boxer.sprite || !boxer.sprite.body || boxer.ko) return;
      if (!boxer.sprite.body.enable) return;
      const clampedX = clamp(boxer.sprite.x, RING.MIN_X, RING.MAX_X);
      if (Math.abs(clampedX - boxer.sprite.x) > 0.1) {
        boxer.sprite.body.reset(clampedX, boxer.sprite.y);
      }
    }

    syncFighterDepths() {
      const playerDepth = this.player.ko ? 9 : this.player.state === 'attack' ? 16 : 12;
      const rivalDepth = this.rival.ko ? 9 : this.rival.state === 'attack' ? 16 : 11;
      this.player.visual.setDepth(playerDepth);
      this.rival.visual.setDepth(rivalDepth);
    }

    handleShutdown() {
      this.tweens.killAll();
      this.time.removeAllEvents();
    }

  }

  // ------------------------------------------------------------
  // Escena 3: resultado
  // ------------------------------------------------------------

  class ResultScene extends Phaser.Scene {
    constructor() {
      super('ResultScene');
    }

    preload() {
      // Sin recursos externos: se reutilizan las texturas generadas del combate.
    }

    create(data = {}) {
      ensureArenaTextures(this);
      ensureSharedTextures(this);
      addArenaBase(this, { dim: 0.6, crowdMotion: true });
      addArenaAmbience(this);

      const result = {
        outcome: ['win', 'lose', 'draw'].includes(data.outcome) ? data.outcome : 'draw',
        reason: data.reason === 'KO' ? 'KO' : 'TIME',
        playerHealth: Number.isFinite(data.playerHealth) ? data.playerHealth : 0,
        rivalHealth: Number.isFinite(data.rivalHealth) ? data.rivalHealth : 0,
        remainingSeconds: Number.isFinite(data.remainingSeconds) ? data.remainingSeconds : 0,
        playerHits: Number.isFinite(data.playerHits) ? data.playerHits : 0,
        rivalHits: Number.isFinite(data.rivalHits) ? data.rivalHits : 0,
        playerBlocks: Number.isFinite(data.playerBlocks) ? data.playerBlocks : 0,
        rivalBlocks: Number.isFinite(data.rivalBlocks) ? data.rivalBlocks : 0
      };
      this.result = result;
      this.transitioning = false;
      this.inputLockedUntil = this.time.now + 320;
      this.cameras.main.fadeIn(450, 0, 0, 0);

      const palette = {
        win: { main: '#ffd77a', glow: 0xffc857, accent: COLORS.gold },
        lose: { main: '#ff929d', glow: 0xff4d5e, accent: COLORS.red },
        draw: { main: '#c7ecff', glow: 0x2e8cff, accent: COLORS.blue }
      }[result.outcome];

      const titleByOutcome = { win: 'VICTORIA', lose: 'DERROTA', draw: 'EMPATE' };
      const messageByOutcome = {
        win: result.reason === 'KO'
          ? 'Has derribado al rival y el público corea tu nombre. El cinturón de Boxing Arena es tuyo.'
          : 'Ganaste por decisión de los jueces. Administraste la distancia y golpeaste en el momento exacto.',
        lose: result.reason === 'KO'
          ? 'El rival te superó por nocaut. Protege tu guardia, mide la distancia y busca la revancha.'
          : 'Los jueces dieron la ventaja al rival. Ajusta tu ritmo y no regales los últimos segundos.',
        draw: 'Los jueces no pudieron separarlos. El ring exige un desempate: vuelve a subir y define el combate.'
      };

      this.createCelebration(result.outcome);

      this.ui = this.add.container(0, 0).setDepth(120);

      const topGlow = this.add.image(400, 152, 'soft-glow')
        .setTint(palette.glow)
        .setScale(5.4, 2.35)
        .setAlpha(0.16);
      this.ui.add(topGlow);
      this.tweens.add({
        targets: topGlow,
        alpha: 0.27,
        duration: 2200,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });

      const eyebrow = makeText(this, 400, 32, 'RESULTADO DEL COMBATE', {
        size: 10,
        family: FONT_DISPLAY,
        color: '#ffc857',
        letterSpacing: 3.6,
        shadow: false
      });
      eyebrow.setAlpha(0.85);
      this.ui.add(eyebrow);

      if (this.textures.exists('ring-logo')) {
        const logo = this.add.image(400, 79, 'ring-logo').setDisplaySize(52, 52);
        this.ui.add(logo);
      }

      const title = makeText(this, 400, 143, titleByOutcome[result.outcome], {
        size: 62,
        family: FONT_DISPLAY,
        color: palette.main,
        letterSpacing: 4,
        stroke: '#07111f',
        strokeThickness: 9
      });
      this.ui.add(title);
      this.tweens.add({
        targets: title,
        scaleX: { from: 0.92, to: 1 },
        scaleY: { from: 0.92, to: 1 },
        duration: 520,
        ease: 'Back.easeOut'
      });

      const clock = this.formatClock(result.remainingSeconds);
      const reasonLabel = result.reason === 'KO'
        ? `K.O.  ·  QUEDABAN ${clock}`
        : 'DECISIÓN  ·  60 SEGUNDOS COMPLETADOS';
      const badge = this.add.graphics();
      badge.fillStyle(0x061321, 0.92);
      badge.fillRoundedRect(276, 181, 248, 27, 6);
      badge.lineStyle(1, palette.accent, 0.55);
      badge.strokeRoundedRect(276, 181, 248, 27, 6);
      badge.fillStyle(palette.accent, 0.7);
      badge.fillTriangle(256, 194.5, 266, 188, 266, 201);
      badge.fillTriangle(544, 194.5, 534, 188, 534, 201);
      this.ui.add(badge);
      const reasonText = makeText(this, 400, 195, reasonLabel, {
        size: 9,
        family: FONT_DISPLAY,
        color: '#e9f6ff',
        letterSpacing: 1.8,
        shadow: false
      });
      this.ui.add(reasonText);

      const message = makeText(this, 400, 229, messageByOutcome[result.outcome], {
        size: 13,
        family: FONT_BODY,
        color: '#cfe2f1',
        align: 'center',
        shadow: false
      });
      message.setWordWrapWidth(550, true);
      message.setLineSpacing(5);
      message.setAlpha(0.9);
      this.ui.add(message);

      const summaryLabel = makeText(this, 400, 284, 'RESUMEN DEL COMBATE', {
        size: 8,
        family: FONT_DISPLAY,
        color: '#94b0c7',
        letterSpacing: 2.4,
        shadow: false
      });
      this.ui.add(summaryLabel);

      const cardY = 334;
      this.createStatCard(158, cardY, 'TU SALUD', `${result.playerHealth} HP`, COLORS.blue);
      this.createStatCard(310, cardY, 'SALUD RIVAL', `${result.rivalHealth} HP`, COLORS.red);
      this.createStatCard(462, cardY, 'GOLPES CONECTADOS', String(result.playerHits), COLORS.gold);
      this.createStatCard(614, cardY, 'BLOQUEOS', String(result.playerBlocks), COLORS.green);

      this.replayButton = createArcadeButton(this, {
        x: 256,
        y: 444,
        width: 252,
        height: 62,
        label: 'VOLVER A JUGAR',
        accent: COLORS.gold,
        labelSize: 17,
        onClick: () => this.goToFight()
      });
      this.menuButton = createArcadeButton(this, {
        x: 544,
        y: 444,
        width: 252,
        height: 62,
        label: 'MENÚ PRINCIPAL',
        accent: COLORS.blueLight,
        labelSize: 17,
        onClick: () => this.goToMenu()
      });
      this.ui.add([this.replayButton.container, this.menuButton.container]);

      const hint = makeText(this, 400, 500, 'ESPACIO: REVANCHA   ·   ESC: MENÚ PRINCIPAL', {
        size: 9,
        family: FONT_DISPLAY,
        color: '#c6dceb',
        letterSpacing: 1.9,
        shadow: false
      });
      hint.setAlpha(0.62);
      this.ui.add(hint);

      const footer = makeText(this, 400, 548, `BOXING ARENA  ·  EL DESAFÍO DEL RING  ·  ${clock}`, {
        size: 8,
        family: FONT_BODY,
        color: '#ffc857',
        letterSpacing: 2,
        shadow: false
      });
      footer.setAlpha(0.48);
      this.ui.add(footer);

      const corner = this.add.graphics();
      corner.lineStyle(1, palette.accent, 0.25);
      corner.lineBetween(28, 24, 64, 24);
      corner.lineBetween(28, 24, 28, 60);
      corner.lineBetween(772, 24, 736, 24);
      corner.lineBetween(772, 24, 772, 60);
      corner.lineBetween(28, 576, 64, 576);
      corner.lineBetween(28, 576, 28, 540);
      corner.lineBetween(772, 576, 736, 576);
      corner.lineBetween(772, 576, 772, 540);
      this.ui.add(corner);

      this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
      this.enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
      this.escapeKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
      this.input.keyboard.addCapture([
        Phaser.Input.Keyboard.KeyCodes.LEFT,
        Phaser.Input.Keyboard.KeyCodes.RIGHT,
        Phaser.Input.Keyboard.KeyCodes.UP,
        Phaser.Input.Keyboard.KeyCodes.DOWN,
        Phaser.Input.Keyboard.KeyCodes.SPACE,
        Phaser.Input.Keyboard.KeyCodes.ENTER,
        Phaser.Input.Keyboard.KeyCodes.ESC
      ]);

      this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown, this);
    }

    formatClock(secondsValue) {
      const safeSeconds = Math.max(0, Math.floor(secondsValue));
      const minutes = String(Math.floor(safeSeconds / 60)).padStart(2, '0');
      const seconds = String(safeSeconds % 60).padStart(2, '0');
      return `${minutes}:${seconds}`;
    }

    createCelebration(outcome) {
      if (outcome === 'lose') {
        const emberColors = [0xff4d5e, 0xff7d63, 0xffc857, 0x8d1828];
        for (let i = 0; i < 28; i += 1) {
          const x = 40 + Math.random() * 720;
          const y = 575 + Math.random() * 80;
          const ember = this.add.circle(
            x,
            y,
            1 + Math.random() * 2.5,
            emberColors[Math.floor(Math.random() * emberColors.length)],
            0.35 + Math.random() * 0.35
          ).setDepth(82);
          this.tweens.add({
            targets: ember,
            y: -30 - Math.random() * 120,
            x: x + (Math.random() - 0.5) * 90,
            alpha: 0,
            duration: 4500 + Math.random() * 4500,
            delay: Math.random() * 3000,
            repeat: -1,
            ease: 'Sine.easeInOut'
          });
        }
        return;
      }

      const colors = outcome === 'win'
        ? [0xffc857, 0x2e8cff, 0xfff0b8, 0xffffff, 0xff4d5e]
        : [0x2e8cff, 0xff4d5e, 0xffc857, 0xbfe9ff, 0xffffff];

      for (let i = 0; i < 38; i += 1) {
        const confetti = this.add.rectangle(
          20 + Math.random() * 760,
          -80 + Math.random() * 620,
          3 + Math.random() * 6,
          8 + Math.random() * 10,
          colors[Math.floor(Math.random() * colors.length)],
          0.55 + Math.random() * 0.4
        ).setDepth(82).setAngle(Math.random() * 180);

        this.tweens.add({
          targets: confetti,
          y: 660,
          x: confetti.x + (Math.random() - 0.5) * 140,
          angle: confetti.angle + 360 + Math.random() * 540,
          duration: 4800 + Math.random() * 5000,
          delay: Math.random() * 5200,
          repeat: -1,
          ease: 'Linear'
        });
      }
    }

    createStatCard(x, y, label, value, accent) {
      const panel = drawPanel(this, x, y, 138, 82, accent, 0.82);
      const labelText = makeText(this, x, y - 20, label, {
        size: 7,
        family: FONT_DISPLAY,
        color: '#b8cce0',
        letterSpacing: 1.2,
        shadow: false
      });
      const valueText = makeText(this, x, y + 8, value, {
        size: 24,
        family: FONT_DISPLAY,
        color: `#${accent.toString(16).padStart(6, '0')}`,
        stroke: '#07111f',
        strokeThickness: 4,
        shadow: false
      });
      this.ui.add([panel, labelText, valueText]);
    }

    goToFight() {
      if (this.transitioning) return;
      this.transitioning = true;
      this.replayButton.disable();
      this.menuButton.disable();
      this.cameras.main.fadeOut(260, 3, 8, 18);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
        this.scene.start('FightScene');
      });
    }

    goToMenu() {
      if (this.transitioning) return;
      this.transitioning = true;
      this.replayButton.disable();
      this.menuButton.disable();
      this.cameras.main.fadeOut(260, 3, 8, 18);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
        this.scene.start('MenuScene');
      });
    }

    update(time) {
      if (this.transitioning || time < this.inputLockedUntil) return;
      if (Phaser.Input.Keyboard.JustDown(this.spaceKey) || Phaser.Input.Keyboard.JustDown(this.enterKey)) {
        this.goToFight();
      } else if (Phaser.Input.Keyboard.JustDown(this.escapeKey)) {
        this.goToMenu();
      }
    }

    handleShutdown() {
      this.tweens.killAll();
      this.time.removeAllEvents();
    }
  }

  // ------------------------------------------------------------
  // Configuración e inicialización de Phaser
  // ------------------------------------------------------------

  const config = {
    type: Phaser.AUTO,
    parent: 'game-container',
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: '#03070e',
    scene: [MenuScene, FightScene, ResultScene],
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: 0 },
        debug: false
      }
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: GAME_WIDTH,
      height: GAME_HEIGHT
    },
    render: {
      antialias: true,
      pixelArt: false,
      roundPixels: false
    },
    fps: {
      target: 60,
      forceSetTimeOut: false
    }
  };

  try {
    const game = new Phaser.Game(config);
    window.boxingArenaGame = game;
    window.__BOXING_ARENA_VERSION__ = '1.0.0';

    // Mensaje de ayuda si el motor no llega a iniciar por un bloqueo de red.
    window.setTimeout(() => {
      if (!window.__BOXING_ARENA_READY__ && !window.__BOXING_ARENA_ERROR__) {
        showFatalError('El juego no pudo iniciarse. Abre el proyecto con Live Server y verifica que Phaser 3.90.0 se cargue correctamente.');
      }
    }, 20000);
  } catch (error) {
    console.error('Error al inicializar Boxing Arena:', error);
    showFatalError(`Ocurrió un error al iniciar Phaser: ${error.message}`);
  }
})();
