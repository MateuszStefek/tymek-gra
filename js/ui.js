// Interfejs użytkownika: HUD, menu poziomów, ekran własnych map i edytor oraz pauza

menuOverlay.addEventListener('mousedown', (e) => {
  if (e.button === 0 && performance.now() >= menuReadyAt && pointerReleasedAfterMenuOpen) {
    menuPointerArmed = true;
  } else {
    menuPointerArmed = false;
  }
});

function canActivateMenuAction() {
  return performance.now() >= menuReadyAt && pointerReleasedAfterMenuOpen && menuPointerArmed;
}

function updateFollowButtonUI() {
  btnFollowMouse.classList.toggle('active', followMouse);
  btnFollowMouse.textContent = followMouse
    ? '🏃 Ruch za myszką: WŁ [Klawisz F]'
    : '🏃 Ruch za myszką: WYŁ [Klawisz F]';
}
updateFollowButtonUI();

function toggleFollowMouse() {
  followMouse = !followMouse;
  updateFollowButtonUI();
  saveProgress();
  canvas.focus();
}

function updatePauseButtonUI() {
  const isPaused = gameState === 'paused';
  btnPause.classList.toggle('active', isPaused);
  btnPause.textContent = isPaused ? '▶️ Wznów [P]' : '⏸️ Pauza [P]';
}

function togglePause() {
  if (gameState === 'playing') {
    gameState = 'paused';
    updatePauseButtonUI();
  } else if (gameState === 'paused') {
    startTime = performance.now() - survivalSeconds * 1000;
    gameState = 'playing';
    updatePauseButtonUI();
    canvas.focus();
  }
}

function updateHud() {
  const hp = Math.max(0, player.hp);
  const pct = (hp / player.maxHp) * 100;
  levelText.textContent = activeCustomMapIndex !== null
    ? `🛠️ ${customMaps[activeCustomMapIndex].name}`
    : `${level} (max: ${unlockedLevel})`;
  ammoText.textContent = player.ammo;
  ammoText.style.color = player.ammo > 5 ? '#facc15' : '#ef4444';
  minesText.textContent = minesCount;
  btnPlaceMine.textContent = `💣 Postaw minę: ${minesCount} [SPACJA / E]`;
  btnPlaceMine.disabled = minesCount <= 0;
  hpText.textContent = `${hp}/${player.maxHp}`;
  hpFill.style.width = pct + '%';
  hpFill.style.backgroundColor = pct > 50 ? '#22c55e' : (pct > 25 ? '#facc15' : '#ef4444');
  aliveText.textContent = `${enemies.length} / ${totalEnemiesInLevel}`;
  btnPrevLevel.disabled = level <= 1;
  btnNextLevel.disabled = level >= unlockedLevel;
  updatePauseButtonUI();
}

function openCustomMapsScreen(editIdx = null) {
  if (menuCountdownInterval) {
    clearInterval(menuCountdownInterval);
    menuCountdownInterval = null;
  }
  if (placedMines.length > 0) {
    minesCount += placedMines.length;
    placedMines = [];
    saveProgress();
    updateHud();
  }
  mouse.down = false;
  gameState = 'custom_maps';
  menuOverlay.classList.add('hidden');
  customOverlay.classList.remove('hidden');

  if (editIdx !== null) {
    renderCustomMapEditor(editIdx);
  } else {
    customListView.style.display = 'flex';
    customEditorView.style.display = 'none';
    customOverlayTitle.textContent = '🛠️ ZESTAW WŁASNYCH MAP (ZAWSZE ODBLOKOWANE)';
    customOverlaySub.textContent = 'Każda własna mapa jest od razu odblokowana! Kliknij ▶️ Graj, aby wejść na arenę, albo ✏️ Edytuj, aby zmienić liczby przeciwników.';
    renderCustomMapsList();
  }
}

