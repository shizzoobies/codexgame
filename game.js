const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const startOverlay = document.getElementById('startOverlay');
const gameOverOverlay = document.getElementById('gameOverOverlay');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');
const pauseBtn = document.getElementById('pauseBtn');
const audioBtn = document.getElementById('audioBtn');
const scoreEl = document.getElementById('score');
const coinsEl = document.getElementById('coins');
const waveEl = document.getElementById('wave');
const hpEl = document.getElementById('hp');
const bestEl = document.getElementById('best');
const weaponEl = document.getElementById('weapon');
const formEl = document.getElementById('form');
const statusTextEl = document.getElementById('statusText');
const finalStats = document.getElementById('finalStats');

const W = canvas.width;
const H = canvas.height;
const PLAY_LEFT = 30;
const PLAY_RIGHT = W - 30;
const PLAY_TOP = 70;
const PLAY_BOTTOM = H - 36;
const BOSS_INTERVAL = 4;

const BEST_SCORE_KEY = 'sky-raider-blitz-best';
const AUDIO_ENABLED_KEY = 'sky-raider-blitz-audio';

const MUSIC_TRACKS = [
  'assets/music/digital-horizon.mp3',
  'assets/music/digital-pulse-loop.mp3',
  'assets/music/hype-drop.mp3',
  'assets/music/midnight-drift.mp3',
  'assets/music/midnight-drive.mp3',
  'assets/music/pixel-overload.mp3',
  'assets/music/viral-vibe.mp3',
];

const SFX_FILES = {
  shoot: 'assets/sfx/player-shot.ogg',
  enemyShot: 'assets/sfx/enemy-shot.ogg',
  hit: 'assets/sfx/enemy-hit.ogg',
  explode: 'assets/sfx/explosion.ogg',
  coin: 'assets/sfx/coin.ogg',
  uiClick: 'assets/sfx/button-click.ogg',
};

const FORMS = [
  {
    name: 'Scout',
    tech: 0,
    body: '#4fd9a7',
    glass: '#ecfffb',
    wing: '#86c2ff',
    trail: 'rgba(123, 182, 255, 0.82)',
  },
  {
    name: 'Interceptor',
    tech: 4,
    body: '#7ff5ce',
    glass: '#f3fffb',
    wing: '#8ed0ff',
    trail: 'rgba(155, 231, 255, 0.9)',
  },
  {
    name: 'Vanguard',
    tech: 9,
    body: '#ffd56d',
    glass: '#fff6d0',
    wing: '#ffad6a',
    trail: 'rgba(255, 196, 120, 0.92)',
  },
  {
    name: 'Starforged',
    tech: 15,
    body: '#d0a0ff',
    glass: '#fbf0ff',
    wing: '#9fc9ff',
    trail: 'rgba(208, 160, 255, 0.9)',
  },
];

const WEAPON_LEVELS = [
  {
    name: 'Pulse',
    xpToNext: 2,
    shots: [{ offsetX: 0, offsetY: 0, width: 8, height: 20, damageMult: 1, speedBonus: 0, pierce: 0, angle: 0 }],
  },
  {
    name: 'Twinfang',
    xpToNext: 3,
    shots: [
      { offsetX: -12, offsetY: 0, width: 7, height: 18, damageMult: 1, speedBonus: 0.3, pierce: 0, angle: -0.03 },
      { offsetX: 12, offsetY: 0, width: 7, height: 18, damageMult: 1, speedBonus: 0.3, pierce: 0, angle: 0.03 },
    ],
  },
  {
    name: 'Scatter',
    xpToNext: 4,
    shots: [
      { offsetX: -22, offsetY: 2, width: 7, height: 18, damageMult: 0.95, speedBonus: -0.2, pierce: 0, angle: -0.18 },
      { offsetX: 0, offsetY: -2, width: 8, height: 20, damageMult: 1.1, speedBonus: 0.2, pierce: 0, angle: 0 },
      { offsetX: 22, offsetY: 2, width: 7, height: 18, damageMult: 0.95, speedBonus: -0.2, pierce: 0, angle: 0.18 },
    ],
  },
  {
    name: 'Railstorm',
    xpToNext: 999,
    shots: [
      { offsetX: -16, offsetY: 0, width: 6, height: 22, damageMult: 1.1, speedBonus: 1, pierce: 1, angle: -0.06 },
      { offsetX: 0, offsetY: -3, width: 8, height: 24, damageMult: 1.45, speedBonus: 1.4, pierce: 2, angle: 0 },
      { offsetX: 16, offsetY: 0, width: 6, height: 22, damageMult: 1.1, speedBonus: 1, pierce: 1, angle: 0.06 },
    ],
  },
];

const MODULE_TYPES = {
  rapid: {
    label: 'RAPID',
    color: '#7bb6ff',
    tech: 1,
    apply() {
      player.fireRate = Math.max(5, player.fireRate - 1);
      return 'Attack speed boosted.';
    },
  },
  weapon: {
    label: 'ARSNL',
    color: '#ffd86b',
    tech: 1,
    apply() {
      return gainWeaponXp(1);
    },
  },
  forge: {
    label: 'FORGE',
    color: '#ffb26b',
    tech: 1,
    apply() {
      player.bulletDamage += 0.28;
      return 'Shot core reinforced.';
    },
  },
  repair: {
    label: 'REPAIR',
    color: '#80f5be',
    tech: 1,
    apply() {
      if (player.hp < player.maxHp) {
        player.hp += 1;
        return 'Hull patched mid-run.';
      }

      player.shield = Math.min(3, player.shield + 1);
      return 'Repair pod converted to shield.';
    },
  },
  core: {
    label: 'CORE',
    color: '#bf98ff',
    tech: 2,
    apply() {
      player.bulletSpeed += 0.35;
      player.homing = Math.min(3, player.homing + 1);
      return 'Guidance core tuned.';
    },
  },
  thruster: {
    label: 'THRUST',
    color: '#7df0df',
    tech: 1,
    apply() {
      player.moveSpeed += 0.35;
      player.magnet += 12;
      return 'Thrusters overclocked.';
    },
  },
};

function safeLoadBestScore() {
  try {
    return Number(localStorage.getItem(BEST_SCORE_KEY)) || 0;
  } catch {
    return 0;
  }
}

function safeSaveBestScore(value) {
  try {
    localStorage.setItem(BEST_SCORE_KEY, String(value));
  } catch {
    // Ignore storage failures so the game keeps running in restrictive contexts.
  }
}

function safeLoadAudioEnabled() {
  try {
    const value = localStorage.getItem(AUDIO_ENABLED_KEY);
    return value === null ? true : value === 'true';
  } catch {
    return true;
  }
}

