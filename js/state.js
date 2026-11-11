// Stan gry, referencje DOM oraz zapis postępów w localStorage

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const paintCanvas = document.createElement('canvas');
paintCanvas.width = canvas.width;
paintCanvas.height = canvas.height;
const paintCtx = paintCanvas.getContext('2d');

const levelText = document.getElementById('levelText');
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
const btnFollowMouse = document.getElementById('btnFollowMouse');
const btnTheme = document.getElementById('btnTheme');
const topbarEl = document.querySelector('.topbar');

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

const keys = {};
let followMouse = true;
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
  ammo: 30,
  rockets: 5,
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
let diamonds = 0;
let ownedWeapons = ['pistol'];
let defaultWeapon = 'pistol';
let lastDiamondsEarned = 0;

let customMaps = [
  { name: 'Moja Mapa 1', arenaIndex: 0, clouds: 1, normal: 2, tough: 0, rapid: 1, boss: 0 },
  { name: 'Twierdza Pancernych', arenaIndex: 2, clouds: 2, normal: 1, tough: 2, rapid: 0, boss: 0 },
  { name: 'Szybkie Starcie', arenaIndex: 1, clouds: 1, normal: 0, tough: 1, rapid: 3, boss: 0 },
  { name: 'Arena Bossów', arenaIndex: 3, clouds: 3, normal: 1, tough: 1, rapid: 1, boss: 2 }
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
  const savedFollow = localStorage.getItem('tymek_paintball_follow_mouse');
  if (savedFollow !== null) followMouse = savedFollow === '1';
  const savedCustom = JSON.parse(localStorage.getItem('tymek_paintball_custom_maps') || 'null');
  if (Array.isArray(savedCustom) && savedCustom.length > 0) customMaps = savedCustom;
  const savedTheme = parseInt(localStorage.getItem('tymek_paintball_theme') || '0', 10);
  if (!isNaN(savedTheme) && savedTheme >= 0 && savedTheme < graphicThemes.length) {
    currentThemeIndex = savedTheme;
  }
  const savedDiamonds = parseInt(localStorage.getItem('tymek_paintball_diamonds') || '0', 10);
  if (!isNaN(savedDiamonds) && savedDiamonds >= 0) diamonds = savedDiamonds;
  const savedOwnedWeapons = JSON.parse(localStorage.getItem('tymek_paintball_owned_weapons') || '["pistol"]');
  if (Array.isArray(savedOwnedWeapons) && savedOwnedWeapons.length > 0) {
    ownedWeapons = savedOwnedWeapons.includes('pistol') ? savedOwnedWeapons : ['pistol', ...savedOwnedWeapons];
  }
  const savedDefaultWeapon = localStorage.getItem('tymek_paintball_default_weapon');
  if (savedDefaultWeapon && ownedWeapons.includes(savedDefaultWeapon)) {
    defaultWeapon = savedDefaultWeapon;
    player.weapon = defaultWeapon;
  }
} catch (e) {}

let levelBannerTimer = 0;
let menuReadyAt = 0;
let menuPointerArmed = false;
let pointerReleasedAfterMenuOpen = true;
let menuCountdownInterval = null;
let ammoSpawnTimer = 420; // Co ok. 7 sekund pojawia się paczka 10 nabojów na mapie
let rocketSpawnTimer = 1500; // Bardzo rzadko (co ok. 25 sekund) pojawia się nowa rakieta do bazooki
let enemies = [];
let bullets = [];
let homingRockets = [];
let rocketPickups = [];
let placedMines = [];
let ammoPickups = [];
let popups = [];
let explosions = [];
let particles = [];
let splats = [];
let clouds = [];
let paintCanvasDirty = false;
let eliminatedHumans = [];

function saveProgress() {
  try {
    localStorage.setItem('tymek_paintball_unlocked', String(unlockedLevel));
    localStorage.setItem('tymek_paintball_last_level', String(level));
    localStorage.setItem('tymek_paintball_mines', String(minesCount));
    localStorage.setItem('tymek_paintball_times', JSON.stringify(bestTimes));
    localStorage.setItem('tymek_paintball_follow_mouse', followMouse ? '1' : '0');
    localStorage.setItem('tymek_paintball_custom_maps', JSON.stringify(customMaps));
    localStorage.setItem('tymek_paintball_theme', String(currentThemeIndex));
    localStorage.setItem('tymek_paintball_diamonds', String(diamonds));
    localStorage.setItem('tymek_paintball_owned_weapons', JSON.stringify(ownedWeapons));
    localStorage.setItem('tymek_paintball_default_weapon', defaultWeapon);
  } catch (e) {}
}
