// Stan gry, referencje DOM oraz zapis postępów w localStorage

const canvas = document.getElementById('gameCanvas');
let ctx = canvas.getContext('2d'); // let: podgląd NPC w przeglądzie wrogów tymczasowo podmienia kontekst rysowania

const paintCanvas = document.createElement('canvas');
paintCanvas.width = canvas.width;
paintCanvas.height = canvas.height;
const paintCtx = paintCanvas.getContext('2d');

const levelText = document.getElementById('levelText');
const diamondStatBox = document.getElementById('diamondStatBox');
const diamondsText = document.getElementById('diamondsText');
const ammoText = document.getElementById('ammoText');
const rocketsText = document.getElementById('rocketsText');
const minesText = document.getElementById('minesText');
const hpText = document.getElementById('hpText');
const hpFill = document.getElementById('hpFill');
const aliveText = document.getElementById('aliveText');

const btnOpenMenu = document.getElementById('btnOpenMenu');
const btnOpenCustom = document.getElementById('btnOpenCustom');
const btnOpenShop = document.getElementById('btnOpenShop');
const btnSwitchWeapon = document.getElementById('btnSwitchWeapon');
const btnPause = document.getElementById('btnPause');
const btnPrevLevel = document.getElementById('btnPrevLevel');
const btnNextLevel = document.getElementById('btnNextLevel');
const btnPlaceMine = document.getElementById('btnPlaceMine');
const btnRetry = document.getElementById('btnRetry');
const btnFullscreen = document.getElementById('btnFullscreen');
const btnTheme = document.getElementById('btnTheme');
const btnOpenSettings = document.getElementById('btnOpenSettings');
const topbarEl = document.querySelector('.topbar');

// Elementy sterowania dotykowego (tablety / telefony)
const touchControls = document.getElementById('touchControls');
const touchActionGroup = document.getElementById('touchActionGroup');
const joystickBase = document.getElementById('joystickBase');
const joystickThumb = document.getElementById('joystickThumb');
const touchBtnWeapon = document.getElementById('touchBtnWeapon');
const touchBtnMine = document.getElementById('touchBtnMine');
const touchMineBadge = document.getElementById('touchMineBadge');

const touchJoystick = {
  active: false,
  identifier: null,
  baseX: 0,
  baseY: 0,
  dx: 0,
  dy: 0,
  radius: 50
};
let touchAimId = null;
let isTouchDevice = false;

const menuOverlay = document.getElementById('menuOverlay');
const menuTitle = document.getElementById('menuTitle');
const menuSubtitle = document.getElementById('menuSubtitle');
const levelsGrid = document.getElementById('levelsGrid');
const menuActions = document.getElementById('menuActions');

const customOverlay = document.getElementById('customOverlay');
const customOverlayTitle = document.getElementById('customOverlayTitle');
const customOverlaySub = document.getElementById('customOverlaySub');
const customListView = document.getElementById('customListView');
const customMapsGrid = document.getElementById('customMapsGrid');
const customEditorView = document.getElementById('customEditorView');
const btnAddCustomMap = document.getElementById('btnAddCustomMap');
const btnCustomToLevels = document.getElementById('btnCustomToLevels');
const btnCloseCustom = document.getElementById('btnCloseCustom');

const shopOverlay = document.getElementById('shopOverlay');
const shopSubtitle = document.getElementById('shopSubtitle');
const shopWeaponsGrid = document.getElementById('shopWeaponsGrid');
const btnShopToLevels = document.getElementById('btnShopToLevels');
const btnCloseShop = document.getElementById('btnCloseShop');

const settingsOverlay = document.getElementById('settingsOverlay');
const settingsBox = document.getElementById('settingsBox');
const btnSettingsToLevels = document.getElementById('btnSettingsToLevels');
const btnCloseSettings = document.getElementById('btnCloseSettings');

const enemiesOverlay = document.getElementById('enemiesOverlay');
const enemiesCatalogGrid = document.getElementById('enemiesCatalogGrid');
const btnOpenEnemies = document.getElementById('btnOpenEnemies');
const btnEnemiesToLevels = document.getElementById('btnEnemiesToLevels');
const btnCloseEnemies = document.getElementById('btnCloseEnemies');