function safeSaveAudioEnabled(value) {
  try {
    localStorage.setItem(AUDIO_ENABLED_KEY, String(value));
  } catch {
    // Ignore storage failures so the game keeps running in restrictive contexts.
  }
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function lerp(start, end, amount) {
  return start + (end - start) * amount;
}

function randomRange(min, max) {
  return Math.random() * (max - min) + min;
}

function randomInt(min, max) {
  return Math.floor(randomRange(min, max + 1));
}

function randomChoice(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function shuffle(list) {
  const next = [...list];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const swapIndex = Math.floor(Math.random() * (i + 1));
    [next[i], next[swapIndex]] = [next[swapIndex], next[i]];
  }
  return next;
}

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function buildStars() {
  return Array.from({ length: 54 }, () => ({
    x: Math.random() * W,
    y: Math.random() * H,
    size: Math.random() * 2.2 + 0.6,
    speed: Math.random() * 1.9 + 0.7,
    alpha: Math.random() * 0.65 + 0.2,
  }));
}

function createMusicPlayer() {
  const audio = new Audio();
  audio.volume = 0.42;
  audio.preload = 'auto';
  return audio;
}

function buildSoundPool(src, size = 5) {
  return Array.from({ length: size }, () => {
    const audio = new Audio(src);
    audio.preload = 'auto';
    return audio;
  });
}

let audioContext = null;
const musicPlayer = createMusicPlayer();
const sfxPools = {};
let musicQueue = [];
let currentTrackIndex = -1;
let audioUnlocked = false;

function ensureAudioContext() {
  if (!audioContext) {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (Ctor) {
      audioContext = new Ctor();
    }
  }

  if (audioContext && audioContext.state === 'suspended') {
    audioContext.resume().catch(() => {});
  }

  return audioContext;
}

function playOscillator({ start = 260, end = 260, duration = 0.08, type = 'square', volume = 0.05 }) {
  const ac = ensureAudioContext();
  if (!ac) {
    return;
  }

  const now = ac.currentTime;
  const oscillator = ac.createOscillator();
  const gain = ac.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(start, now);
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(0.001, end), now + duration);
  gain.gain.setValueAtTime(volume, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  oscillator.connect(gain);
  gain.connect(ac.destination);
  oscillator.start(now);
  oscillator.stop(now + duration);
}

function playNoiseBurst({ duration = 0.14, volume = 0.045, lowpass = 900 }) {
  const ac = ensureAudioContext();
  if (!ac) {
    return;
  }

  const buffer = ac.createBuffer(1, Math.floor(ac.sampleRate * duration), ac.sampleRate);
  const channel = buffer.getChannelData(0);
  for (let i = 0; i < channel.length; i += 1) {
    channel[i] = (Math.random() * 2 - 1) * (1 - i / channel.length);
  }

  const source = ac.createBufferSource();
  const filter = ac.createBiquadFilter();
  const gain = ac.createGain();
  filter.type = 'lowpass';
  filter.frequency.value = lowpass;
  gain.gain.value = volume;
  source.buffer = buffer;
  source.connect(filter);
  filter.connect(gain);
  gain.connect(ac.destination);
  source.start();
}

function playSfxFallback(name) {
  if (!state.audioEnabled) {
    return;
  }

  switch (name) {
    case 'shoot':
      playOscillator({ start: 700, end: 360, duration: 0.06, type: 'square', volume: 0.03 });
      break;
    case 'enemyShot':
      playOscillator({ start: 240, end: 90, duration: 0.1, type: 'sawtooth', volume: 0.03 });
      break;
    case 'hit':
      playOscillator({ start: 320, end: 150, duration: 0.07, type: 'triangle', volume: 0.04 });
      break;
    case 'explode':
      playNoiseBurst({ duration: 0.2, volume: 0.05, lowpass: 700 });
      break;
    case 'coin':
      playOscillator({ start: 540, end: 880, duration: 0.07, type: 'triangle', volume: 0.03 });
      break;
    case 'uiClick':
      playOscillator({ start: 420, end: 520, duration: 0.04, type: 'triangle', volume: 0.025 });
      break;
    default:
      break;
  }
}

function playSfx(name, options = {}) {
  if (!state.audioEnabled) {
    return;
  }

  const pool = sfxPools[name];
  const clip = pool ? pool.find((item) => item.paused || item.ended) || pool[0] : null;
  if (!clip) {
    playSfxFallback(name);
    return;
  }

  try {
    clip.pause();
    clip.currentTime = 0;
    clip.volume = options.volume ?? 0.45;
    const playPromise = clip.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => playSfxFallback(name));
    }
  } catch {
    playSfxFallback(name);
  }
}

function preloadSfx() {
  Object.entries(SFX_FILES).forEach(([key, src]) => {
    sfxPools[key] = buildSoundPool(src, key === 'explode' ? 3 : 5);
    sfxPools[key].forEach((clip) => clip.load());
  });
}

function refillMusicQueue() {
  const fresh = shuffle(MUSIC_TRACKS.map((_, index) => index));
  if (fresh.length > 1 && fresh[0] === currentTrackIndex) {
    [fresh[0], fresh[1]] = [fresh[1], fresh[0]];
  }
  musicQueue = fresh;
}

function queueNextTrack() {
  if (!audioUnlocked || !state.audioEnabled || !state.running || state.paused || state.gameOver) {
    return;
  }

  if (!musicQueue.length) {
    refillMusicQueue();
  }

  currentTrackIndex = musicQueue.shift();
  musicPlayer.src = MUSIC_TRACKS[currentTrackIndex];
  musicPlayer.currentTime = 0;
  musicPlayer.play().catch(() => {});
}

function ensureMusicStarted() {
  if (!audioUnlocked || !state.audioEnabled || !state.running || state.paused || state.gameOver) {
    return;
  }

  if (!musicPlayer.src) {
    queueNextTrack();
    return;
  }

  if (musicPlayer.paused) {
    musicPlayer.play().catch(() => {});
  }
}

function stopMusic() {
  musicPlayer.pause();
}

function onGameInteraction() {
  audioUnlocked = true;
  ensureAudioContext();
}

musicPlayer.addEventListener('ended', queueNextTrack);

const state = {
  running: false,
  gameOver: false,
  paused: false,
  frame: 0,
  waveFrame: 0,
  score: 0,
  coins: 0,
  tech: 0,
  totalKills: 0,
  nextDropKill: 5,
  rewardSeq: 0,
  wave: 1,
  waveKills: 0,
  waveTarget: 14,
  enemyTimer: 0,
  enemyRate: 54,
  bgOffset: 0,
  flashTimer: 0,
  bossWave: false,
  bossSpawned: false,
  bossWarningTimer: 0,
  statusText: 'Drag to free-fly, grab pods, and avoid direct collisions.',
  statusTimer: 0,
  best: safeLoadBestScore(),
  audioEnabled: safeLoadAudioEnabled(),
};

let player = createPlayer();
let bullets = [];
let enemies = [];
let particles = [];
let modules = [];
let coins = [];
let stars = buildStars();

const input = {
  left: false,
  right: false,
  up: false,
  down: false,
  pointerActive: false,
  pointerId: null,
  pointerX: W / 2,
  pointerY: H - 120,
};

function createPlayer() {
  return {
    x: W / 2,
    y: H - 120,
    lastX: W / 2,
    lastY: H - 120,
    bank: 0,
    width: 34,
    height: 46,
    hp: 5,
    maxHp: 5,
    shield: 0,
    fireRate: 12,
    fireCooldown: 0,
    bulletSpeed: 8.6,
    bulletDamage: 1.4,
    moveSpeed: 5.5,
    homing: 0,
    magnet: 92,
    weaponLevel: 0,
    weaponXp: 0,
    formLevel: 0,
    invulnTimer: 0,
  };
}

function getPlayerRect() {
  return {
    x: player.x - player.width * 0.42,
    y: player.y - player.height * 0.4,
    w: player.width * 0.84,
    h: player.height * 0.8,
  };
}

function getEnemyRect(enemy) {
  return {
    x: enemy.x - enemy.width / 2,
    y: enemy.y - enemy.height / 2,
    w: enemy.width,
    h: enemy.height,
  };
}

function getBulletRect(bullet) {
  return {
    x: bullet.x - bullet.width / 2,
    y: bullet.y - bullet.height / 2,
    w: bullet.width,
    h: bullet.height,
  };
}

function setStatus(text, duration = 110) {
  state.statusText = text;
  state.statusTimer = duration;
}

function refreshAmbientStatus() {
  if (state.gameOver) {
    state.statusText = 'Run complete. Re-arm and go again.';
    return;
  }

  if (!state.running) {
    state.statusText = 'Drag to free-fly, grab pods, and avoid direct collisions.';
    return;
  }

  if (state.paused) {
    state.statusText = 'Run paused.';
    return;
  }

  if (state.bossWave) {
    state.statusText = 'Boss sector active. Only hull contact can hurt you.';
    return;
  }

  state.statusText = 'Collect floating supply pods to evolve your run.';
}

function hideOverlay(element) {
  element.classList.remove('visible');
  element.classList.add('hidden');
}

function showOverlay(element) {
  element.classList.remove('hidden');
  element.classList.add('visible');
}

function gainWeaponXp(amount) {
  if (player.weaponLevel >= WEAPON_LEVELS.length - 1) {
    player.bulletDamage += 0.12 * amount;
    return 'Railstorm tuned hotter.';
  }

  player.weaponXp += amount;
  let leveledUp = false;

  while (player.weaponLevel < WEAPON_LEVELS.length - 1) {
    const current = WEAPON_LEVELS[player.weaponLevel];
    if (player.weaponXp < current.xpToNext) {
      break;
    }

    player.weaponXp -= current.xpToNext;
    player.weaponLevel += 1;
    leveledUp = true;
    player.bulletDamage += 0.18;
    player.bulletSpeed += 0.15;
  }

  const weaponName = WEAPON_LEVELS[player.weaponLevel].name;
  return leveledUp ? `Weapon evolved to ${weaponName}.` : `${weaponName} architecture reinforced.`;
}

