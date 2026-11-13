// ==================== SPAWNOWANIE ELEMENTÓW, PRZECIWNIKÓW I PICKUPÓW ====================

function spawnAmmoPickup(x, y, amount) {
  ammoPickups.push({
    x: Math.max(30, Math.min(canvas.width - 30, x)),
    y: Math.max(30, Math.min(canvas.height - 30, y)),
    amount,
    radius: 15,
    pulse: Math.random() * Math.PI * 2
  });
}

function spawnRandomMapAmmo() {
  for (let tries = 0; tries < 20; tries++) {
    const rx = 60 + Math.random() * (canvas.width - 120);
    const ry = 60 + Math.random() * (canvas.height - 120);
    if (canMoveTo(rx, ry, 22) && Math.hypot(rx - player.x, ry - player.y) > 90) {
      spawnAmmoPickup(rx, ry, 10);
      popups.push({ x: rx, y: ry - 15, text: '📦 +10 NABOJÓW!', color: '#38bdf8', alpha: 1 });
      return;
    }
  }
}

function spawnRocketPickup(x, y) {
  rocketPickups.push({
    x: Math.max(35, Math.min(canvas.width - 35, x)),
    y: Math.max(35, Math.min(canvas.height - 35, y)),
    radius: 16,
    pulse: Math.random() * Math.PI * 2
  });
}

function spawnRandomMapRocket() {
  for (let tries = 0; tries < 20; tries++) {
    const rx = 65 + Math.random() * (canvas.width - 130);
    const ry = 65 + Math.random() * (canvas.height - 130);
    if (canMoveTo(rx, ry, 22) && Math.hypot(rx - player.x, ry - player.y) > 90) {
      spawnRocketPickup(rx, ry);
      popups.push({ x: rx, y: ry - 16, text: '🚀 +1 RAKIETA DO BAZOOKI!', color: '#fb923c', alpha: 1 });
      return;
    }
  }
}

function spawnClouds(count) {
  clouds = [];
  const w = Math.round(canvas.width * 0.20);  // ok. 20% szerokości mapy (~188 px)
  const h = Math.round(canvas.height * 0.20); // ok. 20% wysokości mapy (~112 px)
  const presetCenters = [
    { x: canvas.width * 0.34, y: canvas.height * 0.38 },
    { x: canvas.width * 0.68, y: canvas.height * 0.56 },
    { x: canvas.width * 0.48, y: canvas.height * 0.26 }
  ];
  for (let i = 0; i < count; i++) {
    const base = presetCenters[i % presetCenters.length];
    const cx = base.x + (Math.random() - 0.5) * 60;
    const cy = base.y + (Math.random() - 0.5) * 45;
    const puffs = [
      { ox: -w * 0.28, oy: -h * 0.12, rx: w * 0.26, ry: h * 0.32, phaseOffset: 0 },
      { ox: w * 0.28,  oy: -h * 0.10, rx: w * 0.27, ry: h * 0.32, phaseOffset: 1.5 },
      { ox: -w * 0.20, oy: h * 0.18,  rx: w * 0.28, ry: h * 0.28, phaseOffset: 3.0 },
      { ox: w * 0.22,  oy: h * 0.16,  rx: w * 0.28, ry: h * 0.29, phaseOffset: 4.5 },
      { ox: 0,         oy: -h * 0.22, rx: w * 0.31, ry: h * 0.30, phaseOffset: 2.2 }
    ];
    const driftAngle = Math.random() * Math.PI * 2;
    clouds.push({
      x: cx,
      y: cy,
      w,
      h,
      vx: Math.cos(driftAngle) * 0.28,
      vy: Math.sin(driftAngle) * 0.22,
      phase: Math.random() * Math.PI * 2,
      puffs
    });
  }
}

let enemyIdCounter = 0;

function spawnEnemyAt(x, y, kind = 'normal', index = 0) {
  const stats = typeof getEnemyKindStats === 'function' ? getEnemyKindStats(kind, index) : {
    maxHits: 1, radius: 16, shirtColor: '#ef4444', speed: 1.7, shootTimer: 60, mineImmune: false
  };

  let ex = x;
  let ey = y;
  if (!canMoveTo(ex, ey, stats.radius)) {
    for (let r = 12; r <= 90; r += 16) {
      let found = false;
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
        const tx = ex + Math.cos(a) * r;
        const ty = ey + Math.sin(a) * r;
        if (canMoveTo(tx, ty, stats.radius)) {
          ex = tx;
          ey = ty;
          found = true;
          break;
        }
      }
      if (found) break;
    }
  }

  enemies.push({
    id: ++enemyIdCounter,
    x: ex,
    y: ey,
    vx: 0,
    vy: 0,
    kind,
    hp: stats.maxHits,
    maxHp: stats.maxHits,
    mineImmune: stats.mineImmune,
    speed: stats.speed,
    radius: stats.radius,
    angle: Math.PI / 2,
    walkCycle: Math.random() * 10,
    shirtColor: stats.shirtColor,
    splatColor: null,
    changeDirTimer: 0,
    boxMinX: ex,
    boxMaxX: ex,
    boxMinY: ey,
    boxMaxY: ey,
    stuckFrames: 0,
    aiState: 'normal',
    aiStateTimer: 0,
    repositionCooldown: 0,
    repositionTarget: null,
    orbitSign: Math.random() < 0.5 ? 1 : -1,
    shootTimer: stats.shootTimer,
    mineTimer: 15 * 60,
    shieldAngle: Math.PI / 2,
    dodgeTimer: 0,
    dodgeVx: 0,
    dodgeVy: 0,
    dodgeSign: Math.random() < 0.5 ? 1 : -1
  });
}