const resultPopupOverlay = document.getElementById('resultPopupOverlay');
const resultPopupCard = document.getElementById('resultPopupCard');
const resultPopupTitle = document.getElementById('resultPopupTitle');
const resultPopupSub = document.getElementById('resultPopupSub');
const resultPopupRewards = document.getElementById('resultPopupRewards');
const resultPopupActions = document.getElementById('resultPopupActions');

const keys = {};
let mouse = { x: 470, y: 380, down: false, active: false };

let player = {
  x: 470,
  y: 495,
  speed: 4.0,
  radius: 16,
  angle: -Math.PI / 2,
  walkCycle: 0,
  cooldown: 0,
  hp: 200,
  maxHp: 200,
  hpRegenTimer: 0,
  healTimers: [],
  ammo: 30,
  rockets: 3,
  emptyBazookaTries: 0,
  weapon: 'pistol',
  hitFlash: 0,
  splatColor: null
};

let gameState = 'menu'; // 'playing' | 'menu' | 'custom_maps' | 'dead' | 'level_clear' | 'paused'
let hasStartedAnyGame = false;
let startTime = performance.now();
let survivalSeconds = 0;
let level = 1;
let unlockedLevel = 1;
let minesCount = 2; // Na starcie mamy 2 miny!
let bestTimes = {};
let activeCustomMapIndex = null;
let totalEnemiesInLevel = 1;
let currentThemeIndex = 0;
let diamonds = 1;
let ownedWeapons = ['pistol'];
let defaultWeapon = 'pistol';
let bazookaUpgraded = false;
let ownedUpgrades = [];
let hpLevel = 0; // Nieskończony tor życia: każdy poziom = +5 max HP
let startingAmmoLevel = 0; // Nieskończony tor startowych nabojów: każdy poziom = +10 nabojów na start rundy (cena Fibonacci)
let ammoRegenLevel = 0; // Nieskończony tor uzupełniania nabojów: każdy poziom = +1 nabój co 5 sekund
let healingLevel = 0; // Zaczynamy od 0 HP / 5s (pierwszy poziom leczenia również kupuje się w sklepie)
let helperUnlocked = false; // Tor Pomocnika (sojuszniczy gracz, 5 HP, respawn 12s)
let helperCount = 1; // Liczba pomocników: 1 (start), 2 (+10 💎), 3 (+20 💎)
let helperHealingLevel = 0; // Tor leczenia pomocnika: 1HP/5s, 2HP/5s, 3HP/5s...
let helper = null; // Dla kompatybilności wstecznej (wskazuje helpers[0])
let helpers = []; // Tablica wszystkich sojuszniczych pomocników
let lastDiamondsEarned = 0;

let customMaps = [
  { name: 'Moja Mapa 1', arenaIndex: 0, clouds: 1, civilians: 1, normal: 2, tough: 0, rapid: 1, boss: 0 },
  { name: 'Twierdza Pancernych', arenaIndex: 2, clouds: 2, civilians: 2, normal: 1, tough: 2, rapid: 0, boss: 0 },
  { name: 'Szybkie Starcie', arenaIndex: 1, clouds: 1, civilians: 1, normal: 0, tough: 1, rapid: 3, boss: 0 },
  { name: 'Arena Bossów', arenaIndex: 3, clouds: 3, civilians: 2, normal: 1, tough: 1, rapid: 1, boss: 2 }
];

