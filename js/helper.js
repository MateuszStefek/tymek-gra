// ==================== SOJUSZNICZY POMOCNIK (PUNKTY 3 & 4) ====================

function initHelper() {
  if (!helperUnlocked) {
    helper = null;
    return;
  }
  let hx = player.x + 36;
  let hy = player.y + 36;
  if (!canMoveTo(hx, hy, 15)) {
    hx = player.x - 36;
    hy = player.y - 36;
    if (!canMoveTo(hx, hy, 15)) {
      hx = player.x;
      hy = player.y;
    }
  }
  helper = {
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
    walkCycle: 0,
    angle: 0,
    shootTimer: 45 + Math.random() * 30,
    changeDirTimer: 0,
    splatColor: null,
    hitFlash: 0,
    healTimer: 0,
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

function damageHelper(dmg, splatColor) {
  if (!helper || !helper.alive) return;
  helper.hp = Math.max(0, helper.hp - dmg);
  helper.hitFlash = 14;
  helper.splatColor = splatColor;
  addPaintSplat(helper.x, helper.y, splatColor, helper.hp <= 0 ? 32 : 16);
  for (let k = 0; k < (helper.hp <= 0 ? 22 : 10); k++) {
    const a = Math.random() * Math.PI * 2;
    const s = 1.5 + Math.random() * 4.5;
    particles.push({
      x: helper.x,
      y: helper.y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      r: 4 + Math.random() * 3,
      color: splatColor,
      alpha: 1
    });
  }
  if (helper.hp > 0) {
    popups.push({
      x: helper.x,
      y: helper.y - 24,
      text: `🤝 POMOCNIK: ${helper.hp}/${helper.maxHp} ❤️`,
      color: '#38bdf8',
      alpha: 1
    });
  } else {
    helper.alive = false;
    helper.respawnTimer = 12 * 60; // 12 sekund do powrotu
    eliminatedHumans.push({
      x: helper.x,
      y: helper.y,
      shirtColor: '#0284c7',
      splatColor,
      timer: 48
    });
    popups.push({
      x: helper.x,
      y: helper.y - 30,
      text: '⚠️ POMOCNIK ZGINĄŁ! (WRÓCI ZA 12s)',
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
function checkHelperMineCollisions() {
  if (!helper || !helper.alive) return;

  // Miny podkładacza
  for (let m = enemyMines.length - 1; m >= 0; m--) {
    const mine = enemyMines[m];
    if (!mine.armed) continue;
    if (Math.hypot(helper.x - mine.x, helper.y - mine.y) <= mine.triggerRadius) {
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
      damageHelper(5, blastColor);
      return;
    }
  }

  // W trakcie repositioning NIE widzi min -> może wejść na minę gracza
  if (helper.aiState === 'repositioning') {
    for (let p = placedMines.length - 1; p >= 0; p--) {
      const pm = placedMines[p];
      if (!pm.armed) continue;
      if (Math.hypot(helper.x - pm.x, helper.y - pm.y) <= pm.triggerRadius) {
        placedMines.splice(p, 1);
        triggerMineExplosion(pm);
        damageHelper(5, '#fb923c');
        return;
      }
    }
  }
}

// Strzelanie pomocnika: celuje w najbliższego wroga, jeśli nie ma cywila na linii strzału
function updateHelperShooting() {
  if (!helper || !helper.alive) return;
  helper.shootTimer--;
  if (helper.shootTimer > 0) return;

  let bestEnemy = null;
  let bestDist = Infinity;
  for (const en of enemies) {
    if (en.hp <= 0) continue;
    const d = Math.hypot(en.x - helper.x, en.y - helper.y);
    if (d < 460 && d < bestDist) {
      if (!isCivilianInLineOfFire(helper.x, helper.y, en.x, en.y)) {
        bestDist = d;
        bestEnemy = en;
      }
    }
  }

  if (bestEnemy) {
    const angle = Math.atan2(bestEnemy.y - helper.y, bestEnemy.x - helper.x) + (Math.random() - 0.5) * 0.12;
    helper.angle = angle;
    bullets.push({
      x: helper.x + Math.cos(angle) * 22,
      y: helper.y + Math.sin(angle) * 22,
      startX: helper.x,
      startY: helper.y,
      vx: Math.cos(angle) * 9.2,
      vy: Math.sin(angle) * 9.2,
      color: '#38bdf8',
      fromPlayer: false,
      fromHelper: true,
      life: 90
    });
    playShootSound();
    helper.shootTimer = 45 + Math.random() * 30;
  } else {
    helper.shootTimer = 16;
  }
}

function updateHelper() {
  if (!helperUnlocked || !helper) return;

  if (!helper.alive) {
    helper.respawnTimer--;
    if (helper.respawnTimer <= 0) {
      helper.alive = true;
      helper.hp = helper.maxHp;
      helper.aiState = 'normal';
      helper.stuckFrames = 0;
      helper.healTimer = 0;
      let placed = false;
      for (let r = 40; r <= 130; r += 20) {
        for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
          const tx = player.x + Math.cos(a) * r;
          const ty = player.y + Math.sin(a) * r;
          if (canMoveTo(tx, ty, helper.radius)) {
            helper.x = tx;
            helper.y = ty;
            placed = true;
            break;
          }
        }
        if (placed) break;
      }
      if (!placed) {
        helper.x = player.x;
        helper.y = player.y;
      }
      helper.boxMinX = helper.x;
      helper.boxMaxX = helper.x;
      helper.boxMinY = helper.y;
      helper.boxMaxY = helper.y;
      playReloadSound();
      popups.push({
        x: helper.x,
        y: helper.y - 30,
        text: '🤝 POMOCNIK POWRÓCIŁ!',
        color: '#38bdf8',
        alpha: 1
      });
    }
    return;
  }

  if (helper.hitFlash > 0) helper.hitFlash--;

  // Tor leczenia pomocnika: 1HP/5s, 2HP/5s, 3HP/5s... (300 klatek przy 60 fps)
  if (helperHealingLevel > 0 && helper.hp < helper.maxHp) {
    helper.healTimer = (helper.healTimer || 0) + 1;
    if (helper.healTimer >= 5 * 60) {
      helper.healTimer = 0;
      const healed = Math.min(helper.maxHp - helper.hp, helperHealingLevel);
      helper.hp += healed;
      popups.push({
        x: helper.x,
        y: helper.y - 28,
        text: `💚 +${healed} HP POMOCNIKA (${helper.hp}/${helper.maxHp})`,
        color: '#4ade80',
        alpha: 1
      });
    }
  } else {
    helper.healTimer = 0;
  }

  // Śledzenie zablokowania przez dłużej niż 10 sekund (600 klatek)
  helper.boxMinX = Math.min(helper.boxMinX, helper.x);
  helper.boxMaxX = Math.max(helper.boxMaxX, helper.x);
  helper.boxMinY = Math.min(helper.boxMinY, helper.y);
  helper.boxMaxY = Math.max(helper.boxMaxY, helper.y);

  if ((helper.boxMaxX - helper.boxMinX) <= 24 && (helper.boxMaxY - helper.boxMinY) <= 24) {
    helper.stuckFrames++;
  } else {
    helper.boxMinX = helper.x;
    helper.boxMaxX = helper.x;
    helper.boxMinY = helper.y;
    helper.boxMaxY = helper.y;
    helper.stuckFrames = 0;
  }

  // Zablokowany >10s -> trick z mózgiem 🧠 i repositioning przez 3 sekundy
  if (helper.stuckFrames >= 10 * 60 && helper.aiState !== 'repositioning') {
    helper.stuckFrames = 0;
    helper.aiState = 'repositioning';
    helper.aiStateTimer = 3 * 60;
    let targetSpot = null;
    for (let r = 90; r <= 220; r += 30) {
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
        const tx = player.x + Math.cos(a) * r;
        const ty = player.y + Math.sin(a) * r;
        if (canMoveTo(tx, ty, helper.radius) && Math.hypot(tx - helper.x, ty - helper.y) > 70) {
          targetSpot = { x: tx, y: ty };
          break;
        }
      }
      if (targetSpot) break;
    }
    helper.repositionTarget = targetSpot || { x: player.x, y: player.y };
  }

  const distToPlayer = Math.hypot(player.x - helper.x, player.y - helper.y);

  if (helper.aiState === 'repositioning' && helper.repositionTarget) {
    helper.aiStateTimer--;
    const distToGoal = Math.hypot(helper.repositionTarget.x - helper.x, helper.repositionTarget.y - helper.y);
    if (distToGoal <= 28 || helper.aiStateTimer <= 0) {
      helper.aiState = 'normal';
      helper.repositionTarget = null;
      helper.stuckFrames = 0;
      helper.boxMinX = helper.x;
      helper.boxMaxX = helper.x;
      helper.boxMinY = helper.y;
      helper.boxMaxY = helper.y;
    } else {
      const moveAngle = computeEnemyPathAngle(helper, helper.repositionTarget.x, helper.repositionTarget.y);
      helper.vx = Math.cos(moveAngle) * (helper.speed * 1.25);
      helper.vy = Math.sin(moveAngle) * (helper.speed * 1.25);
    }
    // W trakcie repositioning NIE WIDZI MIN!
  } else {
    // Stan normalny: chodzi losowo, blisko gracza
    helper.changeDirTimer--;
    if (helper.changeDirTimer <= 0) {
      let moveAngle;
      if (distToPlayer > 180) {
        moveAngle = Math.atan2(player.y - helper.y, player.x - helper.x) + (Math.random() - 0.5) * 0.8;
      } else if (distToPlayer < 65) {
        moveAngle = Math.atan2(helper.y - player.y, helper.x - player.x) + (Math.random() - 0.5) * 1.0;
      } else {
        moveAngle = Math.random() * Math.PI * 2;
      }
      helper.vx = Math.cos(moveAngle) * helper.speed;
      helper.vy = Math.sin(moveAngle) * helper.speed;
      helper.changeDirTimer = 30 + Math.random() * 40;
    }

    // Unika min w stanie normalnym
    steerHelperAwayFromMines(helper);
  }

  const nx = helper.x + helper.vx;
  const ny = helper.y + helper.vy;
  if (canMoveTo(nx, helper.y, helper.radius)) {
    helper.x = nx;
  } else {
    helper.vx *= -1;
  }
  if (canMoveTo(helper.x, ny, helper.radius)) {
    helper.y = ny;
  } else {
    helper.vy *= -1;
  }

  helper.walkCycle += 0.22;
  checkHelperMineCollisions();
  updateHelperShooting();
}