function applyFormLevel(level) {
  if (level === 1) {
    player.moveSpeed += 0.35;
    player.fireRate = Math.max(5, player.fireRate - 1);
  } else if (level === 2) {
    player.maxHp += 1;
    player.hp = Math.min(player.maxHp, player.hp + 1);
    player.bulletDamage += 0.3;
  } else if (level === 3) {
    player.homing = Math.min(3, player.homing + 1);
    player.fireRate = Math.max(4, player.fireRate - 1);
    player.magnet += 24;
  }
}

function updateFormProgress() {
  let nextLevel = player.formLevel;
  for (let i = FORMS.length - 1; i >= 0; i -= 1) {
    if (state.tech >= FORMS[i].tech) {
      nextLevel = i;
      break;
    }
  }

  while (player.formLevel < nextLevel) {
    player.formLevel += 1;
    applyFormLevel(player.formLevel);
    setStatus(`${FORMS[player.formLevel].name} frame online.`, 140);
  }
}

function syncHud() {
  scoreEl.textContent = Math.floor(state.score).toString();
  coinsEl.textContent = `${state.coins} coins`;
  waveEl.textContent = state.bossWave ? `${state.wave}B` : state.wave.toString();
  hpEl.textContent = player.shield > 0 ? `${player.hp}+${player.shield}` : player.hp.toString();
  bestEl.textContent = Math.floor(state.best).toString();
  weaponEl.textContent = WEAPON_LEVELS[player.weaponLevel].name;
  formEl.textContent = `${FORMS[player.formLevel].name} T${state.tech}`;
  statusTextEl.textContent = state.statusText;
  audioBtn.textContent = state.audioEnabled ? 'Audio On' : 'Audio Off';
  pauseBtn.textContent = state.paused ? 'Resume' : 'Pause';
}

function chooseRewardTypes(count) {
  return shuffle(Object.keys(MODULE_TYPES)).slice(0, count);
}

function spawnModule(type, x, y, options = {}) {
  const definition = MODULE_TYPES[type];
  modules.push({
    type,
    x,
    y,
    vx: options.vx ?? randomRange(-0.35, 0.35),
    vy: options.vy ?? randomRange(1.4, 1.95),
    size: options.size ?? 18,
    bob: randomRange(0, Math.PI * 2),
    spin: randomRange(0, Math.PI * 2),
    age: 0,
    color: definition.color,
    label: definition.label,
    rewardGroup: options.rewardGroup ?? null,
    rewardChoice: Boolean(options.rewardChoice),
  });
}

function spawnRewardSet() {
  const group = `reward-${state.rewardSeq}`;
  state.rewardSeq += 1;
  const xs = [W * 0.24, W * 0.5, W * 0.76].map((value) => clamp(value + randomRange(-18, 18), PLAY_LEFT + 40, PLAY_RIGHT - 40));
  chooseRewardTypes(3).forEach((type, index) => {
    spawnModule(type, xs[index], -40 - index * 14, {
      vy: 1.45,
      vx: randomRange(-0.22, 0.22),
      rewardGroup: group,
      rewardChoice: true,
    });
  });
  setStatus('Supply cache dropped. Fly through one pod to lock your upgrade.', 160);
}

function spawnRandomModule(x, y) {
  const pool = ['rapid', 'weapon', 'forge', 'repair', 'core', 'thruster', 'rapid', 'weapon', 'forge'];
  spawnModule(randomChoice(pool), x, y, {
    vy: randomRange(1.1, 1.7),
    vx: randomRange(-0.55, 0.55),
    size: 16,
  });
}

function spawnCoinBurst(x, y, amount) {
  for (let i = 0; i < amount; i += 1) {
    coins.push({
      x,
      y,
      vx: randomRange(-1.6, 1.6),
      vy: randomRange(-2.6, -0.9),
      size: randomRange(5.5, 8.5),
      value: 1,
      age: 0,
    });
  }
}

function buildEnemy(kind, x = randomRange(PLAY_LEFT + 38, PLAY_RIGHT - 38)) {
  const scale = 1 + (state.wave - 1) * 0.08;

  if (kind === 'raider') {
    const hp = 3 + Math.floor((state.wave - 1) * 0.45);
    return {
      kind,
      x,
      y: -60,
      width: 34,
      height: 42,
      hp,
      maxHp: hp,
      speedY: 2.05 + state.wave * 0.09,
      vx: randomRange(-0.7, 0.7),
      wobble: randomRange(0, Math.PI * 2),
      sway: randomRange(0.12, 0.24),
      hitFlash: 0,
      age: 0,
      score: 20 + state.wave * 2,
      coinValue: 2,
      contactDamage: 1,
      tint: '#ff7d82',
      accent: '#ffd7da',
    };
  }

  if (kind === 'scout') {
    const hp = 2 + Math.floor((state.wave - 1) * 0.35);
    return {
      kind,
      x,
      y: -56,
      width: 28,
      height: 36,
      hp,
      maxHp: hp,
      speedY: 2.9 + state.wave * 0.11,
      vx: randomRange(-1.65, 1.65),
      wobble: randomRange(0, Math.PI * 2),
      hitFlash: 0,
      age: 0,
      score: 16 + state.wave * 2,
      coinValue: 1,
      contactDamage: 1,
      tint: '#7cd6ff',
      accent: '#e0fbff',
    };
  }

  if (kind === 'tank') {
    const hp = Math.round((6 + state.wave * 0.9) * scale * 0.75);
    return {
      kind,
      x,
      y: -70,
      width: 46,
      height: 54,
      hp,
      maxHp: hp,
      speedY: 1.45 + state.wave * 0.05,
      vx: randomRange(-0.45, 0.45),
      wobble: randomRange(0, Math.PI * 2),
      hitFlash: 0,
      age: 0,
      score: 34 + state.wave * 3,
      coinValue: 3,
      contactDamage: 2,
      tint: '#ffcb73',
      accent: '#fff0c8',
    };
  }

  const hp = 5 + Math.floor(state.wave * 0.8);
  return {
    kind: 'charger',
    x,
    y: -72,
    width: 36,
    height: 46,
    hp,
    maxHp: hp,
    phase: 'windup',
    windup: randomInt(34, 50),
    dashFrames: 0,
    targetX: player.x,
    targetY: player.y - 24,
    vx: 0,
    vy: 1.3,
    hitFlash: 0,
    age: 0,
    score: 38 + state.wave * 4,
    coinValue: 3,
    contactDamage: 1,
    tint: '#ff8cd1',
    accent: '#ffe1f4',
  };
}

function pickEnemyKind() {
  const roll = Math.random();
  if (state.wave < 2) {
    return roll < 0.72 ? 'raider' : 'scout';
  }
  if (state.wave < 4) {
    if (roll < 0.4) return 'raider';
    if (roll < 0.68) return 'scout';
    if (roll < 0.88) return 'tank';
    return 'charger';
  }
  if (roll < 0.28) return 'raider';
  if (roll < 0.52) return 'scout';
  if (roll < 0.76) return 'tank';
  return 'charger';
}

function spawnEnemy(kind = pickEnemyKind(), x) {
  enemies.push(buildEnemy(kind, x));
}

function spawnBoss() {
  const hp = 90 + state.wave * 20;
  enemies.push({
    kind: 'boss',
    x: W / 2,
    y: -130,
    width: 156,
    height: 116,
    hp,
    maxHp: hp,
    phase: 'enter',
    vx: randomChoice([-1.6, 1.6]),
    vy: 0,
    age: 0,
    hitFlash: 0,
    attackCooldown: 160,
    summonCooldown: 120,
    slamMarkerX: W / 2,
    targetY: 118,
    score: 340 + state.wave * 30,
    coinValue: 12,
    contactDamage: 2,
    tint: '#ff9a57',
    accent: '#fff0d6',
  });
  state.bossSpawned = true;
  state.bossWarningTimer = 150;
  setStatus('Capital ship inbound. Track the hull and dodge the slam.', 180);
}

function configureWave() {
  state.waveFrame = 0;
  state.enemyTimer = 0;
  state.bossWave = state.wave % BOSS_INTERVAL === 0;
  state.bossSpawned = false;
  state.waveTarget = state.bossWave ? 1 : Math.round(12 + state.wave * 3.2);
  state.enemyRate = Math.max(20, 54 - state.wave * 2);
  state.bossWarningTimer = state.bossWave ? 120 : 0;
  refreshAmbientStatus();
}