try {
  const savedUnlocked = parseInt(localStorage.getItem('tymek_paintball_unlocked') || '1', 10);
  if (savedUnlocked >= 1) unlockedLevel = savedUnlocked;
  const savedLast = parseInt(localStorage.getItem('tymek_paintball_last_level') || String(unlockedLevel), 10);
  if (savedLast >= 1 && savedLast <= unlockedLevel) level = savedLast;
  const savedMines = localStorage.getItem('tymek_paintball_mines');
  if (savedMines !== null) {
    const parsedMines = parseInt(savedMines, 10);
    if (!isNaN(parsedMines) && parsedMines >= 0) minesCount = parsedMines;
  }
  const savedTimes = JSON.parse(localStorage.getItem('tymek_paintball_times') || '{}');
  if (savedTimes && typeof savedTimes === 'object') bestTimes = savedTimes;
  const savedCustom = JSON.parse(localStorage.getItem('tymek_paintball_custom_maps') || 'null');
  if (Array.isArray(savedCustom) && savedCustom.length > 0) customMaps = savedCustom;
  const savedTheme = parseInt(localStorage.getItem('tymek_paintball_theme') || '0', 10);
  if (!isNaN(savedTheme) && savedTheme >= 0 && savedTheme < graphicThemes.length) {
    currentThemeIndex = savedTheme;
  }
  const savedDiamonds = localStorage.getItem('tymek_paintball_diamonds');
  if (savedDiamonds !== null) {
    const parsedDiamonds = parseInt(savedDiamonds, 10);
    if (!isNaN(parsedDiamonds) && parsedDiamonds >= 0) diamonds = parsedDiamonds;
  } else {
    diamonds = 1;
  }
  const savedOwnedWeapons = JSON.parse(localStorage.getItem('tymek_paintball_owned_weapons') || '["pistol"]');
  if (Array.isArray(savedOwnedWeapons) && savedOwnedWeapons.length > 0) {
    ownedWeapons = savedOwnedWeapons.includes('pistol') ? savedOwnedWeapons : ['pistol', ...savedOwnedWeapons];
  }
  const savedDefaultWeapon = localStorage.getItem('tymek_paintball_default_weapon');
  if (savedDefaultWeapon && ownedWeapons.includes(savedDefaultWeapon)) {
    defaultWeapon = savedDefaultWeapon;
    player.weapon = defaultWeapon;
  }
  const savedBazookaUpg = localStorage.getItem('tymek_paintball_bazooka_upgraded');
  if (savedBazookaUpg === '1') {
    bazookaUpgraded = true;
  }
  const savedUpgrades = JSON.parse(localStorage.getItem('tymek_paintball_upgrades') || '[]');
  if (Array.isArray(savedUpgrades)) {
    ownedUpgrades = savedUpgrades;
  }
  if (bazookaUpgraded && !ownedUpgrades.includes('bazooka_rockets_5')) {
    ownedUpgrades.push('bazooka_rockets_5');
  }
  if (ownedUpgrades.includes('bazooka_rockets_5') && !ownedUpgrades.includes('bazooka_rockets_3')) {
    ownedUpgrades.push('bazooka_rockets_3');
  }
  if (ownedUpgrades.includes('bazooka_rockets_7') && !ownedUpgrades.includes('bazooka_rockets_5')) {
    ownedUpgrades.push('bazooka_rockets_5');
  }
  if (ownedUpgrades.some(u => u.startsWith('bazooka_rockets_'))) {
    bazookaUpgraded = true;
  }
  const savedHpLevel = localStorage.getItem('tymek_paintball_hp_level');
  if (savedHpLevel !== null) {
    const parsedHp = parseInt(savedHpLevel, 10);
    if (!isNaN(parsedHp) && parsedHp >= 0) hpLevel = parsedHp;
  } else {
    // Migracja ze starego toru (+5, +10, +15 HP): zachowaj dotychczasowy bonus
    let oldBonus = 0;
    if (ownedUpgrades.includes('hp_boost_1')) oldBonus += 5;
    if (ownedUpgrades.includes('hp_boost_2')) oldBonus += 10;
    if (ownedUpgrades.includes('hp_boost_3')) oldBonus += 15;
    hpLevel = oldBonus / 5;
  }
  const savedStartingAmmo = localStorage.getItem('tymek_paintball_starting_ammo_level');
  if (savedStartingAmmo !== null) {
    const parsedStartAmmo = parseInt(savedStartingAmmo, 10);
    if (!isNaN(parsedStartAmmo) && parsedStartAmmo >= 0) startingAmmoLevel = parsedStartAmmo;
  } else {
    // Migracja z ulepszeń pistol_ammo_1 i pistol_ammo_2
    if (ownedUpgrades.includes('pistol_ammo_2')) startingAmmoLevel = 2; // +25 (zaokrąglone do 2 poziomów)
    else if (ownedUpgrades.includes('pistol_ammo_1')) startingAmmoLevel = 1;
  }
  const savedHealing = parseInt(localStorage.getItem('tymek_paintball_healing_level') || '0', 10);
  if (!isNaN(savedHealing) && savedHealing >= 0) {
    healingLevel = savedHealing;
  }
  const savedAmmoRegen = parseInt(localStorage.getItem('tymek_paintball_ammo_regen_level') || '0', 10);
  if (!isNaN(savedAmmoRegen) && savedAmmoRegen >= 0) {
    ammoRegenLevel = savedAmmoRegen;
  }
  helperUnlocked = localStorage.getItem('tymek_paintball_helper_unlocked') === '1';
  const savedHelperCount = parseInt(localStorage.getItem('tymek_paintball_helper_count') || '1', 10);
  if (!isNaN(savedHelperCount) && savedHelperCount >= 1) {
    helperCount = Math.min(3, Math.max(1, savedHelperCount));
  }
  const savedHelperHeal = parseInt(localStorage.getItem('tymek_paintball_helper_healing_level') || '0', 10);
  if (!isNaN(savedHelperHeal) && savedHelperHeal >= 0) {
    helperHealingLevel = savedHelperHeal;
  }
} catch (e) {}

