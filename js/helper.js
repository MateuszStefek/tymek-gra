// ==================== SOJUSZNICZY POMOCNICY (WSPARCIE DRUŻYNY) ====================

function createSingleHelper(id) {
  const angleOffset = (id * (Math.PI * 2)) / Math.max(1, helperCount);
  let hx = player.x + Math.cos(angleOffset) * 38;
  let hy = player.y + Math.sin(angleOffset) * 38;
  if (!canMoveTo(hx, hy, 15)) {
    hx = player.x - Math.cos(angleOffset) * 38;
    hy = player.y - Math.sin(angleOffset) * 38;
    if (!canMoveTo(hx, hy, 15)) {
      hx = player.x;
      hy = player.y;
    }
  }
  return {
    id,
    name: helperCount > 1 ? `POMOCNIK ${id + 1}` : 'POMOCNIK',
    x: hx,
    y: hy,
    vx: 0,
    vy: 0,
    radius: 15,
    speed: 2.15,
    hp: 5,
    maxHp: 5,
    alive: true,
    respawnTimer: 0,
    walkCycle: Math.random() * 10,
    angle: 0,
    shootTimer: 35 + Math.random() * 35,
    changeDirTimer: 0,
    splatColor: null,
    hitFlash: 0,
    stuckFrames: 0,
    boxMinX: hx,
    boxMaxX: hx,
    boxMinY: hy,
    boxMaxY: hy,
    aiState: 'normal',
    aiStateTimer: 0,
    repositionTarget: null
  };
}

let helpersSharedHealTimer = 0;

function initHelper() {
  if (!helperUnlocked) {
    helper = null;
    helpers = [];
    return;
  }
  const count = Math.min(3, Math.max(1, helperCount || 1));
  helpers = [];
  for (let i = 0; i < count; i++) {
    helpers.push(createSingleHelper(i));
  }
  helper = helpers[0] || null;
  helpersSharedHealTimer = 0;
}

function damageHelper(dmg, splatColor, targetHelper) {
  const h = targetHelper || helper;
  if (!h || !h.alive) return;
  h.hp = Math.max(0, h.hp - dmg);
  h.hitFlash = 14;
  h.splatColor = splatColor;
  addPaintSplat(h.x, h.y, splatColor, h.hp <= 0 ? 32 : 16);
  for (let k = 0; k < (h.hp <= 0 ? 22 : 10); k++) {
    const a = Math.random() * Math.PI * 2;
    const s = 1.5 + Math.random() * 4.5;
    particles.push({
      x: h.x,
      y: h.y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      r: 4 + Math.random() * 3,
      color: splatColor,
      alpha: 1
    });
  }
  if (h.hp > 0) {
    popups.push({
      x: h.x,
      y: h.y - 24,
      text: `🤝 ${h.name}: ${h.hp}/${h.maxHp} ❤️`,
      color: '#38bdf8',
      alpha: 1
    });
  } else {
    h.alive = false;
    h.respawnTimer = 12 * 60; // 12 sekund do powrotu
    eliminatedHumans.push({
      x: h.x,
      y: h.y,
      shirtColor: '#0284c7',
      splatColor,
      timer: 48
    });
    popups.push({
      x: h.x,
      y: h.y - 30,
      text: `⚠️ ${h.name} ZGINĄŁ! (WRÓCI ZA 12s)`,
      color: '#ef4444',
      alpha: 1
    });
  }
}

// Sprawdza, czy na linii strzału (od pomocnika do wroga) znajduje się cywil
function isCivilianInLineOfFire(fromX, fromY, toX, toY) {
  const lineDist = Math.hypot(toX - fromX, toY - fromY);
  if (lineDist < 1) return false;
  const ux = (toX - fromX) / lineDist;
  const uy = (toY - fromY) / lineDist;

  for (const civ of civilians) {
    if (civ.hp <= 0) continue;
    const dx = civ.x - fromX;
    const dy = civ.y - fromY;
    const proj = dx * ux + dy * uy;
    if (proj > 0 && proj < lineDist + 15) {
      const perpX = civ.x - (fromX + ux * proj);
      const perpY = civ.y - (fromY + uy * proj);
      const distToLine = Math.hypot(perpX, perpY);
      if (distToLine < civ.radius + 24) {
        return true;
      }
    }
  }
  return false;
}