function resetGame() {
  player = createPlayer();
  bullets = [];
  enemies = [];
  particles = [];
  modules = [];
  coins = [];
  stars = buildStars();
  input.pointerActive = false;
  input.pointerId = null;
  input.pointerX = W / 2;
  input.pointerY = H - 120;

  state.running = true;
  state.gameOver = false;
  state.paused = false;
  state.frame = 0;
  state.waveFrame = 0;
  state.score = 0;
  state.coins = 0;
  state.tech = 0;
  state.totalKills = 0;
  state.nextDropKill = 5;
  state.rewardSeq = 0;
  state.wave = 1;
  state.waveKills = 0;
  state.flashTimer = 0;
  configureWave();
  setStatus('Open sector. Collisions are the only threat.', 160);
  syncHud();
}

function advanceWave() {
  state.wave += 1;
  state.waveKills = 0;
  configureWave();
  spawnRewardSet();
}

function fireVolley() {
  const weapon = WEAPON_LEVELS[player.weaponLevel];
  weapon.shots.forEach((shot) => {
    const speed = player.bulletSpeed + shot.speedBonus;
    bullets.push({
      x: player.x + shot.offsetX,
      y: player.y - player.height * 0.42 + shot.offsetY,
      vx: Math.sin(shot.angle) * speed,
      vy: -Math.cos(shot.angle) * speed,
      width: shot.width,
      height: shot.height,
      damage: player.bulletDamage * shot.damageMult,
      pierce: shot.pierce,
      age: 0,
      homing: player.homing,
      hue: player.formLevel,
    });
  });

  for (let i = 0; i < weapon.shots.length; i += 1) {
    particles.push({
      kind: 'spark',
      x: player.x + (i - (weapon.shots.length - 1) / 2) * 8,
      y: player.y - player.height * 0.5,
      vx: randomRange(-0.35, 0.35),
      vy: randomRange(-2.8, -1.6),
      life: 12,
      maxLife: 12,
      size: randomRange(1.8, 3.8),
      color: FORMS[player.formLevel].trail,
    });
  }

  playSfx('shoot', { volume: 0.22 });
  player.fireCooldown = player.fireRate;
}

function updatePlayer() {
  player.lastX = player.x;
  player.lastY = player.y;

  if (input.pointerActive) {
    player.x = lerp(player.x, input.pointerX, 0.28);
    player.y = lerp(player.y, input.pointerY, 0.28);
  } else {
    let dx = 0;
    let dy = 0;
    if (input.left) dx -= 1;
    if (input.right) dx += 1;
    if (input.up) dy -= 1;
    if (input.down) dy += 1;

    if (dx !== 0 || dy !== 0) {
      const length = Math.hypot(dx, dy) || 1;
      player.x += (dx / length) * player.moveSpeed;
      player.y += (dy / length) * player.moveSpeed;
    }
  }

  player.x = clamp(player.x, PLAY_LEFT + player.width * 0.55, PLAY_RIGHT - player.width * 0.55);
  player.y = clamp(player.y, PLAY_TOP + player.height * 0.6, PLAY_BOTTOM - player.height * 0.5);
  player.bank = clamp((player.x - player.lastX) * 0.13, -0.55, 0.55);

  if (player.fireCooldown > 0) {
    player.fireCooldown -= 1;
  } else {
    fireVolley();
  }

  if (player.invulnTimer > 0) {
    player.invulnTimer -= 1;
  }

  particles.push({
    kind: 'trail',
    x: player.x - player.bank * 10,
    y: player.y + player.height * 0.43,
    vx: randomRange(-0.6, 0.6),
    vy: randomRange(2.2, 3.8),
    life: 18,
    maxLife: 18,
    size: randomRange(4.5, 7.5),
    color: FORMS[player.formLevel].trail,
  });
}

function updateBackground(speedFactor) {
  state.bgOffset = (state.bgOffset + 2.4 * speedFactor) % 1000;
  stars.forEach((star) => {
    star.y += star.speed * speedFactor;
    if (star.y > H + 12) {
      star.y = -12;
      star.x = Math.random() * W;
      star.size = Math.random() * 2.2 + 0.6;
      star.speed = Math.random() * 1.9 + 0.7;
      star.alpha = Math.random() * 0.65 + 0.2;
    }
  });
}

function updateSpawning() {
  if (state.bossWave) {
    if (!state.bossSpawned && state.waveFrame > 84) {
      spawnBoss();
    }
    return;
  }

  state.enemyTimer += 1;
  if (state.enemyTimer >= state.enemyRate) {
    state.enemyTimer = 0;
    spawnEnemy();
  }
}

function updateBullets() {
  for (let i = bullets.length - 1; i >= 0; i -= 1) {
    const bullet = bullets[i];
    bullet.age += 1;

    if (bullet.homing > 0 && bullet.age > 8) {
      const target = findBulletTarget(bullet);
      if (target) {
        const desiredX = target.x - bullet.x;
        const desiredY = target.y - bullet.y;
        const length = Math.hypot(desiredX, desiredY) || 1;
        const speed = Math.hypot(bullet.vx, bullet.vy) || 1;
        const turnRate = 0.045 + bullet.homing * 0.02;
        bullet.vx = lerp(bullet.vx, (desiredX / length) * speed, turnRate);
        bullet.vy = lerp(bullet.vy, (desiredY / length) * speed, turnRate);
      }
    }

    bullet.x += bullet.vx;
    bullet.y += bullet.vy;

    if (bullet.y < -60 || bullet.x < -40 || bullet.x > W + 40 || bullet.y > H + 40) {
      bullets.splice(i, 1);
    }
  }
}

function findBulletTarget(bullet) {
  let bestTarget = null;
  let bestScore = Infinity;

  enemies.forEach((enemy) => {
    if (enemy.y > bullet.y + 160 || enemy.y < -160 || enemy.hp <= 0) {
      return;
    }

    const dx = enemy.x - bullet.x;
    const dy = enemy.y - bullet.y;
    if (dy > 240) {
      return;
    }

    const score = Math.abs(dx) * 1.2 + Math.abs(dy);
    if (score < bestScore) {
      bestScore = score;
      bestTarget = enemy;
    }
  });

  return bestTarget;
}

function updateEnemies() {
  for (let i = enemies.length - 1; i >= 0; i -= 1) {
    const enemy = enemies[i];
    enemy.age += 1;
    enemy.hitFlash = Math.max(0, enemy.hitFlash - 1);

    if (enemy.kind === 'boss') {
      updateBoss(enemy);
    } else if (enemy.kind === 'raider') {
      enemy.wobble += 0.09;
      enemy.x += enemy.vx + Math.sin(enemy.wobble) * enemy.sway;
      enemy.y += enemy.speedY;
      if (enemy.x < PLAY_LEFT + enemy.width / 2 || enemy.x > PLAY_RIGHT - enemy.width / 2) {
        enemy.vx *= -1;
      }
    } else if (enemy.kind === 'scout') {
      enemy.x += enemy.vx;
      enemy.y += enemy.speedY + Math.sin(enemy.age * 0.2 + enemy.wobble) * 0.15;
      if (enemy.x < PLAY_LEFT + enemy.width / 2 || enemy.x > PLAY_RIGHT - enemy.width / 2) {
        enemy.vx *= -1;
      }
    } else if (enemy.kind === 'tank') {
      enemy.wobble += 0.05;
      enemy.x += enemy.vx + Math.sin(enemy.wobble) * 0.4;
      enemy.y += enemy.speedY;
      if (enemy.x < PLAY_LEFT + enemy.width / 2 || enemy.x > PLAY_RIGHT - enemy.width / 2) {
        enemy.vx *= -1;
      }
    } else if (enemy.kind === 'charger') {
      updateCharger(enemy);
    }

    if (enemy.kind !== 'boss' && (enemy.y > H + 120 || enemy.x < -90 || enemy.x > W + 90)) {
      enemies.splice(i, 1);
    }
  }
}

