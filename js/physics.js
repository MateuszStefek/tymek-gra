// ==================== FIZYKA KOLIZJI I OMIJANIE PRZESZKÓD ====================

function rectCircleColliding(circleX, circleY, radius, rect) {
  const distX = Math.abs(circleX - rect.x - rect.w / 2);
  const distY = Math.abs(circleY - rect.y - rect.h / 2);
  if (distX > (rect.w / 2 + radius)) return false;
  if (distY > (rect.h / 2 + radius)) return false;
  if (distX <= (rect.w / 2)) return true;
  if (distY <= (rect.h / 2)) return true;
  const dx = distX - rect.w / 2;
  const dy = distY - rect.h / 2;
  return (dx * dx + dy * dy <= (radius * radius));
}

function canMoveTo(x, y, radius) {
  if (x < radius + 12 || x > canvas.width - radius - 12) return false;
  if (y < radius + 12 || y > canvas.height - radius - 12) return false;
  for (const ob of obstacles) {
    if (rectCircleColliding(x, y, radius, ob)) return false;
  }
  return true;
}

function normalizeAngleDiff(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

function computeObstacleAvoidingAngle(rx, ry, currentAngle, targetX, targetY) {
  const desiredAngle = Math.atan2(targetY - ry, targetX - rx);
  const distToTarget = Math.hypot(targetX - rx, targetY - ry);

  // Sprawdź czy linia prosta do celu jest wolna od przeszkód
  let directClear = true;
  const checkSteps = Math.min(8, Math.ceil(distToTarget / 22));
  for (let s = 1; s <= checkSteps; s++) {
    const d = Math.min(distToTarget, s * 22);
    const tx = rx + Math.cos(desiredAngle) * d;
    const ty = ry + Math.sin(desiredAngle) * d;
    if (!canMoveTo(tx, ty, 8)) {
      directClear = false;
      break;
    }
  }
  if (directClear) {
    return desiredAngle;
  }

  // Jeśli na drodze jest przeszkoda, oceń 20 kierunków wokół rakiety (steering feelers)
  let bestAngle = currentAngle;
  let bestScore = -Infinity;
  const numDirs = 20;
  for (let i = 0; i < numDirs; i++) {
    const candAngle = -Math.PI + (i / numDirs) * Math.PI * 2;
    let clearDist = 0;
    const maxLook = 110;
    for (let d = 16; d <= maxLook; d += 16) {
      const tx = rx + Math.cos(candAngle) * d;
      const ty = ry + Math.sin(candAngle) * d;
      if (canMoveTo(tx, ty, 9)) {
        clearDist = d;
      } else {
        break;
      }
    }
    if (clearDist < 16) continue;

    const diffToGoal = Math.abs(normalizeAngleDiff(candAngle - desiredAngle));
    const diffToCurrent = Math.abs(normalizeAngleDiff(candAngle - currentAngle));
    const score = clearDist * 1.6 - diffToGoal * 55 - diffToCurrent * 18;
    if (score > bestScore) {
      bestScore = score;
      bestAngle = candAngle;
    }
  }
  return bestAngle;
}

// Wyznacza kąt ruchu dla wroga idącego do punktu docelowego z omijaniem przeszkód (przez rogi przeszkód)
function computeEnemyPathAngle(en, targetX, targetY) {
  const pad = en.radius + 16;
  const distToTarget = Math.hypot(targetX - en.x, targetY - en.y);
  const directAngle = Math.atan2(targetY - en.y, targetX - en.x);

  // Sprawdź pierwszą przeszkodę na linii do celu
  let blockingOb = null;
  const steps = Math.max(4, Math.ceil(distToTarget / 14));
  for (let s = 1; s <= steps; s++) {
    const d = Math.min(distToTarget, s * 14);
    const tx = en.x + Math.cos(directAngle) * d;
    const ty = en.y + Math.sin(directAngle) * d;
    for (const ob of obstacles) {
      if (rectCircleColliding(tx, ty, en.radius + 4, ob)) {
        blockingOb = ob;
        break;
      }
    }
    if (blockingOb) break;
  }

  let aimX = targetX;
  let aimY = targetY;

  if (blockingOb) {
    // Wybierz najlepszy róg przeszkody, przez który można ją ominąć
    const corners = [
      { x: blockingOb.x - pad, y: blockingOb.y - pad },
      { x: blockingOb.x + blockingOb.w + pad, y: blockingOb.y - pad },
      { x: blockingOb.x - pad, y: blockingOb.y + blockingOb.h + pad },
      { x: blockingOb.x + blockingOb.w + pad, y: blockingOb.y + blockingOb.h + pad }
    ];
    let bestCorner = null;
    let bestCost = Infinity;
    for (const c of corners) {
      if (!canMoveTo(c.x, c.y, en.radius)) continue;
      const d1 = Math.hypot(c.x - en.x, c.y - en.y);
      const d2 = Math.hypot(targetX - c.x, targetY - c.y);
      if (d1 < 12) continue;
      const cost = d1 + d2;
      if (cost < bestCost) {
        bestCost = cost;
        bestCorner = c;
      }
    }
    if (bestCorner) {
      aimX = bestCorner.x;
      aimY = bestCorner.y;
    }
  }

  const desiredAngle = Math.atan2(aimY - en.y, aimX - en.x);
  if (canMoveTo(en.x + Math.cos(desiredAngle) * 18, en.y + Math.sin(desiredAngle) * 18, en.radius)) {
    return desiredAngle;
  }

  // Jeśli bezpośrednio przed wrogiem jest ściana, szukaj wolnego kierunku z preferencją orbitSign
  for (let step = 1; step <= 16; step++) {
    const delta = (step * Math.PI) / 16;
    const cand1 = desiredAngle + delta * en.orbitSign;
    if (canMoveTo(en.x + Math.cos(cand1) * 20, en.y + Math.sin(cand1) * 20, en.radius)) {
      return cand1;
    }
    const cand2 = desiredAngle - delta * en.orbitSign;
    if (canMoveTo(en.x + Math.cos(cand2) * 20, en.y + Math.sin(cand2) * 20, en.radius)) {
      return cand2;
    }
  }
  return desiredAngle;
}