function getFarSpawnSpot(px, py) {
  const candidateSpots = [
    { x: 470, y: 65 },
    { x: 95, y: 75 },
    { x: 845, y: 75 },
    { x: 80, y: 260 },
    { x: 860, y: 260 },
    { x: 260, y: 65 },
    { x: 680, y: 65 },
    { x: 95, y: 490 },
    { x: 845, y: 490 },
    { x: 470, y: 495 }
  ];
  let bestSpot = null;
  let bestDist = -1;

  for (const s of candidateSpots) {
    const d = Math.hypot(s.x - px, s.y - py);
    if (d > bestDist && canMoveTo(s.x, s.y, 22)) {
      bestDist = d;
      bestSpot = s;
    }
  }

  for (let tries = 0; tries < 45; tries++) {
    const rx = 80 + Math.random() * (canvas.width - 160);
    const ry = 70 + Math.random() * (canvas.height - 140);
    const d = Math.hypot(rx - px, ry - py);
    if (d >= 340 && canMoveTo(rx, ry, 22)) {
      let onMine = false;
      for (const m of placedMines) {
        if (Math.hypot(rx - m.x, ry - m.y) < m.blastRadius + 25) { onMine = true; break; }
      }
      if (!onMine) return { x: rx, y: ry };
    }
  }

  return bestSpot || { x: 470, y: 65 };
}

function spawnEnemy(index, kind = 'normal') {
  const spots = [
    { x: 470, y: 65 },
    { x: 95, y: 75 },
    { x: 845, y: 75 },
    { x: 80, y: 260 },
    { x: 860, y: 260 },
    { x: 260, y: 65 },
    { x: 680, y: 65 },
    { x: 95, y: 345 },
    { x: 845, y: 345 }
  ];
  const spot = spots[index % spots.length];
  const ex = spot.x + (Math.random() - 0.5) * 24;
  const ey = spot.y + (Math.random() - 0.5) * 24;
  spawnEnemyAt(ex, ey, kind, index);
}

function spawnCivilian(index = 0) {
  const radius = 15;
  let cx = 470;
  let cy = 280;
  let found = false;

  for (let tries = 0; tries < 50; tries++) {
    const rx = 70 + Math.random() * (canvas.width - 140);
    const ry = 70 + Math.random() * (canvas.height - 140);
    if (!canMoveTo(rx, ry, radius + 8)) continue;
    if (Math.hypot(rx - player.x, ry - player.y) < 110) continue;

    let nearArmedMine = false;
    for (const m of placedMines) {
      if (m.armed && Math.hypot(rx - m.x, ry - m.y) < m.blastRadius + 35) {
        nearArmedMine = true;
        break;
      }
    }
    if (nearArmedMine) continue;

    cx = rx;
    cy = ry;
    found = true;
    break;
  }

  if (!found) {
    const fallbackSpots = [
      { x: 240, y: 170 },
      { x: 700, y: 170 },
      { x: 240, y: 390 },
      { x: 700, y: 390 }
    ];
    const spot = fallbackSpots[index % fallbackSpots.length];
    if (canMoveTo(spot.x, spot.y, radius)) {
      cx = spot.x;
      cy = spot.y;
    }
  }

  const initAngle = Math.random() * Math.PI * 2;
  const speed = 1.35 + Math.random() * 0.25;
  civilians.push({
    x: cx,
    y: cy,
    vx: Math.cos(initAngle) * speed,
    vy: Math.sin(initAngle) * speed,
    isCivilian: true,
    hp: 2, // Przetrwa dokładnie 1 strzał (ma 2 HP)
    maxHp: 2,
    speed,
    radius,
    angle: initAngle,
    walkCycle: Math.random() * 10,
    splatColor: null,
    changeDirTimer: 35 + Math.random() * 55
  });
}

// Podkładacz min po zabiciu dropuje nową minę dla gracza
function dropEnemyLoot(en) {
  if (en.kind !== 'miner') return;
  minesCount += 1;
  saveProgress();
  playPickupSound();
  popups.push({ x: en.x, y: en.y - 28, text: '💣 +1 MINA!', color: '#facc15', alpha: 1 });
  updateHud();
}