function updateCharger(enemy) {
  if (enemy.phase === 'windup') {
    enemy.y += 1.2;
    enemy.targetX = clamp(lerp(enemy.targetX, player.x, 0.16), PLAY_LEFT + 36, PLAY_RIGHT - 36);
    enemy.targetY = clamp(lerp(enemy.targetY, player.y - 22, 0.16), PLAY_TOP + 70, PLAY_BOTTOM - 70);
    enemy.windup -= 1;

    if (enemy.windup === 18) {
      playSfx('enemyShot', { volume: 0.18 });
    }

    if (enemy.windup <= 0) {
      const dx = enemy.targetX - enemy.x;
      const dy = enemy.targetY - enemy.y;
      const length = Math.hypot(dx, dy) || 1;
      enemy.vx = (dx / length) * 7.8;
      enemy.vy = (dy / length) * 7.8;
      enemy.phase = 'dash';
      enemy.dashFrames = 58;
    }
    return;
  }

  if (enemy.phase === 'dash') {
    enemy.x += enemy.vx;
    enemy.y += enemy.vy;
    enemy.dashFrames -= 1;
    if (enemy.dashFrames <= 0) {
      enemy.phase = 'exit';
    }
    return;
  }

  enemy.x += enemy.vx;
  enemy.y += enemy.vy;
  enemy.vx *= 0.995;
  enemy.vy = Math.min(enemy.vy + 0.08, 8.2);
}

function updateBoss(enemy) {
  if (enemy.phase === 'enter') {
    enemy.y = lerp(enemy.y, 118, 0.045);
    enemy.x += Math.sin(enemy.age * 0.04) * 0.8;
    if (enemy.y > 116) {
      enemy.phase = 'cruise';
    }
    return;
  }

  if (enemy.phase === 'cruise') {
    enemy.x += enemy.vx;
    if (enemy.x < PLAY_LEFT + 84 || enemy.x > PLAY_RIGHT - 84) {
      enemy.vx *= -1;
    }

    enemy.attackCooldown -= 1;
    enemy.summonCooldown -= 1;

    if (enemy.summonCooldown <= 0) {
      spawnEnemy(randomChoice(['raider', 'scout']), clamp(enemy.x + randomChoice([-46, 46]), PLAY_LEFT + 34, PLAY_RIGHT - 34));
      spawnEnemy(randomChoice(['scout', 'charger']), clamp(enemy.x + randomChoice([-68, 68]), PLAY_LEFT + 34, PLAY_RIGHT - 34));
      enemy.summonCooldown = 140;
    }

    if (enemy.attackCooldown <= 0) {
      enemy.phase = 'telegraph';
      enemy.attackCooldown = 0;
      enemy.telegraphFrames = 42;
      enemy.slamMarkerX = clamp(player.x, PLAY_LEFT + 66, PLAY_RIGHT - 66);
      playSfx('enemyShot', { volume: 0.2 });
    }
    return;
  }

  if (enemy.phase === 'telegraph') {
    enemy.telegraphFrames -= 1;
    enemy.slamMarkerX = clamp(lerp(enemy.slamMarkerX, player.x, 0.1), PLAY_LEFT + 66, PLAY_RIGHT - 66);
    if (enemy.telegraphFrames <= 0) {
      enemy.phase = 'slam';
      const dx = enemy.slamMarkerX - enemy.x;
      const dy = PLAY_BOTTOM - 124 - enemy.y;
      const length = Math.hypot(dx, dy) || 1;
      enemy.vx = (dx / length) * 11;
      enemy.vy = (dy / length) * 11;
    }
    return;
  }

  if (enemy.phase === 'slam') {
    enemy.x += enemy.vx;
    enemy.y += enemy.vy;
    if (enemy.y >= PLAY_BOTTOM - 124) {
      enemy.phase = 'recover';
      enemy.vy = -8.3;
      enemy.vx *= 0.35;
    }
    return;
  }

  enemy.x += enemy.vx;
  enemy.y += enemy.vy;
  enemy.vy += 0.18;
  enemy.vx *= 0.98;

  if (enemy.y <= 118) {
    enemy.y = 118;
    enemy.phase = 'cruise';
    enemy.vx = enemy.x < W / 2 ? 1.8 : -1.8;
    enemy.vy = 0;
    enemy.attackCooldown = 170;
  }
}

function resolveBulletHits() {
  for (let bulletIndex = bullets.length - 1; bulletIndex >= 0; bulletIndex -= 1) {
    const bullet = bullets[bulletIndex];
    const bulletRect = getBulletRect(bullet);

    for (let enemyIndex = enemies.length - 1; enemyIndex >= 0; enemyIndex -= 1) {
      const enemy = enemies[enemyIndex];
      if (!rectsOverlap(bulletRect, getEnemyRect(enemy))) {
        continue;
      }

      enemy.hp -= bullet.damage;
      enemy.hitFlash = 6;
      playSfx('hit', { volume: 0.2 });

      particles.push({
        kind: 'spark',
        x: bullet.x,
        y: bullet.y,
        vx: randomRange(-1.4, 1.4),
        vy: randomRange(-1.4, 1.4),
        life: 16,
        maxLife: 16,
        size: randomRange(2.5, 4.4),
        color: enemy.kind === 'boss' ? 'rgba(255, 184, 112, 0.95)' : 'rgba(255, 255, 255, 0.92)',
      });

      if (enemy.hp <= 0) {
        registerKill(enemy);
        enemies.splice(enemyIndex, 1);
      }

      if (bullet.pierce > 0) {
        bullet.pierce -= 1;
      } else {
        bullets.splice(bulletIndex, 1);
        break;
      }
    }
  }
}

function registerKill(enemy) {
  state.score += enemy.score;
  state.totalKills += 1;
  if (enemy.kind !== 'boss') {
    state.waveKills += 1;
  }

  spawnCoinBurst(enemy.x, enemy.y, enemy.coinValue);
  playSfx('explode', { volume: enemy.kind === 'boss' ? 0.34 : 0.2 });
  spawnExplosion(enemy.x, enemy.y, enemy.kind === 'boss' ? 38 : 18, enemy.tint);

  if (state.totalKills >= state.nextDropKill && enemy.kind !== 'boss') {
    spawnRandomModule(enemy.x, enemy.y);
    state.nextDropKill += randomInt(4, 7);
  }

  if (enemy.kind === 'boss') {
    setStatus(`Capital ship down. Sector ${state.wave + 1} opens.`, 180);
    advanceWave();
    return;
  }

  if (!state.bossWave && state.waveKills >= state.waveTarget) {
    setStatus(`Wave ${state.wave} cleared. Fresh supply pods inbound.`, 160);
    advanceWave();
  }
}

function spawnExplosion(x, y, count, color) {
  for (let i = 0; i < count; i += 1) {
    const life = randomInt(14, 28);
    particles.push({
      kind: 'spark',
      x,
      y,
      vx: randomRange(-3.2, 3.2),
      vy: randomRange(-3.2, 3.2),
      life,
      maxLife: life,
      size: randomRange(2.6, 7.5),
      color,
    });
  }
}

function updateModules() {
  for (let i = modules.length - 1; i >= 0; i -= 1) {
    const module = modules[i];
    module.age += 1;
    module.spin += 0.06;
    module.bob += 0.08;
    module.x += module.vx;
    module.y += module.vy + Math.sin(module.bob) * 0.28;

    const dx = player.x - module.x;
    const dy = player.y - module.y;
    const reach = player.width * 0.55 + module.size;
    if (Math.hypot(dx, dy) < reach) {
      const rewardGroup = module.rewardGroup;
      applyModule(module);
      if (rewardGroup) {
        modules = modules.filter((item) => item.rewardGroup !== rewardGroup);
      } else {
        modules.splice(i, 1);
      }
      continue;
    }

    if (module.y > H + 60 || module.x < -40 || module.x > W + 40) {
      modules.splice(i, 1);
    }
  }
}

function applyModule(module) {
  const definition = MODULE_TYPES[module.type];
  state.tech += definition.tech;
  const message = definition.apply();
  updateFormProgress();
  state.score += 18;
  playSfx('coin', { volume: 0.24 });
  setStatus(message, 130);

  spawnExplosion(module.x, module.y, 12, module.color);
}

function updateCoins() {
  for (let i = coins.length - 1; i >= 0; i -= 1) {
    const coin = coins[i];
    coin.age += 1;
    coin.x += coin.vx;
    coin.y += coin.vy;
    coin.vy += 0.06;

    const dx = player.x - coin.x;
    const dy = player.y - coin.y;
    const distance = Math.hypot(dx, dy);
    if (distance < player.magnet) {
      const strength = 0.16 + (1 - distance / player.magnet) * 0.24;
      coin.x += dx * strength;
      coin.y += dy * strength;
    }

    if (distance < player.width * 0.46 + coin.size) {
      state.coins += coin.value;
      state.score += coin.value * 3;
      playSfx('coin', { volume: 0.12 });
      particles.push({
        kind: 'spark',
        x: coin.x,
        y: coin.y,
        vx: randomRange(-1.1, 1.1),
        vy: randomRange(-1.1, 1.1),
        life: 14,
        maxLife: 14,
        size: randomRange(1.8, 3.3),
        color: 'rgba(255, 216, 107, 0.95)',
      });
      coins.splice(i, 1);
      continue;
    }

    if (coin.y > H + 40) {
      coins.splice(i, 1);
    }
  }
}