// Pomocnik w stanie normalnym omija miny
function steerHelperAwayFromMines(h) {
  let nearest = null;
  let nearestDist = Infinity;
  const consider = (m) => {
    const d = Math.hypot(h.x - m.x, h.y - m.y);
    if (d < nearestDist) {
      nearestDist = d;
      nearest = m;
    }
  };
  for (const m of placedMines) {
    if (m.armed) consider(m);
  }
  for (const m of enemyMines) consider(m);

  if (!nearest) return;
  const safeDist = nearest.triggerRadius + h.radius + 28;
  if (nearestDist >= safeDist) return;

  let away = Math.atan2(h.y - nearest.y, h.x - nearest.x);
  for (let step = 0; step <= 8; step++) {
    const delta = (step * Math.PI) / 10;
    const c1 = away + delta;
    if (canMoveTo(h.x + Math.cos(c1) * 20, h.y + Math.sin(c1) * 20, h.radius)) { away = c1; break; }
    const c2 = away - delta;
    if (canMoveTo(h.x + Math.cos(c2) * 20, h.y + Math.sin(c2) * 20, h.radius)) { away = c2; break; }
  }
  h.vx = Math.cos(away) * h.speed;
  h.vy = Math.sin(away) * h.speed;
  h.changeDirTimer = Math.min(h.changeDirTimer, 12);
}

// Kolizje pomocnika z minami (w trakcie repositioning nie widzi min, więc może na nie wejść!)
function checkSingleHelperMineCollisions(h) {
  if (!h || !h.alive) return;

  // Miny podkładacza
  for (let m = enemyMines.length - 1; m >= 0; m--) {
    const mine = enemyMines[m];
    if (!mine.armed) continue;
    if (Math.hypot(h.x - mine.x, h.y - mine.y) <= mine.triggerRadius) {
      enemyMines.splice(m, 1);
      playExplosionSound();
      const blastColor = '#a855f7';
      addPaintSplat(mine.x, mine.y, blastColor, 50);
      explosions.push({ x: mine.x, y: mine.y, radius: 10, maxRadius: mine.blastRadius, color: blastColor, alpha: 1 });
      for (let k = 0; k < 30; k++) {
        const a = Math.random() * Math.PI * 2;
        const s = 2 + Math.random() * 5;
        particles.push({
          x: mine.x, y: mine.y,
          vx: Math.cos(a) * s, vy: Math.sin(a) * s,
          r: 4 + Math.random() * 3,
          color: blastColor,
          alpha: 1
        });
      }
      damageHelper(5, blastColor, h);
      return;
    }
  }

  // W trakcie repositioning NIE widzi min -> może wejść na minę gracza
  if (h.aiState === 'repositioning') {
    for (let p = placedMines.length - 1; p >= 0; p--) {
      const pm = placedMines[p];
      if (!pm.armed) continue;
      if (Math.hypot(h.x - pm.x, h.y - pm.y) <= pm.triggerRadius) {
        placedMines.splice(p, 1);
        triggerMineExplosion(pm);
        damageHelper(5, '#fb923c', h);
        return;
      }
    }
  }
}