function getHealingPer5Sec() {
  return healingLevel;
}

let enemyRespawnQueue = [];
let levelClearPending = false;
let levelVictoryDelay = 0;
let playerDeadPending = false;

// Typy przeciwników, które występują na którymkolwiek z odblokowanych poziomów kampanii (1..unlockedLevel)
function getUnlockedEnemyKinds() {
  const kinds = new Set();
  for (let i = 1; i <= unlockedLevel; i++) {
    for (const kind of getLevelConfig(i).roster) kinds.add(kind);
  }
  return kinds;
}

// Zwraca listę nazw zablokowanych typów przeciwników użytych w mapie własnej (pusta lista = mapę można uruchomić)
function getLockedKindsInCustomMap(cm) {
  const unlocked = getUnlockedEnemyKinds();
  const locked = [];
  for (const kind of ENEMY_KIND_KEYS) {
    if ((cm[kind] || 0) > 0 && !unlocked.has(kind)) {
      const info = ENEMY_KIND_INFO[kind];
      locked.push(info ? info.shortName : kind);
    }
  }
  return locked;
}

function getStartingMaxHp() {
  return 200 + hpLevel * 5;
}

function getStartingAmmo() {
  return 30 + startingAmmoLevel * 10;
}

function getStartingRockets() {
  if (!ownedWeapons.includes('bazooka')) return 0;
  if (ownedUpgrades.includes('bazooka_rockets_8')) return 8;
  if (ownedUpgrades.includes('bazooka_rockets_7')) return 7;
  if (ownedUpgrades.includes('bazooka_rockets_5')) return 5;
  if (ownedUpgrades.includes('bazooka_rockets_3')) return 3;
  return 2;
}

player.maxHp = getStartingMaxHp();
player.hp = player.maxHp;
player.ammo = getStartingAmmo();
player.rockets = getStartingRockets();

let levelBannerTimer = 0;
let menuReadyAt = 0;
let menuPointerArmed = false;
let pointerReleasedAfterMenuOpen = true;
let menuCountdownInterval = null;
let ammoSpawnTimer = 420; // Co ok. 7 sekund pojawia się paczka 10 nabojów na mapie
let rocketSpawnTimer = 1500; // Bardzo rzadko (co ok. 25 sekund) pojawia się nowa rakieta do bazooki
let enemies = [];
let civilians = [];
let civilianRespawnQueue = [];
let bullets = [];
let homingRockets = [];
let rocketPickups = [];
let placedMines = [];
let enemyMines = []; // Miny podkładane przez przeciwników typu 'miner' (widoczne dla innych wrogów i cywili)
let ammoPickups = [];
let popups = [];
let explosions = [];
let particles = [];
let splats = [];
let clouds = [];
let paintCanvasDirty = false;
let eliminatedHumans = [];

// ==================== ZMIENNE STANU DLA BOMBY ATOMOWEJ ====================
let nukeAiming = {
  active: false,
  x: 0,
  y: 0,
  holdFrames: 0,
  radius: 40,
  cost: 5
};
let nukeExplosions = [];
let nukeFlashTimer = 0;
let nukeScreenShake = 0;

// Obliczenie kosztu markerów n log n na podstawie promienia r (od rMin = 40 do rMax = 320)
function computeNukeAmmoCost(radius) {
  const rMin = 40;
  const rClamped = Math.max(rMin, radius);
  const n = (rClamped - rMin) / 10 + 2; // n rośnie od 2 do ok. 30
  // n * log2(n) * 2.2 skaluje koszt od 5 do ok. 80-120 markerów
  const cost = Math.round(n * Math.log2(n) * 2.2);
  return Math.max(5, cost);
}