function resolvePlayerHits() {
  if (!state.running) {
    return;
  }

  const playerRect = getPlayerRect();
  for (let i = enemies.length - 1; i >= 0; i -= 1) {
    const enemy = enemies[i];
    if (!rectsOverlap(playerRect, getEnemyRect(enemy))) {
      continue;
    }

    const tookDamage = damagePlayer(enemy.contactDamage, enemy.kind);
    if (enemy.kind !== 'boss') {
      spawnExplosion(enemy.x, enemy.y, 12, enemy.tint);
      enemies.splice(i, 1);
    }

    if (tookDamage) {
      break;
    }
  }
}

function damagePlayer(amount, source) {
  if (player.invulnTimer > 0 || state.gameOver || !state.running) {
    return false;
  }

  state.flashTimer = 10;
  player.invulnTimer = 64;

  if (player.shield > 0) {
    player.shield -= 1;
    playSfx('hit', { volume: 0.24 });
    setStatus('Shield charge burned off on impact.', 90);
    return true;
  }

  player.hp -= amount;
  playSfx(player.hp <= 0 ? 'explode' : 'hit', { volume: 0.28 });
  spawnExplosion(player.x, player.y, 14, 'rgba(255, 126, 126, 0.9)');
  setStatus(`${enemyLabel(source)} impact on the hull.`, 100);

  if (player.hp <= 0) {
    finishRun();
  }

  return true;
}

function enemyLabel(kind) {
  switch (kind) {
    case 'raider':
      return 'Raider';
    case 'scout':
      return 'Scout';
    case 'tank':
      return 'Tank';
    case 'charger':
      return 'Charger';
    case 'boss':
      return 'Capital ship';
    default:
      return 'Enemy';
  }
}

function finishRun() {
  state.running = false;
  state.gameOver = true;
  state.paused = false;
  stopMusic();

  if (state.score > state.best) {
    state.best = Math.floor(state.score);
    safeSaveBestScore(state.best);
  }

  finalStats.textContent = `Score ${Math.floor(state.score)} | Wave ${state.wave} | ${WEAPON_LEVELS[player.weaponLevel].name} | ${FORMS[player.formLevel].name}`;
  showOverlay(gameOverOverlay);
  refreshAmbientStatus();
  syncHud();
}

function togglePause() {
  if (!state.running || state.gameOver) {
    return;
  }

  state.paused = !state.paused;
  if (state.paused) {
    stopMusic();
    setStatus('Run paused.', 9999);
  } else {
    refreshAmbientStatus();
    ensureMusicStarted();
  }
  syncHud();
}

function toggleAudio() {
  state.audioEnabled = !state.audioEnabled;
  safeSaveAudioEnabled(state.audioEnabled);
  if (state.audioEnabled) {
    onGameInteraction();
    ensureMusicStarted();
    setStatus('Audio armed.', 80);
  } else {
    stopMusic();
    setStatus('Audio muted.', 80);
  }
  syncHud();
}

function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i -= 1) {
    const particle = particles[i];
    particle.life -= 1;
    particle.x += particle.vx;
    particle.y += particle.vy;
    if (particle.kind === 'trail') {
      particle.vy += 0.04;
      particle.vx *= 0.96;
    } else {
      particle.vx *= 0.98;
      particle.vy *= 0.98;
    }

    if (particle.life <= 0) {
      particles.splice(i, 1);
    }
  }
}

function updateGame() {
  state.frame += 1;
  state.waveFrame += 1;

  if (state.flashTimer > 0) {
    state.flashTimer -= 1;
  }

  if (state.bossWarningTimer > 0) {
    state.bossWarningTimer -= 1;
  }

  if (state.statusTimer > 0) {
    state.statusTimer -= 1;
    if (state.statusTimer === 0) {
      refreshAmbientStatus();
    }
  }

  updatePlayer();
  updateSpawning();
  updateBullets();
  updateEnemies();
  resolveBulletHits();
  updateModules();
  updateCoins();
  resolvePlayerHits();
  updateParticles();
  syncHud();
}