// Strzelanie pomocnika: celuje w najbliższego wroga, jeśli nie ma cywila na linii strzału
function updateSingleHelperShooting(h) {
  if (!h || !h.alive) return;
  h.shootTimer--;
  if (h.shootTimer > 0) return;

  let bestEnemy = null;
  let bestDist = Infinity;
  for (const en of enemies) {
    if (en.hp <= 0) continue;
    const d = Math.hypot(en.x - h.x, en.y - h.y);
    if (d < 460 && d < bestDist) {
      if (!isCivilianInLineOfFire(h.x, h.y, en.x, en.y)) {
        bestDist = d;
        bestEnemy = en;
      }
    }
  }

  if (bestEnemy) {
    const angle = Math.atan2(bestEnemy.y - h.y, bestEnemy.x - h.x) + (Math.random() - 0.5) * 0.12;
    h.angle = angle;
    bullets.push({
      x: h.x + Math.cos(angle) * 22,
      y: h.y + Math.sin(angle) * 22,
      startX: h.x,
      startY: h.y,
      vx: Math.cos(angle) * 9.2,
      vy: Math.sin(angle) * 9.2,
      color: '#38bdf8',
      fromPlayer: false,
      fromHelper: true,
      life: 90
    });
    playShootSound();
    h.shootTimer = 40 + Math.random() * 32;
  } else {
    h.shootTimer = 16;
  }
}

function updateSingleHelper(h) {
  if (!h) return;

  if (!h.alive) {
    h.respawnTimer--;
    if (h.respawnTimer <= 0) {
      h.alive = true;
      h.hp = h.maxHp;
      h.aiState = 'normal';
      h.stuckFrames = 0;
      let placed = false;
      const baseAngle = (h.id * (Math.PI * 2)) / Math.max(1, helpers.length);
      for (let r = 40; r <= 140; r += 20) {
        for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
          const tx = player.x + Math.cos(baseAngle + a) * r;
          const ty = player.y + Math.sin(baseAngle + a) * r;
          if (canMoveTo(tx, ty, h.radius)) {
            h.x = tx;
            h.y = ty;
            placed = true;
            break;
          }
        }
        if (placed) break;
      }
      if (!placed) {
        h.x = player.x;
        h.y = player.y;
      }
      h.boxMinX = h.x;
      h.boxMaxX = h.x;
      h.boxMinY = h.y;
      h.boxMaxY = h.y;
      playReloadSound();
      popups.push({
        x: h.x,
        y: h.y - 30,
        text: `🤝 ${h.name} POWRÓCIŁ!`,
        color: '#38bdf8',
        alpha: 1
      });
    }
    return;
  }

  if (h.hitFlash > 0) h.hitFlash--;

  // Śledzenie zablokowania przez dłużej niż 10 sekund (600 klatek)
  h.boxMinX = Math.min(h.boxMinX, h.x);
  h.boxMaxX = Math.max(h.boxMaxX, h.x);
  h.boxMinY = Math.min(h.boxMinY, h.y);
  h.boxMaxY = Math.max(h.boxMaxY, h.y);

  if ((h.boxMaxX - h.boxMinX) <= 24 && (h.boxMaxY - h.boxMinY) <= 24) {
    h.stuckFrames++;
  } else {
    h.boxMinX = h.x;
    h.boxMaxX = h.x;
    h.boxMinY = h.y;
    h.boxMaxY = h.y;
    h.stuckFrames = 0;
  }

  // Zablokowany >10s -> trick z mózgiem 🧠 i repositioning przez 3 sekundy
  if (h.stuckFrames >= 10 * 60 && h.aiState !== 'repositioning') {
    h.stuckFrames = 0;
    h.aiState = 'repositioning';
    h.aiStateTimer = 3 * 60;
    let targetSpot = null;
    for (let r = 90; r <= 220; r += 30) {
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
        const tx = player.x + Math.cos(a) * r;
        const ty = player.y + Math.sin(a) * r;
        if (canMoveTo(tx, ty, h.radius) && Math.hypot(tx - h.x, ty - h.y) > 70) {
          targetSpot = { x: tx, y: ty };
          break;
        }
      }
      if (targetSpot) break;
    }
    h.repositionTarget = targetSpot || { x: player.x, y: player.y };
  }

  const distToPlayer = Math.hypot(player.x - h.x, player.y - h.y);

  if (h.aiState === 'repositioning' && h.repositionTarget) {
    h.aiStateTimer--;
    const distToGoal = Math.hypot(h.repositionTarget.x - h.x, h.repositionTarget.y - h.y);
    if (distToGoal <= 28 || h.aiStateTimer <= 0) {
      h.aiState = 'normal';
      h.repositionTarget = null;
      h.stuckFrames = 0;
      h.boxMinX = h.x;
      h.boxMaxX = h.x;
      h.boxMinY = h.y;
      h.boxMaxY = h.y;
    } else {
      const moveAngle = computeEnemyPathAngle(h, h.repositionTarget.x, h.repositionTarget.y);
      h.vx = Math.cos(moveAngle) * (h.speed * 1.25);
      h.vy = Math.sin(moveAngle) * (h.speed * 1.25);
    }
  } else {
    // Stan normalny: chodzi losowo, blisko gracza
    h.changeDirTimer--;
    if (h.changeDirTimer <= 0) {
      let moveAngle;
      if (distToPlayer > 190) {
        moveAngle = Math.atan2(player.y - h.y, player.x - h.x) + (Math.random() - 0.5) * 0.8;
      } else if (distToPlayer < 60) {
        moveAngle = Math.atan2(h.y - player.y, h.x - player.x) + (Math.random() - 0.5) * 1.0;
      } else {
        moveAngle = Math.random() * Math.PI * 2;
      }
      h.vx = Math.cos(moveAngle) * h.speed;
      h.vy = Math.sin(moveAngle) * h.speed;
      h.changeDirTimer = 30 + Math.random() * 40;
    }

    // Omijanie pozostałych pomocników, by nie nakładali się na siebie
    for (const other of helpers) {
      if (other !== h && other.alive) {
        const d = Math.hypot(h.x - other.x, h.y - other.y);
        if (d > 0 && d < 28) {
          const pushAngle = Math.atan2(h.y - other.y, h.x - other.x);
          h.vx += Math.cos(pushAngle) * 0.7;
          h.vy += Math.sin(pushAngle) * 0.7;
        }
      }
    }

    // Unika min w stanie normalnym
    steerHelperAwayFromMines(h);
  }

  const nx = h.x + h.vx;
  const ny = h.y + h.vy;
  if (canMoveTo(nx, h.y, h.radius)) {
    h.x = nx;
  } else {
    h.vx *= -1;
  }
  if (canMoveTo(h.x, ny, h.radius)) {
    h.y = ny;
  } else {
    h.vy *= -1;
  }

  h.walkCycle += 0.22;
  checkSingleHelperMineCollisions(h);
  updateSingleHelperShooting(h);
}