function renderCustomMapsList() {
  customMapsGrid.innerHTML = '';
  customMaps.forEach((cm, idx) => {
    const arenaObj = arenaLayouts[cm.arenaIndex % arenaLayouts.length];
    const card = document.createElement('div');
    card.className = 'level-card completed' + (activeCustomMapIndex === idx ? ' current' : '');
    card.style.cursor = 'default';
    card.innerHTML = `
      <div class="lvl-title" style="color:#e9d5ff;">🛠️ ${cm.name}</div>
      <div class="lvl-enemies">🎯 ${formatCustomMapSummary(cm)}</div>
      <div class="lvl-enemies" style="color:#93c5fd;font-size:11px;">🗺️ ${arenaObj.name}</div>
      <div class="lvl-status" style="color:#4ade80;">🔓 Zawsze odblokowana</div>
      <div class="custom-card-btns" style="margin-top:6px;">
        <button class="btn-green" id="playCustom_${idx}">▶️ Graj</button>
        <button class="btn-purple" id="editCustom_${idx}">✏️ Edytuj</button>
      </div>
    `;
    customMapsGrid.appendChild(card);
    card.querySelector(`#playCustom_${idx}`).onclick = () => startCustomMap(idx);
    card.querySelector(`#editCustom_${idx}`).onclick = () => openCustomMapsScreen(idx);
  });
}

function renderCustomMapEditor(idx) {
  customListView.style.display = 'none';
  customEditorView.style.display = 'flex';
  const draft = { ...customMaps[idx] };
  customOverlayTitle.textContent = `✏️ EDYTOR WŁASNEJ MAPY: ${draft.name}`;
  customOverlaySub.textContent = 'Ustaw układ przeszkód oraz dokładną liczbę przeciwników każdego rodzaju:';

  function refreshEditorDOM() {
    const arenaObj = arenaLayouts[draft.arenaIndex % arenaLayouts.length];
    const total = draft.normal + draft.tough + draft.rapid + draft.boss;
    customEditorView.innerHTML = `
      <div class="editor-row">
        <span>📝 Nazwa własnej mapy:</span>
        <input id="edMapName" class="editor-input" type="text" maxlength="26" value="${draft.name.replace(/"/g, '&quot;')}" />
      </div>
      <div class="editor-row">
        <span>🗺️ Układ przeszkód na arenie:</span>
        <div class="editor-stepper">
          <button id="edPrevArena">⬅️</button>
          <span style="min-width:170px;font-size:14px;color:#38bdf8;">${arenaObj.name}</span>
          <button id="edNextArena">➡️</button>
        </div>
      </div>
      <div class="editor-row">
        <span>🎯 Zwykły przeciwnik (1 strzał):</span>
        <div class="editor-stepper">
          <button id="edNormDec">➖</button>
          <span>${draft.normal}</span>
          <button id="edNormInc">➕</button>
        </div>
      </div>
      <div class="editor-row">
        <span>🛡️ Pancerny przeciwnik (3 strzały):</span>
        <div class="editor-stepper">
          <button id="edToughDec">➖</button>
          <span>${draft.tough}</span>
          <button id="edToughInc">➕</button>
        </div>
      </div>
      <div class="editor-row">
        <span>⚡ Szybkostrzelny przeciwnik (seria strzałów):</span>
        <div class="editor-stepper">
          <button id="edRapidDec">➖</button>
          <span>${draft.rapid}</span>
          <button id="edRapidInc">➕</button>
        </div>
      </div>
      <div class="editor-row">
        <span>👑 Bardzo Mocny Boss (odporny na miny, 5 strzałów):</span>
        <div class="editor-stepper">
          <button id="edBossDec">➖</button>
          <span>${draft.boss}</span>
          <button id="edBossInc">➕</button>
        </div>
      </div>
      <div style="text-align:center;font-size:13px;color:${total > 0 ? '#4ade80' : '#ef4444'};font-weight:800;">
        Łącznie przeciwników na mapie: ${total} ${total === 0 ? '(ustaw przynajmniej 1 przeciwnika!)' : ''}
      </div>
      <div class="action-row" style="margin-top:4px;">
        <button id="edSaveAndPlay" class="btn-big btn-green" ${total === 0 ? 'disabled' : ''}>💾 Zapisz i ▶️ Zagraj teraz!</button>
        <button id="edSaveOnly" class="btn-big btn-purple" ${total === 0 ? 'disabled' : ''}>💾 Zapisz i wróć do listy</button>
        <button id="edCancel" class="btn-big btn-blue">↩️ Anuluj</button>
      </div>
    `;

    const nameInput = customEditorView.querySelector('#edMapName');
    nameInput.oninput = () => { draft.name = nameInput.value.trim() || `Mapa ${idx + 1}`; };

    customEditorView.querySelector('#edPrevArena').onclick = () => {
      draft.arenaIndex = (draft.arenaIndex + arenaLayouts.length - 1) % arenaLayouts.length;
      refreshEditorDOM();
    };
    customEditorView.querySelector('#edNextArena').onclick = () => {
      draft.arenaIndex = (draft.arenaIndex + 1) % arenaLayouts.length;
      refreshEditorDOM();
    };

    customEditorView.querySelector('#edNormDec').onclick = () => { draft.normal = Math.max(0, draft.normal - 1); refreshEditorDOM(); };
    customEditorView.querySelector('#edNormInc').onclick = () => { draft.normal = Math.min(12, draft.normal + 1); refreshEditorDOM(); };

    customEditorView.querySelector('#edToughDec').onclick = () => { draft.tough = Math.max(0, draft.tough - 1); refreshEditorDOM(); };
    customEditorView.querySelector('#edToughInc').onclick = () => { draft.tough = Math.min(10, draft.tough + 1); refreshEditorDOM(); };

    customEditorView.querySelector('#edRapidDec').onclick = () => { draft.rapid = Math.max(0, draft.rapid - 1); refreshEditorDOM(); };
    customEditorView.querySelector('#edRapidInc').onclick = () => { draft.rapid = Math.min(10, draft.rapid + 1); refreshEditorDOM(); };

    customEditorView.querySelector('#edBossDec').onclick = () => { draft.boss = Math.max(0, draft.boss - 1); refreshEditorDOM(); };
    customEditorView.querySelector('#edBossInc').onclick = () => { draft.boss = Math.min(8, draft.boss + 1); refreshEditorDOM(); };

    customEditorView.querySelector('#edSaveAndPlay').onclick = () => {
      if (draft.normal + draft.tough + draft.rapid + draft.boss <= 0) return;
      customMaps[idx] = { ...draft };
      saveProgress();
      startCustomMap(idx);
    };
    customEditorView.querySelector('#edSaveOnly').onclick = () => {
      if (draft.normal + draft.tough + draft.rapid + draft.boss <= 0) return;
      customMaps[idx] = { ...draft };
      saveProgress();
      openCustomMapsScreen(null);
    };
    customEditorView.querySelector('#edCancel').onclick = () => {
      openCustomMapsScreen(null);
    };
  }

  refreshEditorDOM();
}