function roundedRect(x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawBackground() {
  const gradient = ctx.createLinearGradient(0, 0, 0, H);
  gradient.addColorStop(0, '#143455');
  gradient.addColorStop(0.55, '#0c2035');
  gradient.addColorStop(1, '#07101d');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = 'rgba(109, 165, 255, 0.12)';
  ctx.beginPath();
  ctx.ellipse(W * 0.5, H * 0.12, 140, 46, 0, 0, Math.PI * 2);
  ctx.fill();

  stars.forEach((star) => {
    ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha})`;
    ctx.fillRect(star.x, star.y, star.size, star.size * 2.3);
  });

  ctx.strokeStyle = 'rgba(123, 182, 255, 0.08)';
  ctx.lineWidth = 1;
  const diagonalOffset = state.bgOffset % 48;
  for (let x = -H + diagonalOffset; x < W + H; x += 48) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + H, H);
    ctx.stroke();
  }

  ctx.strokeStyle = 'rgba(128, 245, 190, 0.05)';
  const horizontalOffset = state.bgOffset % 72;
  for (let y = -72 + horizontalOffset; y < H + 72; y += 72) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
}

function drawProgressHud() {
  const x = 16;
  const y = 16;
  const width = W - 32;
  const height = 12;

  roundedRect(x, y, width, height, 8);
  ctx.fillStyle = 'rgba(4, 12, 24, 0.74)';
  ctx.fill();

  let ratio = 0;
  let label = `Sector ${state.wave}`;

  if (state.bossWave && state.bossSpawned) {
    const boss = enemies.find((enemy) => enemy.kind === 'boss');
    if (boss) {
      ratio = boss.hp / boss.maxHp;
      label = 'Capital Ship';
    }
  } else {
    ratio = state.waveTarget > 0 ? state.waveKills / state.waveTarget : 0;
    label = `Wave ${state.wave}`;
  }

  roundedRect(x + 1, y + 1, (width - 2) * clamp(ratio, 0, 1), height - 2, 7);
  ctx.fillStyle = state.bossWave ? '#ff9b59' : '#7bf0be';
  ctx.fill();

  ctx.fillStyle = 'rgba(232, 241, 255, 0.92)';
  ctx.font = '700 12px Trebuchet MS';
  ctx.textAlign = 'left';
  ctx.fillText(label, x + 2, y + 28);
}

function drawBullets() {
  bullets.forEach((bullet) => {
    const color = bullet.homing > 0 ? 'rgba(214, 201, 255, 0.95)' : 'rgba(129, 245, 190, 0.95)';
    ctx.save();
    ctx.translate(bullet.x, bullet.y);
    ctx.rotate(Math.atan2(bullet.vy, bullet.vx) + Math.PI / 2);
    ctx.shadowBlur = 12;
    ctx.shadowColor = color;
    ctx.fillStyle = color;
    ctx.fillRect(-bullet.width / 2, -bullet.height / 2, bullet.width, bullet.height);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.fillRect(-bullet.width / 4, -bullet.height / 2, bullet.width / 2, bullet.height * 0.55);
    ctx.restore();
  });
}

function drawCoins() {
  coins.forEach((coin) => {
    ctx.save();
    ctx.translate(coin.x, coin.y);
    ctx.rotate((coin.age || 0) * 0.12);
    ctx.shadowBlur = 12;
    ctx.shadowColor = 'rgba(255, 216, 107, 0.6)';
    ctx.fillStyle = '#ffd86b';
    ctx.beginPath();
    for (let i = 0; i < 6; i += 1) {
      const angle = (-Math.PI / 2) + (Math.PI * 2 * i) / 6;
      const radius = i % 2 === 0 ? coin.size : coin.size * 0.7;
      const px = Math.cos(angle) * radius;
      const py = Math.sin(angle) * radius;
      if (i === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 246, 198, 0.95)';
    ctx.fillRect(-coin.size * 0.18, -coin.size * 0.55, coin.size * 0.36, coin.size * 1.1);
    ctx.restore();
  });
}

function drawModules() {
  modules.forEach((module) => {
    ctx.save();
    ctx.translate(module.x, module.y);
    ctx.rotate(module.spin);
    ctx.shadowBlur = module.rewardChoice ? 18 : 12;
    ctx.shadowColor = module.color;
    ctx.fillStyle = module.color;
    ctx.beginPath();
    ctx.moveTo(0, -module.size);
    ctx.lineTo(module.size * 0.9, 0);
    ctx.lineTo(0, module.size);
    ctx.lineTo(-module.size * 0.9, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(7, 14, 26, 0.88)';
    ctx.fillRect(-module.size * 0.18, -module.size * 0.68, module.size * 0.36, module.size * 1.36);
    ctx.restore();

    ctx.fillStyle = module.rewardChoice ? 'rgba(255, 248, 236, 0.94)' : 'rgba(214, 229, 248, 0.86)';
    ctx.font = module.rewardChoice ? '700 10px Trebuchet MS' : '700 9px Trebuchet MS';
    ctx.textAlign = 'center';
    ctx.fillText(module.label, module.x, module.y + module.size + 14);
  });
}

function drawEnemyHealth(enemy) {
  const barWidth = Math.max(24, enemy.width * 0.72);
  const x = enemy.x - barWidth / 2;
  const y = enemy.y - enemy.height / 2 - 14;
  const ratio = clamp(enemy.hp / enemy.maxHp, 0, 1);

  roundedRect(x, y, barWidth, 5, 3);
  ctx.fillStyle = 'rgba(6, 12, 22, 0.8)';
  ctx.fill();

  roundedRect(x + 1, y + 1, (barWidth - 2) * ratio, 3, 2);
  ctx.fillStyle = ratio <= 0.25 ? '#80f5be' : ratio <= 0.5 ? '#ffd86b' : '#ff7b7b';
  ctx.fill();

  const finishThreshold = player.bulletDamage * 1.04;
  let tag = '';
  let color = '';
  if (enemy.hp <= finishThreshold) {
    tag = 'FINISH';
    color = '#80f5be';
  } else if (enemy.hp / enemy.maxHp <= 0.45) {
    tag = 'WEAK';
    color = '#ffd86b';
  }

  if (tag) {
    ctx.fillStyle = color;
    ctx.font = '700 10px Trebuchet MS';
    ctx.textAlign = 'center';
    ctx.fillText(tag, enemy.x, y - 4);
  }
}

function drawRaider(enemy) {
  ctx.save();
  ctx.translate(enemy.x, enemy.y);
  ctx.shadowBlur = enemy.hitFlash ? 18 : 8;
  ctx.shadowColor = enemy.hitFlash ? 'rgba(255,255,255,0.8)' : 'rgba(255, 125, 130, 0.35)';
  ctx.fillStyle = enemy.tint;
  ctx.beginPath();
  ctx.moveTo(0, -enemy.height * 0.55);
  ctx.lineTo(enemy.width * 0.42, enemy.height * 0.24);
  ctx.lineTo(enemy.width * 0.16, enemy.height * 0.5);
  ctx.lineTo(-enemy.width * 0.16, enemy.height * 0.5);
  ctx.lineTo(-enemy.width * 0.42, enemy.height * 0.24);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#4d1722';
  ctx.fillRect(-enemy.width * 0.1, -enemy.height * 0.18, enemy.width * 0.2, enemy.height * 0.42);
  ctx.fillStyle = enemy.accent;
  ctx.fillRect(-enemy.width * 0.32, enemy.height * 0.12, enemy.width * 0.64, enemy.height * 0.1);
  ctx.restore();
}

function drawScout(enemy) {
  ctx.save();
  ctx.translate(enemy.x, enemy.y);
  ctx.shadowBlur = enemy.hitFlash ? 16 : 8;
  ctx.shadowColor = enemy.hitFlash ? 'rgba(255,255,255,0.78)' : 'rgba(124, 214, 255, 0.35)';
  ctx.fillStyle = enemy.tint;
  ctx.beginPath();
  ctx.moveTo(0, -enemy.height * 0.55);
  ctx.lineTo(enemy.width * 0.32, -enemy.height * 0.06);
  ctx.lineTo(enemy.width * 0.26, enemy.height * 0.5);
  ctx.lineTo(0, enemy.height * 0.24);
  ctx.lineTo(-enemy.width * 0.26, enemy.height * 0.5);
  ctx.lineTo(-enemy.width * 0.32, -enemy.height * 0.06);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = enemy.accent;
  ctx.fillRect(-enemy.width * 0.08, -enemy.height * 0.2, enemy.width * 0.16, enemy.height * 0.42);
  ctx.restore();
}

function drawTank(enemy) {
  ctx.save();
  ctx.translate(enemy.x, enemy.y);
  ctx.shadowBlur = enemy.hitFlash ? 18 : 9;
  ctx.shadowColor = enemy.hitFlash ? 'rgba(255,255,255,0.82)' : 'rgba(255, 203, 115, 0.35)';
  ctx.fillStyle = enemy.tint;
  roundedRect(-enemy.width * 0.5, -enemy.height * 0.5, enemy.width, enemy.height, 10);
  ctx.fill();
  ctx.fillStyle = '#5f4411';
  roundedRect(-enemy.width * 0.2, -enemy.height * 0.16, enemy.width * 0.4, enemy.height * 0.5, 6);
  ctx.fill();
  ctx.fillStyle = enemy.accent;
  ctx.fillRect(-enemy.width * 0.42, -enemy.height * 0.08, enemy.width * 0.84, enemy.height * 0.08);
  ctx.fillRect(-enemy.width * 0.34, enemy.height * 0.2, enemy.width * 0.68, enemy.height * 0.08);
  ctx.restore();
}

function drawCharger(enemy) {
  ctx.save();
  ctx.translate(enemy.x, enemy.y);
  ctx.shadowBlur = enemy.hitFlash ? 18 : 9;
  ctx.shadowColor = enemy.hitFlash ? 'rgba(255,255,255,0.82)' : 'rgba(255, 140, 209, 0.38)';
  ctx.fillStyle = enemy.tint;
  ctx.beginPath();
  ctx.moveTo(0, -enemy.height * 0.6);
  ctx.lineTo(enemy.width * 0.42, enemy.height * 0.05);
  ctx.lineTo(enemy.width * 0.14, enemy.height * 0.52);
  ctx.lineTo(-enemy.width * 0.14, enemy.height * 0.52);
  ctx.lineTo(-enemy.width * 0.42, enemy.height * 0.05);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = enemy.accent;
  ctx.fillRect(-enemy.width * 0.08, -enemy.height * 0.25, enemy.width * 0.16, enemy.height * 0.42);
  ctx.restore();
}

function drawBoss(enemy) {
  ctx.save();
  ctx.translate(enemy.x, enemy.y);
  ctx.shadowBlur = enemy.hitFlash ? 22 : 10;
  ctx.shadowColor = enemy.hitFlash ? 'rgba(255,255,255,0.82)' : 'rgba(255, 154, 87, 0.34)';
  ctx.fillStyle = enemy.tint;
  roundedRect(-enemy.width * 0.5, -enemy.height * 0.46, enemy.width, enemy.height * 0.9, 18);
  ctx.fill();
  ctx.fillRect(-enemy.width * 0.58, -enemy.height * 0.12, enemy.width * 0.18, enemy.height * 0.42);
  ctx.fillRect(enemy.width * 0.4, -enemy.height * 0.12, enemy.width * 0.18, enemy.height * 0.42);
  ctx.fillStyle = '#7f3510';
  roundedRect(-enemy.width * 0.18, -enemy.height * 0.16, enemy.width * 0.36, enemy.height * 0.52, 12);
  ctx.fill();
  ctx.fillStyle = enemy.accent;
  ctx.fillRect(-enemy.width * 0.34, -enemy.height * 0.26, enemy.width * 0.68, enemy.height * 0.08);
  ctx.fillRect(-enemy.width * 0.3, enemy.height * 0.1, enemy.width * 0.6, enemy.height * 0.08);
  ctx.restore();
}

function drawWarnings() {
  enemies.forEach((enemy) => {
    if (enemy.kind === 'charger' && enemy.phase === 'windup') {
      const pulse = 0.45 + Math.sin(enemy.age * 0.35) * 0.2;
      ctx.strokeStyle = `rgba(255, 130, 201, ${pulse})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(enemy.x, enemy.y);
      ctx.lineTo(enemy.targetX, enemy.targetY);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(enemy.targetX, enemy.targetY, 18 + Math.sin(enemy.age * 0.25) * 5, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (enemy.kind === 'boss' && enemy.phase === 'telegraph') {
      const alpha = 0.18 + Math.sin(enemy.telegraphFrames * 0.5) * 0.06;
      ctx.fillStyle = `rgba(255, 154, 87, ${alpha})`;
      ctx.fillRect(enemy.slamMarkerX - 30, PLAY_TOP, 60, PLAY_BOTTOM - PLAY_TOP);
      ctx.strokeStyle = 'rgba(255, 225, 194, 0.65)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(enemy.slamMarkerX, PLAY_TOP);
      ctx.lineTo(enemy.slamMarkerX, PLAY_BOTTOM);
      ctx.stroke();
    }
  });

  if (state.bossWarningTimer > 0 && state.bossWave && !state.bossSpawned) {
    const alpha = Math.min(0.9, state.bossWarningTimer / 120);
    ctx.fillStyle = `rgba(255, 118, 90, ${alpha * 0.28})`;
    roundedRect(48, 72, W - 96, 38, 14);
    ctx.fill();
    ctx.fillStyle = `rgba(255, 239, 221, ${alpha})`;
    ctx.font = '700 18px Trebuchet MS';
    ctx.textAlign = 'center';
    ctx.fillText('CAPITAL SHIP SIGNAL', W / 2, 98);
  }
}