function updateHelper() {
  if (!helperUnlocked || !helpers || helpers.length === 0) {
    helper = null;
    return;
  }

  // Tor leczenia pomocników: co 5 sekund (300 klatek) nowe zdrowie (helperHealingLevel HP)
  // dzieli się równomiernie na wszystkich aktualnie żywych pomocników
  if (helperHealingLevel > 0) {
    const aliveHelpers = helpers.filter(h => h.alive);
    if (aliveHelpers.length > 0) {
      helpersSharedHealTimer++;
      if (helpersSharedHealTimer >= 5 * 60) {
        helpersSharedHealTimer = 0;
        const totalPool = helperHealingLevel;
        const perHelper = totalPool / aliveHelpers.length;

        aliveHelpers.forEach(h => {
          if (h.hp < h.maxHp) {
            const actualHealed = Math.min(h.maxHp - h.hp, perHelper);
            h.hp = Math.min(h.maxHp, h.hp + actualHealed);
            // Zaokrąglenie do 1 miejsca po przecinku jeśli niecałkowite
            const healedStr = Number.isInteger(actualHealed) ? actualHealed : actualHealed.toFixed(1);
            popups.push({
              x: h.x,
              y: h.y - 28,
              text: `💚 +${healedStr} HP (${h.hp.toFixed(1).replace('.0', '')}/${h.maxHp})`,
              color: '#4ade80',
              alpha: 1
            });
          }
        });
      }
    } else {
      helpersSharedHealTimer = 0;
    }
  } else {
    helpersSharedHealTimer = 0;
  }

  // Aktualizacja każdego pomocnika
  for (const h of helpers) {
    updateSingleHelper(h);
  }

  helper = helpers[0] || null;
}