function openMenu(mode = 'select') {
  if (menuCountdownInterval) {
    clearInterval(menuCountdownInterval);
    menuCountdownInterval = null;
  }
  // Mocna blokada UX po zakończeniu etapu: wymagamy puszczenia przycisku myszy ORAZ odczekania 1.6s, zanim przyciski staną się aktywne
  const isResultScreen = (mode === 'level_clear' || mode === 'dead');
  pointerReleasedAfterMenuOpen = !mouse.down || !isResultScreen;
  mouse.down = false;
  menuPointerArmed = false;
  menuReadyAt = performance.now() + (isResultScreen ? 1600 : 0);

  // Jeśli gracz wychodzi do menu lub ginie, nieużyte miny postawione na mapie wracają do jego kieszeni, żeby nie przepadły
  if (placedMines.length > 0) {
    minesCount += placedMines.length;
    placedMines = [];
    saveProgress();
    updateHud();
  }

  gameState = mode === 'select' ? 'menu' : mode;
  customOverlay.classList.add('hidden');
  menuOverlay.classList.remove('hidden');

  const stageName = activeCustomMapIndex !== null
    ? `WŁASNA MAPA "${customMaps[activeCustomMapIndex].name}"`
    : `POZIOM ${level}`;

  if (mode === 'level_clear') {
    menuTitle.textContent = `🏆 ${stageName} UKOŃCZONY! (+1 💣 MINA)`;
    menuTitle.style.color = '#4ade80';
    menuSubtitle.textContent = `Czas: ${survivalSeconds.toFixed(1)}s | Twoje miny na kolejny etap: ${minesCount} 💣 — Wybierz poziom:`;
  } else if (mode === 'dead') {
    menuTitle.textContent = `💀 ODPADASZ: ${stageName}! (0 HP)`;
    menuTitle.style.color = '#ef4444';
    menuSubtitle.textContent = `Przetrwałeś ${survivalSeconds.toFixed(1)}s. Masz ${minesCount} 💣 min. Spróbuj ponownie lub wybierz inny etap:`;
  } else {
    menuTitle.textContent = '📋 MENU WYBORU POZIOMÓW';
    menuTitle.style.color = '#38bdf8';
    menuSubtitle.textContent = `Masz w zapasie ${minesCount} 💣 min (niewykorzystane miny przechodzą między etapami):`;
  }

  levelsGrid.innerHTML = '';
  if (isResultScreen && activeCustomMapIndex !== null) {
    levelsGrid.style.display = 'none';
  } else {
    levelsGrid.style.display = 'grid';
  }

  const totalCards = Math.max(8, Math.ceil((unlockedLevel + 2) / 4) * 4);
  const unlockedCards = [];
  for (let i = 1; i <= totalCards; i++) {
    const isUnlocked = i <= unlockedLevel;
    const isCompleted = Boolean(bestTimes[i]);
    const card = document.createElement('div');
    card.className = 'level-card'
      + (!isUnlocked ? ' locked' : '')
      + (isCompleted ? ' completed' : '')
      + (activeCustomMapIndex === null && i === level ? ' current' : '');

    const cfg = getLevelConfig(i);
    const enemyLabel = cfg.label;
    const mapLabel = `🗺️ ${cfg.arena.name}`;
    let statusLabel = '🔒 Zablokowany';
    if (isCompleted) {
      statusLabel = `⭐ Ukończono (${bestTimes[i]}s)`;
    } else if (isUnlocked) {
      statusLabel = '🔓 Dostępny — Zagraj!';
    }

    card.innerHTML = `
      <div class="lvl-title">Poziom ${i}</div>
      <div class="lvl-enemies">🎯 ${enemyLabel}</div>
      <div class="lvl-enemies" style="color:#93c5fd;font-size:11px;">${mapLabel}</div>
      <div class="lvl-status">${statusLabel}</div>
    `;

    if (isUnlocked) {
      unlockedCards.push(card);
      card.addEventListener('click', () => {
        if (!canActivateMenuAction()) return;
        startLevel(i);
      });
    }
    levelsGrid.appendChild(card);
  }

  const currentCardEl = levelsGrid.querySelector('.level-card.current');
  if (currentCardEl) {
    setTimeout(() => currentCardEl.scrollIntoView({ block: 'nearest' }), 0);
  }

  menuActions.innerHTML = '';
  const actionButtons = [];

  if (mode === 'level_clear') {
    if (activeCustomMapIndex !== null) {
      const cm = customMaps[activeCustomMapIndex];
      const btnReplayCustom = document.createElement('button');
      btnReplayCustom.className = 'btn-big btn-green';
      btnReplayCustom.dataset.label = `🔄 Zagraj ponownie: ${cm.name}`;
      btnReplayCustom.onclick = () => {
        if (!canActivateMenuAction()) return;
        startCustomMap(activeCustomMapIndex);
      };
      menuActions.appendChild(btnReplayCustom);
      actionButtons.push(btnReplayCustom);
    } else {
      const nextCfg = getLevelConfig(level + 1);
      const btnNext = document.createElement('button');
      btnNext.className = 'btn-big btn-green';
      btnNext.dataset.label = `▶️ Graj w Poziom ${level + 1} (${nextCfg.label}, masz ${minesCount} 💣)`;
      btnNext.onclick = () => {
        if (!canActivateMenuAction()) return;
        startLevel(level + 1);
      };
      menuActions.appendChild(btnNext);
      actionButtons.push(btnNext);

      const btnReplay = document.createElement('button');
      btnReplay.className = 'btn-big btn-blue';
      btnReplay.dataset.label = `🔄 Powtórz Poziom ${level}`;
      btnReplay.onclick = () => {
        if (!canActivateMenuAction()) return;
        startLevel(level);
      };
      menuActions.appendChild(btnReplay);
      actionButtons.push(btnReplay);
    }
  } else if (mode === 'dead') {
    const btnAgain = document.createElement('button');
    btnAgain.className = 'btn-big btn-green';
    btnAgain.dataset.label = activeCustomMapIndex !== null
      ? `🔄 Spróbuj ponownie (${customMaps[activeCustomMapIndex].name})`
      : `🔄 Spróbuj ponownie (Poziom ${level})`;
    btnAgain.onclick = () => {
      if (!canActivateMenuAction()) return;
      if (activeCustomMapIndex !== null) startCustomMap(activeCustomMapIndex);
      else startLevel(level);
    };
    menuActions.appendChild(btnAgain);
    actionButtons.push(btnAgain);

    if (activeCustomMapIndex === null && level > 1) {
      const btnPrev = document.createElement('button');
      btnPrev.className = 'btn-big btn-blue';
      btnPrev.dataset.label = `⬅️ Wróć do Poziomu ${level - 1}`;
      btnPrev.onclick = () => {
        if (!canActivateMenuAction()) return;
        startLevel(level - 1);
      };
      menuActions.appendChild(btnPrev);
      actionButtons.push(btnPrev);
    }
  } else {
    const btnCont = document.createElement('button');
    btnCont.className = 'btn-big btn-green';
    btnCont.dataset.label = hasStartedAnyGame ? `▶️ Wróć do gry` : `▶️ Zagraj (Poziom ${level})`;
    btnCont.onclick = () => {
      if (!canActivateMenuAction()) return;
      if (!hasStartedAnyGame) {
        startLevel(level);
      } else {
        menuOverlay.classList.add('hidden');
        startTime = performance.now() - survivalSeconds * 1000;
        gameState = 'playing';
        updatePauseButtonUI();
        canvas.focus();
      }
    };
    menuActions.appendChild(btnCont);
    actionButtons.push(btnCont);
  }

  const btnGoCustom = document.createElement('button');
  btnGoCustom.className = 'btn-big btn-purple';
  btnGoCustom.dataset.label = '🛠️ Własne Mapy i Edytor';
  btnGoCustom.onclick = () => {
    if (!canActivateMenuAction()) return;
    openCustomMapsScreen(null);
  };
  menuActions.appendChild(btnGoCustom);
  actionButtons.push(btnGoCustom);

  if (isResultScreen && activeCustomMapIndex !== null) {
    const btnEditCurrentCustom = document.createElement('button');
    btnEditCurrentCustom.className = 'btn-big btn-blue';
    btnEditCurrentCustom.dataset.label = `✏️ Edytuj tę mapę (${customMaps[activeCustomMapIndex].name})`;
    btnEditCurrentCustom.onclick = () => {
      if (!canActivateMenuAction()) return;
      openCustomMapsScreen(activeCustomMapIndex);
    };
    menuActions.appendChild(btnEditCurrentCustom);
    actionButtons.push(btnEditCurrentCustom);

    const btnGoLevels = document.createElement('button');
    btnGoLevels.className = 'btn-big';
    btnGoLevels.dataset.label = '📋 Menu Poziomów (1–20)';
    btnGoLevels.onclick = () => {
      if (!canActivateMenuAction()) return;
      activeCustomMapIndex = null;
      openMenu('select');
    };
    menuActions.appendChild(btnGoLevels);
    actionButtons.push(btnGoLevels);
  }

  function syncMenuGuardUI() {
    const now = performance.now();
    const remMs = menuReadyAt - now;
    const locked = remMs > 0 || !pointerReleasedAfterMenuOpen;
    unlockedCards.forEach(c => c.classList.toggle('guard-wait', locked));
    actionButtons.forEach(b => {
      b.disabled = locked;
      if (remMs > 0) {
        b.textContent = `⏳ Poczekaj ${(remMs / 1000).toFixed(1)}s...`;
      } else if (!pointerReleasedAfterMenuOpen) {
        b.textContent = `🖱️ Puść przycisk myszy, aby wybrać...`;
      } else {
        b.textContent = b.dataset.label;
      }
    });
    if (!locked && menuCountdownInterval) {
      clearInterval(menuCountdownInterval);
      menuCountdownInterval = null;
    }
  }

  syncMenuGuardUI();
  if (isResultScreen) {
    menuCountdownInterval = setInterval(syncMenuGuardUI, 80);
  }
}