function drawEnemies() {
  enemies.forEach((enemy) => {
    if (enemy.kind === 'raider') drawRaider(enemy);
    if (enemy.kind === 'scout') drawScout(enemy);
    if (enemy.kind === 'tank') drawTank(enemy);
    if (enemy.kind === 'charger') drawCharger(enemy);
    if (enemy.kind === 'boss') drawBoss(enemy);
    drawEnemyHealth(enemy);
  });
}

function drawParticles() {
  particles.forEach((particle) => {
    const alpha = clamp(particle.life / particle.maxLife, 0, 1);
    ctx.fillStyle = particle.color;
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  });
}

function drawPlayer() {
  const form = FORMS[player.formLevel];
  const scale = 1 + player.formLevel * 0.08;
  const blink = player.invulnTimer > 0 && Math.floor(player.invulnTimer / 4) % 2 === 0;
  if (blink) {
    return;
  }

  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.rotate(player.bank * 0.55);
  ctx.scale(scale, scale);

  ctx.shadowBlur = 14;
  ctx.shadowColor = form.trail;
  ctx.fillStyle = form.wing;
  ctx.beginPath();
  ctx.moveTo(-player.width * 0.74, player.height * 0.22);
  ctx.lineTo(-player.width * 0.28, -player.height * 0.08);
  ctx.lineTo(-player.width * 0.16, player.height * 0.45);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(player.width * 0.74, player.height * 0.22);
  ctx.lineTo(player.width * 0.28, -player.height * 0.08);
  ctx.lineTo(player.width * 0.16, player.height * 0.45);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = form.body;
  ctx.beginPath();
  ctx.moveTo(0, -player.height * 0.62);
  ctx.lineTo(player.width * 0.24, -player.height * 0.1);
  ctx.lineTo(player.width * 0.18, player.height * 0.56);
  ctx.lineTo(0, player.height * 0.38);
  ctx.lineTo(-player.width * 0.18, player.height * 0.56);
  ctx.lineTo(-player.width * 0.24, -player.height * 0.1);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = form.glass;
  ctx.beginPath();
  ctx.moveTo(0, -player.height * 0.34);
  ctx.lineTo(player.width * 0.09, -player.height * 0.05);
  ctx.lineTo(0, player.height * 0.18);
  ctx.lineTo(-player.width * 0.09, -player.height * 0.05);
  ctx.closePath();
  ctx.fill();

  if (player.formLevel >= 2) {
    ctx.fillStyle = 'rgba(255, 248, 218, 0.96)';
    ctx.fillRect(-player.width * 0.05, -player.height * 0.6, player.width * 0.1, player.height * 0.22);
  }

  if (player.shield > 0) {
    ctx.strokeStyle = 'rgba(148, 198, 255, 0.6)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, player.width * 0.86, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

function drawPauseCard() {
  ctx.fillStyle = 'rgba(3, 8, 15, 0.45)';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(240, 246, 255, 0.96)';
  ctx.textAlign = 'center';
  ctx.font = '700 28px Trebuchet MS';
  ctx.fillText('PAUSED', W / 2, H / 2 - 8);
  ctx.font = '600 14px Trebuchet MS';
  ctx.fillText('Tap Resume or press P', W / 2, H / 2 + 22);
}

function drawDamageFlash() {
  if (state.flashTimer <= 0) {
    return;
  }

  ctx.fillStyle = `rgba(255, 96, 96, ${state.flashTimer * 0.02})`;
  ctx.fillRect(0, 0, W, H);
}

function drawScene() {
  drawBackground();
  drawProgressHud();
  drawWarnings();
  drawCoins();
  drawModules();
  drawBullets();
  drawEnemies();
  drawParticles();
  drawPlayer();
  drawDamageFlash();

  if (state.paused && state.running) {
    drawPauseCard();
  }
}

function toCanvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * W,
    y: ((event.clientY - rect.top) / rect.height) * H,
  };
}

function onPointerDown(event) {
  if (!state.running || state.paused) {
    return;
  }

  onGameInteraction();
  const point = toCanvasPoint(event);
  input.pointerActive = true;
  input.pointerId = event.pointerId;
  input.pointerX = clamp(point.x, PLAY_LEFT + 20, PLAY_RIGHT - 20);
  input.pointerY = clamp(point.y, PLAY_TOP + 20, PLAY_BOTTOM - 20);
  canvas.setPointerCapture(event.pointerId);
}

function onPointerMove(event) {
  if (!input.pointerActive || event.pointerId !== input.pointerId) {
    return;
  }

  const point = toCanvasPoint(event);
  input.pointerX = clamp(point.x, PLAY_LEFT + 20, PLAY_RIGHT - 20);
  input.pointerY = clamp(point.y, PLAY_TOP + 20, PLAY_BOTTOM - 20);
}

function onPointerUp(event) {
  if (event.pointerId !== input.pointerId) {
    return;
  }

  input.pointerActive = false;
  input.pointerId = null;
  try {
    canvas.releasePointerCapture(event.pointerId);
  } catch {
    // Ignore browsers that reject a release on an already released pointer.
  }
}

function onKey(event, pressed) {
  const key = event.key.toLowerCase();

  if (['arrowleft', 'arrowright', 'arrowup', 'arrowdown', ' ', 'w', 'a', 's', 'd'].includes(key)) {
    event.preventDefault();
  }

  if (key === 'arrowleft' || key === 'a') input.left = pressed;
  if (key === 'arrowright' || key === 'd') input.right = pressed;
  if (key === 'arrowup' || key === 'w') input.up = pressed;
  if (key === 'arrowdown' || key === 's') input.down = pressed;

  if (!pressed) {
    return;
  }

  onGameInteraction();

  if (key === 'p') {
    togglePause();
  }

  if (key === 'm') {
    toggleAudio();
  }

  if (key === 'enter' && !state.running && !state.gameOver) {
    startGame();
  }

  if (key === 'enter' && state.gameOver) {
    startGame();
  }
}

function startGame() {
  onGameInteraction();
  playSfx('uiClick', { volume: 0.18 });
  resetGame();
  hideOverlay(startOverlay);
  hideOverlay(gameOverOverlay);
  ensureMusicStarted();
}

function tick() {
  requestAnimationFrame(tick);
  updateBackground(state.running && !state.paused && !state.gameOver ? 1 : 0.35);

  if (state.running && !state.paused && !state.gameOver) {
    updateGame();
  }

  drawScene();
}

startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);
pauseBtn.addEventListener('click', () => {
  onGameInteraction();
  playSfx('uiClick', { volume: 0.18 });
  togglePause();
});
audioBtn.addEventListener('click', () => {
  onGameInteraction();
  playSfx('uiClick', { volume: 0.18 });
  toggleAudio();
});

canvas.addEventListener('pointerdown', onPointerDown);
canvas.addEventListener('pointermove', onPointerMove);
canvas.addEventListener('pointerup', onPointerUp);
canvas.addEventListener('pointercancel', onPointerUp);
document.addEventListener('keydown', (event) => onKey(event, true));
document.addEventListener('keyup', (event) => onKey(event, false));

preloadSfx();
refreshAmbientStatus();
syncHud();
tick();