function saveProgress() {
  try {
    localStorage.setItem('tymek_paintball_unlocked', String(unlockedLevel));
    localStorage.setItem('tymek_paintball_last_level', String(level));
    localStorage.setItem('tymek_paintball_mines', String(minesCount));
    localStorage.setItem('tymek_paintball_times', JSON.stringify(bestTimes));
    localStorage.setItem('tymek_paintball_custom_maps', JSON.stringify(customMaps));
    localStorage.setItem('tymek_paintball_theme', String(currentThemeIndex));
    localStorage.setItem('tymek_paintball_diamonds', String(diamonds));
    localStorage.setItem('tymek_paintball_owned_weapons', JSON.stringify(ownedWeapons));
    localStorage.setItem('tymek_paintball_default_weapon', defaultWeapon);
    localStorage.setItem('tymek_paintball_bazooka_upgraded', bazookaUpgraded ? '1' : '0');
    localStorage.setItem('tymek_paintball_upgrades', JSON.stringify(ownedUpgrades));
    localStorage.setItem('tymek_paintball_healing_level', String(healingLevel));
    localStorage.setItem('tymek_paintball_hp_level', String(hpLevel));
    localStorage.setItem('tymek_paintball_starting_ammo_level', String(startingAmmoLevel));
    localStorage.setItem('tymek_paintball_ammo_regen_level', String(ammoRegenLevel));
    localStorage.setItem('tymek_paintball_helper_unlocked', helperUnlocked ? '1' : '0');
    localStorage.setItem('tymek_paintball_helper_count', String(helperCount));
    localStorage.setItem('tymek_paintball_helper_healing_level', String(helperHealingLevel));
  } catch (e) {}
}

function resetAllProgress() {
  try {
    localStorage.removeItem('tymek_paintball_unlocked');
    localStorage.removeItem('tymek_paintball_last_level');
    localStorage.removeItem('tymek_paintball_mines');
    localStorage.removeItem('tymek_paintball_times');
    localStorage.removeItem('tymek_paintball_custom_maps');
    localStorage.removeItem('tymek_paintball_diamonds');
    localStorage.removeItem('tymek_paintball_owned_weapons');
    localStorage.removeItem('tymek_paintball_default_weapon');
    localStorage.removeItem('tymek_paintball_bazooka_upgraded');
    localStorage.removeItem('tymek_paintball_upgrades');
    localStorage.removeItem('tymek_paintball_healing_level');
    localStorage.removeItem('tymek_paintball_hp_level');
    localStorage.removeItem('tymek_paintball_starting_ammo_level');
    localStorage.removeItem('tymek_paintball_ammo_regen_level');
    localStorage.removeItem('tymek_paintball_helper_unlocked');
    localStorage.removeItem('tymek_paintball_helper_count');
    localStorage.removeItem('tymek_paintball_helper_healing_level');
  } catch (e) {}

  level = 1;
  unlockedLevel = 1;
  minesCount = 2;
  placedMines = [];
  bestTimes = {};
  activeCustomMapIndex = null;
  diamonds = 1;
  ownedWeapons = ['pistol'];
  defaultWeapon = 'pistol';
  bazookaUpgraded = false;
  ownedUpgrades = [];
  healingLevel = 0;
  hpLevel = 0;
  ammoRegenLevel = 0;
  helperUnlocked = false;
  helperHealingLevel = 0;
  helper = null;
  lastDiamondsEarned = 0;

  customMaps = [
    { name: 'Moja Mapa 1', arenaIndex: 0, clouds: 1, normal: 2, tough: 0, rapid: 1, boss: 0 },
    { name: 'Twierdza Pancernych', arenaIndex: 2, clouds: 2, normal: 1, tough: 2, rapid: 0, boss: 0 },
    { name: 'Szybkie Starcie', arenaIndex: 1, clouds: 1, normal: 0, tough: 1, rapid: 3, boss: 0 },
    { name: 'Arena Bossów', arenaIndex: 3, clouds: 3, normal: 1, tough: 1, rapid: 1, boss: 2 }
  ];

  player.weapon = 'pistol';
  player.maxHp = getStartingMaxHp();
  player.hp = player.maxHp;
  player.ammo = getStartingAmmo();
  player.rockets = getStartingRockets();

  saveProgress();
}
