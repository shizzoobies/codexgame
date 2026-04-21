const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const startOverlay = document.getElementById('startOverlay');
const upgradeOverlay = document.getElementById('upgradeOverlay');
const gameOverOverlay = document.getElementById('gameOverOverlay');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');
const pauseBtn = document.getElementById('pauseBtn');
const leftBtn = document.getElementById('leftBtn');
const rightBtn = document.getElementById('rightBtn');
const audioBtn = document.getElementById('audioBtn');
const upgradeChoicesEl = document.getElementById('upgradeChoices');
const scoreEl = document.getElementById('score');
const coinsEl = document.getElementById('coins');
const waveEl = document.getElementById('wave');
const hpEl = document.getElementById('hp');
const bestEl = document.getElementById('best');
const statusTextEl = document.getElementById('statusText');
const finalStats = document.getElementById('finalStats');

const W = canvas.width;
const H = canvas.height;
const ROAD_LEFT = 26;
const ROAD_WIDTH = W - 52;
const LANE_WIDTH = ROAD_WIDTH / 3;
const laneXs = [ROAD_LEFT + LANE_WIDTH * 0.5, ROAD_LEFT + LANE_WIDTH * 1.5, ROAD_LEFT + LANE_WIDTH * 2.5];
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
    // Ignore storage failures so the game keeps running in restricted contexts.
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
    // Ignore storage failures so the game keeps running in restricted contexts.
  }
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function buildStars() {
  return Array.from({ length: 42 }, () => ({
    x: Math.random() * W,
    y: Math.random() * H,
    size: Math.random() * 2.4 + 0.7,
    speed: Math.random() * 1.6 + 0.6,
  }));
}

function createMusicPlayer() {
  const audio = new Audio();
  audio.volume = 0.45;
  audio.preload = 'auto';
  return audio;
}

const state = {
  running: false,
  inUpgrade: false,
  gameOver: false,
  paused: false,
  frame: 0,
  waveFrame: 0,
  score: 0,
  coins: 0,
  wave: 1,
  waveKills: 0,
  waveTarget: 16,
  enemyTimer: 0,
  enemyRate: 54,
  bgOffset: 0,
  flashTimer: 0,
  bossWave: false,
  bossSpawned: false,
  bossWarningTimer: 0,
  best: safeLoadBestScore(),
  statusText: 'Stay in motion and clear the lane.',
  stars: buildStars(),
  audioEnabled: safeLoadAudioEnabled(),
  musicReady: MUSIC_TRACKS.length > 0,
  currentTrackIndex: -1,
};

const player = {
  lane: 1,
  targetLane: 1,
  x: laneXs[1],
  y: H - 112,
  width: 40,
  height: 58,
  hp: 5,
  maxHp: 5,
  fireCooldown: 0,
  fireRate: 18,
  bulletSpeed: 12,
  bulletDamage: 1,
  spreadShots: 1,
  homing: 0,
  moveTween: 0.25,
  magnet: 0,
  shield: 0,
};

let bullets = [];
let enemyBullets = [];
let enemies = [];
let coins = [];
let particles = [];
const backgroundMusic = createMusicPlayer();
let audioContext = null;
const soundPools = {};

const upgrades = [
  {
    id: 'firerate',
    title: 'Rapid Fire',
    desc: 'Lower your cooldown between shots.',
    apply: () => {
      player.fireRate = Math.max(7, player.fireRate - 3);
    },
  },
  {
    id: 'damage',
    title: 'Heavy Shots',
    desc: 'Increase bullet damage by 1.',
    apply: () => {
      player.bulletDamage += 1;
    },
  },
  {
    id: 'spread',
    title: 'Split Burst',
    desc: 'Add more lanes to each volley.',
    apply: () => {
      player.spreadShots = Math.min(3, player.spreadShots + 1);
    },
  },
  {
    id: 'homing',
    title: 'Smart Rounds',
    desc: 'Missed shots retarget into other lanes.',
    apply: () => {
      player.homing = Math.min(2, player.homing + 1);
    },
  },
  {
    id: 'health',
    title: 'Repair Armor',
    desc: 'Restore 2 hull points.',
    apply: () => {
      player.hp = Math.min(player.maxHp, player.hp + 2);
    },
  },
  {
    id: 'maxhp',
    title: 'Hull Plating',
    desc: 'Increase max HP and heal 1.',
    apply: () => {
      player.maxHp += 1;
      player.hp = Math.min(player.maxHp, player.hp + 1);
    },
  },
  {
    id: 'magnet',
    title: 'Coin Magnet',
    desc: 'Pull in drops from farther away.',
    apply: () => {
      player.magnet += 28;
    },
  },
  {
    id: 'shield',
    title: 'Energy Shield',
    desc: 'Block the next incoming hit.',
    apply: () => {
      player.shield += 1;
    },
  },
  {
    id: 'velocity',
    title: 'Overclocked Rounds',
    desc: 'Bullets travel faster through traffic.',
    apply: () => {
      player.bulletSpeed += 1.4;
    },
  },
];

function setStatus(message) {
  state.statusText = message;
  statusTextEl.textContent = message;
}

function updateAudioButton() {
  audioBtn.textContent = state.audioEnabled ? 'Audio On' : 'Audio Off';
}

function buildSoundPool(src, volume, voices = 4) {
  const pool = Array.from({ length: voices }, () => {
    const audio = new Audio(src);
    audio.preload = 'auto';
    audio.volume = volume;
    return audio;
  });

  soundPools[src] = {
    pool,
    index: 0,
  };
}

function preloadSfx() {
  buildSoundPool(SFX_FILES.shoot, 0.2, 8);
  buildSoundPool(SFX_FILES.enemyShot, 0.16, 6);
  buildSoundPool(SFX_FILES.hit, 0.24, 8);
  buildSoundPool(SFX_FILES.explode, 0.28, 4);
  buildSoundPool(SFX_FILES.coin, 0.18, 5);
  buildSoundPool(SFX_FILES.uiClick, 0.16, 4);
}

function ensureAudioContext() {
  if (!audioContext) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioContext = new AudioContextClass();
    }
  }

  if (audioContext && audioContext.state === 'suspended') {
    audioContext.resume().catch(() => {});
  }
}

function onGameInteraction() {
  ensureAudioContext();
  ensureMusicStarted();
}

function shuffleTracks() {
  const order = MUSIC_TRACKS.map((_, index) => index);
  for (let i = order.length - 1; i > 0; i -= 1) {
    const swapIndex = Math.floor(Math.random() * (i + 1));
    [order[i], order[swapIndex]] = [order[swapIndex], order[i]];
  }
  return order;
}

let musicQueue = shuffleTracks();

function queueNextTrack() {
  if (!state.audioEnabled || !state.musicReady || MUSIC_TRACKS.length === 0) return;

  if (musicQueue.length === 0) {
    musicQueue = shuffleTracks().filter((index) => index !== state.currentTrackIndex);
    if (musicQueue.length === 0) musicQueue = [0];
  }

  state.currentTrackIndex = musicQueue.shift();
  backgroundMusic.src = MUSIC_TRACKS[state.currentTrackIndex];
}

function ensureMusicStarted() {
  if (!state.audioEnabled || !state.musicReady) return;
  if (!backgroundMusic.src) {
    queueNextTrack();
  }
  backgroundMusic.play().catch(() => {
    // Browsers can reject autoplay until the first interaction. We'll try again later.
  });
}

function stopMusic() {
  backgroundMusic.pause();
}

function toggleAudio() {
  state.audioEnabled = !state.audioEnabled;
  safeSaveAudioEnabled(state.audioEnabled);
  updateAudioButton();

  if (state.audioEnabled) {
    ensureAudioContext();
    ensureMusicStarted();
  } else {
    stopMusic();
  }
}

function playSfxFallback(type) {
  if (!state.audioEnabled) return;
  ensureAudioContext();
  if (!audioContext) return;

  const now = audioContext.currentTime;
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  const filter = audioContext.createBiquadFilter();

  oscillator.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(audioContext.destination);

  if (type === 'shoot') {
    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(720, now);
    oscillator.frequency.exponentialRampToValueAtTime(420, now + 0.08);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1800, now);
    gainNode.gain.setValueAtTime(0.025, now);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);
    oscillator.start(now);
    oscillator.stop(now + 0.1);
    return;
  }

  if (type === 'enemyShot') {
    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(300, now);
    oscillator.frequency.exponentialRampToValueAtTime(220, now + 0.12);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1200, now);
    gainNode.gain.setValueAtTime(0.02, now);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
    oscillator.start(now);
    oscillator.stop(now + 0.13);
    return;
  }

  if (type === 'hit') {
    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(260, now);
    oscillator.frequency.exponentialRampToValueAtTime(120, now + 0.12);
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(900, now);
    gainNode.gain.setValueAtTime(0.03, now);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.13);
    oscillator.start(now);
    oscillator.stop(now + 0.14);
    return;
  }

  if (type === 'coin') {
    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(860, now);
    oscillator.frequency.exponentialRampToValueAtTime(1280, now + 0.08);
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(700, now);
    gainNode.gain.setValueAtTime(0.03, now);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
    oscillator.start(now);
    oscillator.stop(now + 0.11);
    return;
  }

  if (type === 'explode') {
    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(180, now);
    oscillator.frequency.exponentialRampToValueAtTime(45, now + 0.22);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(700, now);
    gainNode.gain.setValueAtTime(0.045, now);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
    oscillator.start(now);
    oscillator.stop(now + 0.23);
    return;
  }

  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(240, now);
  gainNode.gain.setValueAtTime(0.03, now);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);
  oscillator.start(now);
  oscillator.stop(now + 0.15);
}

function playSfx(type) {
  if (!state.audioEnabled) return;

  const src = SFX_FILES[type];
  if (src && soundPools[src]) {
    const entry = soundPools[src];
    const audio = entry.pool[entry.index];
    entry.index = (entry.index + 1) % entry.pool.length;

    try {
      audio.currentTime = 0;
      audio.play().catch(() => {
        playSfxFallback(type);
      });
      return;
    } catch {
      playSfxFallback(type);
      return;
    }
  }

  playSfxFallback(type);
}

function configureWave() {
  state.waveFrame = 0;
  state.waveKills = 0;
  state.enemyTimer = 0;
  state.bossWave = state.wave % 4 === 0;
  state.bossSpawned = false;
  state.bossWarningTimer = state.bossWave ? 150 : 0;

  if (state.bossWave) {
    state.waveTarget = 1;
    state.enemyRate = 9999;
    setStatus(`Wave ${state.wave}: boss contact incoming.`);
  } else {
    state.waveTarget = 12 + state.wave * 4;
    state.enemyRate = Math.max(20, 54 - state.wave * 2);
    setStatus(`Wave ${state.wave}: destroy ${state.waveTarget} raiders.`);
  }
}

function resetGame() {
  state.running = false;
  state.inUpgrade = false;
  state.gameOver = false;
  state.paused = false;
  state.frame = 0;
  state.score = 0;
  state.coins = 0;
  state.wave = 1;
  state.bgOffset = 0;
  state.flashTimer = 0;
  state.stars = buildStars();
  state.best = safeLoadBestScore();

  player.lane = 1;
  player.targetLane = 1;
  player.x = laneXs[1];
  player.hp = 5;
  player.maxHp = 5;
  player.fireCooldown = 0;
  player.fireRate = 18;
  player.bulletSpeed = 12;
  player.bulletDamage = 1;
  player.spreadShots = 1;
  player.homing = 0;
  player.magnet = 0;
  player.shield = 0;

  bullets = [];
  enemyBullets = [];
  enemies = [];
  coins = [];
  particles = [];

  configureWave();
  updateHud();
  updateAudioButton();
  pauseBtn.textContent = 'Pause';
}

function updateHud() {
  scoreEl.textContent = state.score;
  coinsEl.textContent = `${state.coins} coins`;
  waveEl.textContent = state.wave;
  hpEl.textContent = player.hp + (player.shield > 0 ? ` +${player.shield}` : '');
  bestEl.textContent = state.best;
}

function startGame() {
  resetGame();
  onGameInteraction();
  startOverlay.classList.remove('visible');
  startOverlay.classList.add('hidden');
  gameOverOverlay.classList.add('hidden');
  upgradeOverlay.classList.add('hidden');
  state.running = true;
  setStatus(`Wave ${state.wave}: destroy ${state.waveTarget} raiders.`);
}

function moveLane(direction) {
  if (!state.running || state.paused) return;
  player.targetLane = Math.max(0, Math.min(2, player.targetLane + direction));
}

function togglePause() {
  if (!state.running || state.inUpgrade || state.gameOver) return;
  state.paused = !state.paused;
  pauseBtn.textContent = state.paused ? 'Resume' : 'Pause';
  setStatus(state.paused ? 'Run paused.' : state.bossWave ? `Wave ${state.wave}: boss contact incoming.` : `Wave ${state.wave}: stay sharp.`);
}

function spawnEnemy() {
  const lane = Math.floor(Math.random() * 3);
  const roll = Math.random();
  const speedBase = 2.4 + state.wave * 0.16;

  const enemy = {
    kind: 'raider',
    lane,
    x: laneXs[lane],
    y: -60,
    width: 40,
    height: 54,
    hp: 1 + Math.floor(state.wave / 3),
    maxHp: 1 + Math.floor(state.wave / 3),
    speed: speedBase,
    color: '#ff7a7a',
    coinValue: 1,
    wiggle: Math.random() * Math.PI * 2,
    fireCooldown: 0,
  };

  if (roll > 0.84) {
    enemy.kind = 'tank';
    enemy.width = 52;
    enemy.height = 64;
    enemy.hp += 3;
    enemy.speed = Math.max(1.7, speedBase - 0.9);
    enemy.color = '#ffc06d';
    enemy.coinValue = 3;
  } else if (roll > 0.58) {
    enemy.kind = 'scout';
    enemy.speed = speedBase + 1.25;
    enemy.color = '#87d7ff';
    enemy.coinValue = 2;
  } else if (state.wave >= 3 && roll > 0.32) {
    enemy.kind = 'shooter';
    enemy.speed = speedBase - 0.2;
    enemy.hp += 1;
    enemy.width = 42;
    enemy.height = 58;
    enemy.color = '#bf98ff';
    enemy.coinValue = 2;
    enemy.fireCooldown = 55;
  }

  enemy.maxHp = enemy.hp;

  enemies.push(enemy);
}

function spawnBoss() {
  enemies.push({
    kind: 'boss',
    lane: 1,
    x: W / 2,
    y: -120,
    width: 140,
    height: 112,
    hp: 16 + state.wave * 4,
    maxHp: 16 + state.wave * 4,
    speed: 2.4,
    color: '#ff9c5e',
    coinValue: 16 + state.wave * 2,
    wiggle: 0,
    fireCooldown: 45,
  });
  state.bossSpawned = true;
  setStatus(`Wave ${state.wave}: boss on screen.`);
}

function spawnEnemyBullet(enemy, pattern = 'single') {
  const shots = pattern === 'spread' ? [-2.3, 0, 2.3] : [0];

  shots.forEach((vx) => {
      enemyBullets.push({
      x: enemy.x,
      y: enemy.y + enemy.height / 2 - 6,
      width: pattern === 'spread' ? 10 : 8,
      height: pattern === 'spread' ? 18 : 16,
      vx,
      vy: pattern === 'spread' ? 5.4 : 6.2,
    });
  });
  playSfx('enemyShot');
}

function fireBullets() {
  const patterns = {
    1: [0],
    2: [-24, 24],
    3: [-34, 0, 34],
  };

  patterns[player.spreadShots].forEach((offset) => {
    bullets.push({
      x: player.x + offset,
      y: player.y - 24,
      width: 8,
      height: 20,
      speed: player.bulletSpeed,
      damage: player.bulletDamage,
      homing: player.homing,
      age: 0,
      vx: 0,
      seeking: false,
    });
  });
  playSfx('shoot');
}

function findBulletTarget(bullet) {
  if (bullet.homing <= 0 || bullet.age < 8) return null;

  const candidates = enemies.filter((enemy) => enemy.y < bullet.y - 18 && enemy.y > -140);
  if (candidates.length === 0) return null;

  const inLaneTarget = candidates.some((enemy) => Math.abs(enemy.x - bullet.x) < 18);
  if (inLaneTarget) return null;

  return candidates.reduce((best, enemy) => {
    const dx = enemy.x - bullet.x;
    const dy = bullet.y - enemy.y;
    const score = Math.abs(dx) * 1.55 + dy * 0.22;

    if (!best || score < best.score) {
      return { enemy, score };
    }

    return best;
  }, null)?.enemy ?? null;
}

function updateBulletHoming(bullet) {
  if (bullet.homing <= 0) return;

  const target = findBulletTarget(bullet);
  if (!target) {
    bullet.vx *= 0.9;
    bullet.x += bullet.vx;
    bullet.seeking = false;
    return;
  }

  const dx = target.x - bullet.x;
  const dy = target.y - bullet.y;
  const distance = Math.max(1, Math.hypot(dx, dy));
  const steerPower = 0.34 + bullet.homing * 0.16;
  const maxTurn = 2.7 + bullet.homing * 1.2;

  bullet.vx = clamp(bullet.vx + (dx / distance) * steerPower, -maxTurn, maxTurn);
  bullet.x += bullet.vx;
  bullet.seeking = true;
}

function addParticles(x, y, color, count = 10) {
  for (let i = 0; i < count; i += 1) {
    particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 4.5,
      vy: (Math.random() - 0.5) * 4.5,
      life: 16 + Math.random() * 18,
      color,
      size: 2 + Math.random() * 3,
    });
  }
}

function rectsCollide(a, b) {
  return (
    a.x - a.width / 2 < b.x + b.width / 2 &&
    a.x + a.width / 2 > b.x - b.width / 2 &&
    a.y - a.height / 2 < b.y + b.height / 2 &&
    a.y + a.height / 2 > b.y - b.height / 2
  );
}

function damagePlayer(amount = 1) {
  if (player.shield > 0) {
    player.shield -= 1;
    state.flashTimer = 7;
    setStatus('Shield absorbed the hit.');
    updateHud();
    return;
  }

  player.hp -= amount;
  state.flashTimer = 12;
  setStatus(player.hp > 0 ? 'Hull breach. Keep moving.' : 'Ship lost.');
  playSfx('hit');
  updateHud();

  if (player.hp <= 0) {
    endGame();
  }
}

function endGame() {
  state.running = false;
  state.gameOver = true;
  state.paused = false;
  pauseBtn.textContent = 'Pause';
  state.best = Math.max(state.best, state.score);
  safeSaveBestScore(state.best);
  updateHud();
  finalStats.textContent = `Wave ${state.wave} | ${state.coins} coins | ${state.score} score | Best ${state.best}`;
  gameOverOverlay.classList.remove('hidden');
  setStatus('Run over. Tap Run It Back to restart.');
}

function nextWave() {
  if (state.gameOver) return;
  state.running = false;
  state.inUpgrade = true;
  state.wave += 1;
  buildUpgradeChoices();
  configureWave();
  upgradeOverlay.classList.remove('hidden');
  updateHud();
}

function resumeAfterUpgrade() {
  upgradeOverlay.classList.add('hidden');
  state.inUpgrade = false;
  state.running = true;
  if (state.bossWave) {
    setStatus(`Wave ${state.wave}: boss contact incoming.`);
  }
}

function pickUpCoin(coin) {
  state.coins += coin.value;
  state.score += coin.value * 12;
  addParticles(coin.x, coin.y, '#ffd86b', 5);
  playSfx('coin');
  updateHud();
}

function buildUpgradeChoices() {
  upgradeChoicesEl.innerHTML = '';
  const pool = [...upgrades].sort(() => Math.random() - 0.5).slice(0, 3);

  pool.forEach((upgrade) => {
    const btn = document.createElement('button');
    btn.className = 'upgrade-btn';
    btn.innerHTML = `<strong>${upgrade.title}</strong><span>${upgrade.desc}</span>`;
    btn.addEventListener('click', () => {
      playSfx('uiClick');
      upgrade.apply();
      updateHud();
      resumeAfterUpgrade();
    });
    upgradeChoicesEl.appendChild(btn);
  });
}

function registerKill(enemy) {
  state.score += enemy.kind === 'boss' ? 500 : enemy.kind === 'tank' ? 80 : 40;
  state.waveKills += 1;
  playSfx(enemy.kind === 'boss' ? 'explode' : 'hit');
  coins.push({
    x: enemy.x,
    y: enemy.y,
    vy: 2.4,
    value: enemy.coinValue,
    size: enemy.kind === 'boss' ? 12 : 9,
  });

  if (enemy.kind === 'boss') {
    setStatus('Boss destroyed. Upgrade incoming.');
    nextWave();
    return;
  }

  if (!state.bossWave && state.waveKills >= state.waveTarget) {
    setStatus('Wave clear. Pick your upgrade.');
    nextWave();
  }
}

function updateBackground() {
  state.bgOffset += 6;
  state.stars.forEach((star) => {
    star.y += star.speed;
    if (star.y > H + 4) {
      star.y = -6;
      star.x = Math.random() * W;
    }
  });
}

function update() {
  state.frame += 1;
  updateBackground();

  if (state.flashTimer > 0) {
    state.flashTimer -= 1;
  }

  if (!state.running || state.paused) {
    return;
  }

  state.waveFrame += 1;
  if (state.bossWarningTimer > 0) {
    state.bossWarningTimer -= 1;
  }

  player.x += (laneXs[player.targetLane] - player.x) * player.moveTween;

  player.fireCooldown -= 1;
  if (player.fireCooldown <= 0) {
    fireBullets();
    player.fireCooldown = player.fireRate;
  }

  if (state.bossWave) {
    if (!state.bossSpawned && state.waveFrame > 80) {
      spawnBoss();
    }
  } else {
    state.enemyTimer += 1;
    if (state.enemyTimer >= state.enemyRate) {
      state.enemyTimer = 0;
      spawnEnemy();
    }
  }

  bullets.forEach((bullet) => {
    bullet.age += 1;
    bullet.y -= bullet.speed;
    updateBulletHoming(bullet);
  });
  bullets = bullets.filter((bullet) => bullet.y > -40 && bullet.x > -40 && bullet.x < W + 40);

  enemyBullets.forEach((bullet) => {
    bullet.x += bullet.vx;
    bullet.y += bullet.vy;
  });
  enemyBullets = enemyBullets.filter(
    (bullet) => bullet.y < H + 30 && bullet.x > -20 && bullet.x < W + 20
  );

  enemies.forEach((enemy) => {
    if (enemy.kind === 'boss') {
      if (enemy.y < 140) {
        enemy.y += enemy.speed;
      } else {
        enemy.x = W / 2 + Math.sin(state.frame * 0.03) * 112;
      }
      enemy.fireCooldown -= 1;
      if (enemy.y >= 140 && enemy.fireCooldown <= 0) {
        spawnEnemyBullet(enemy, 'spread');
        enemy.fireCooldown = Math.max(20, 48 - state.wave);
      }
      return;
    }

    enemy.y += enemy.speed;
    enemy.x = laneXs[enemy.lane] + Math.sin(state.frame * 0.08 + enemy.wiggle) * (enemy.kind === 'scout' ? 12 : 6);

    if (enemy.kind === 'shooter') {
      enemy.fireCooldown -= 1;
      if (enemy.fireCooldown <= 0) {
        spawnEnemyBullet(enemy);
        enemy.fireCooldown = Math.max(34, 60 - state.wave * 2);
      }
    }
  });

  const playerBox = {
    x: player.x,
    y: player.y,
    width: player.width,
    height: player.height,
  };

  for (let i = enemies.length - 1; i >= 0; i -= 1) {
    const enemy = enemies[i];
    const enemyBox = {
      x: enemy.x,
      y: enemy.y,
      width: enemy.width,
      height: enemy.height,
    };

    if (enemy.kind !== 'boss' && enemy.y > H + 70) {
      enemies.splice(i, 1);
      damagePlayer();
      continue;
    }

    if (rectsCollide(enemyBox, playerBox)) {
      enemies.splice(i, 1);
      addParticles(enemy.x, enemy.y, enemy.color, enemy.kind === 'boss' ? 18 : 12);
      damagePlayer(enemy.kind === 'boss' ? 2 : 1);
      continue;
    }

    for (let j = bullets.length - 1; j >= 0; j -= 1) {
      const bullet = bullets[j];
      const bulletBox = {
        x: bullet.x,
        y: bullet.y,
        width: bullet.width,
        height: bullet.height,
      };

      if (!rectsCollide(enemyBox, bulletBox)) {
        continue;
      }

      bullets.splice(j, 1);
      enemy.hp -= bullet.damage;
      addParticles(bullet.x, bullet.y, '#9be7ff', 4);

      if (enemy.hp <= 0) {
        enemies.splice(i, 1);
        addParticles(enemy.x, enemy.y, enemy.color, enemy.kind === 'boss' ? 26 : 14);
        registerKill(enemy);
      }
      break;
    }
  }

  for (let i = enemyBullets.length - 1; i >= 0; i -= 1) {
    const bullet = enemyBullets[i];
    const bulletBox = {
      x: bullet.x,
      y: bullet.y,
      width: bullet.width,
      height: bullet.height,
    };

    if (rectsCollide(bulletBox, playerBox)) {
      enemyBullets.splice(i, 1);
      addParticles(bullet.x, bullet.y, '#ff9d84', 5);
      damagePlayer();
    }
  }

  coins.forEach((coin) => {
    coin.y += coin.vy;
    const dx = player.x - coin.x;
    const dy = player.y - coin.y;
    const dist = Math.hypot(dx, dy);

    if (player.magnet > 0 && dist < 120 + player.magnet) {
      coin.x += dx * 0.09;
      coin.y += dy * 0.09;
    }

    if (dist < 34) {
      coin.collected = true;
    }
  });

  for (let i = coins.length - 1; i >= 0; i -= 1) {
    const coin = coins[i];
    if (coin.collected) {
      pickUpCoin(coin);
      coins.splice(i, 1);
    } else if (coin.y > H + 30) {
      coins.splice(i, 1);
    }
  }

  particles.forEach((particle) => {
    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.life -= 1;
  });
  particles = particles.filter((particle) => particle.life > 0);

  state.best = Math.max(state.best, state.score);
  safeSaveBestScore(state.best);
  updateHud();
}

function drawBackground() {
  ctx.fillStyle = '#06101c';
  ctx.fillRect(0, 0, W, H);

  state.stars.forEach((star) => {
    ctx.fillStyle = `rgba(255,255,255,${0.25 + star.size * 0.18})`;
    ctx.fillRect(star.x, star.y, star.size, star.size);
  });

  const cityY = H - 220;
  for (let i = 0; i < 10; i += 1) {
    const x = i * 48;
    const height = 40 + ((i * 37) % 90);
    ctx.fillStyle = 'rgba(18, 38, 62, 0.55)';
    ctx.fillRect(x, cityY + 80 - height, 32, height);
    ctx.fillStyle = 'rgba(123, 182, 255, 0.12)';
    ctx.fillRect(x + 6, cityY + 88 - height, 4, 4);
    ctx.fillRect(x + 18, cityY + 62 - height, 4, 4);
  }

  ctx.fillStyle = 'rgba(8, 18, 30, 0.92)';
  ctx.fillRect(ROAD_LEFT, 0, ROAD_WIDTH, H);

  for (let i = 0; i < 3; i += 1) {
    ctx.fillStyle = i === player.targetLane ? 'rgba(128,245,190,0.09)' : 'rgba(255,255,255,0.03)';
    ctx.fillRect(ROAD_LEFT + i * LANE_WIDTH, 0, LANE_WIDTH, H);
  }

  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 3;
  for (let i = 1; i < 3; i += 1) {
    ctx.beginPath();
    ctx.moveTo(ROAD_LEFT + i * LANE_WIDTH, 0);
    ctx.lineTo(ROAD_LEFT + i * LANE_WIDTH, H);
    ctx.stroke();
  }

  ctx.strokeStyle = 'rgba(255,255,255,0.14)';
  ctx.lineWidth = 4;
  for (let y = -50; y < H + 80; y += 78) {
    const yy = (y + state.bgOffset) % (H + 100) - 50;
    ctx.beginPath();
    ctx.moveTo(W / 2, yy);
    ctx.lineTo(W / 2, yy + 40);
    ctx.stroke();
  }
}

function drawPlayer() {
  ctx.save();
  ctx.translate(player.x, player.y);

  ctx.fillStyle = '#4fd9a7';
  ctx.beginPath();
  ctx.moveTo(0, -38);
  ctx.lineTo(22, -8);
  ctx.lineTo(28, 18);
  ctx.lineTo(12, 30);
  ctx.lineTo(4, 8);
  ctx.lineTo(-4, 8);
  ctx.lineTo(-12, 30);
  ctx.lineTo(-28, 18);
  ctx.lineTo(-22, -8);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#dffff4';
  ctx.beginPath();
  ctx.moveTo(0, -26);
  ctx.lineTo(10, -2);
  ctx.lineTo(0, 10);
  ctx.lineTo(-10, -2);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#86c2ff';
  ctx.fillRect(-18, 6, 8, 20);
  ctx.fillRect(10, 6, 8, 20);
  ctx.fillStyle = '#163149';
  ctx.fillRect(-3, -8, 6, 18);

  ctx.fillStyle = 'rgba(123, 182, 255, 0.8)';
  ctx.fillRect(-9, 26, 6, 12);
  ctx.fillRect(3, 26, 6, 12);

  if (player.shield > 0) {
    ctx.strokeStyle = 'rgba(123,182,255,0.92)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, 34, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

function drawBullets() {
  bullets.forEach((bullet) => {
    if (bullet.homing > 0) {
      ctx.fillStyle = bullet.seeking ? 'rgba(123, 182, 255, 0.35)' : 'rgba(155, 231, 255, 0.2)';
      ctx.beginPath();
      ctx.ellipse(
        bullet.x - bullet.vx * 1.6,
        bullet.y + bullet.height * 0.25,
        bullet.width * 0.9,
        bullet.height * 0.8,
        0,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }

    ctx.fillStyle = bullet.seeking ? '#dffcff' : '#9be7ff';
    ctx.fillRect(bullet.x - bullet.width / 2, bullet.y - bullet.height / 2, bullet.width, bullet.height);
  });

  enemyBullets.forEach((bullet) => {
    ctx.fillStyle = '#ff8e74';
    ctx.fillRect(bullet.x - bullet.width / 2, bullet.y - bullet.height / 2, bullet.width, bullet.height);
  });
}

function drawEnemies() {
  enemies.forEach((enemy) => {
    ctx.save();
    ctx.translate(enemy.x, enemy.y);

    if (enemy.kind === 'boss') {
      ctx.fillStyle = '#ff9c5e';
      ctx.beginPath();
      ctx.moveTo(0, -enemy.height / 2);
      ctx.lineTo(enemy.width / 2 - 8, -18);
      ctx.lineTo(enemy.width / 2, 18);
      ctx.lineTo(54, enemy.height / 2);
      ctx.lineTo(-54, enemy.height / 2);
      ctx.lineTo(-enemy.width / 2, 18);
      ctx.lineTo(-enemy.width / 2 + 8, -18);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#4e2106';
      ctx.fillRect(-28, -18, 56, 22);
      ctx.fillStyle = '#ffe6b4';
      ctx.fillRect(-48, 8, 18, 22);
      ctx.fillRect(30, 8, 18, 22);
      ctx.fillStyle = '#ffcf86';
      ctx.fillRect(-18, -42, 36, 12);

      const healthRatio = enemy.hp / enemy.maxHp;
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(-64, -78, 128, 12);
      ctx.fillStyle = '#ff8a5b';
      ctx.fillRect(-64, -78, 128 * healthRatio, 12);
      ctx.strokeStyle = 'rgba(255,255,255,0.16)';
      ctx.strokeRect(-64, -78, 128, 12);

      ctx.restore();
      return;
    }

    if (enemy.kind === 'tank') {
      ctx.fillStyle = '#ffc06d';
      ctx.beginPath();
      ctx.moveTo(0, enemy.height / 2);
      ctx.lineTo(enemy.width / 2, 8);
      ctx.lineTo(enemy.width / 2 - 10, -enemy.height / 2);
      ctx.lineTo(-enemy.width / 2 + 10, -enemy.height / 2);
      ctx.lineTo(-enemy.width / 2, 8);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#653e0c';
      ctx.fillRect(-10, -10, 20, 18);
    } else if (enemy.kind === 'scout') {
      ctx.fillStyle = '#87d7ff';
      ctx.beginPath();
      ctx.moveTo(0, enemy.height / 2);
      ctx.lineTo(enemy.width / 2, -6);
      ctx.lineTo(8, -enemy.height / 2);
      ctx.lineTo(-8, -enemy.height / 2);
      ctx.lineTo(-enemy.width / 2, -6);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#17364d';
      ctx.fillRect(-6, -8, 12, 14);
    } else if (enemy.kind === 'shooter') {
      ctx.fillStyle = '#bf98ff';
      ctx.beginPath();
      ctx.moveTo(0, enemy.height / 2);
      ctx.lineTo(enemy.width / 2, 4);
      ctx.lineTo(12, -enemy.height / 2);
      ctx.lineTo(-12, -enemy.height / 2);
      ctx.lineTo(-enemy.width / 2, 4);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#2a1847';
      ctx.fillRect(-12, -4, 24, 12);
    } else {
      ctx.fillStyle = enemy.color;
      ctx.beginPath();
      ctx.moveTo(0, enemy.height / 2);
      ctx.lineTo(enemy.width / 2, -enemy.height / 2 + 12);
      ctx.lineTo(0, -enemy.height / 2);
      ctx.lineTo(-enemy.width / 2, -enemy.height / 2 + 12);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.fillRect(-9, -6, 18, 12);
    }

    const healthRatio = enemy.hp / enemy.maxHp;
    const killableNow = enemy.hp <= player.bulletDamage;
    const softTarget = !killableNow && enemy.hp <= Math.max(player.bulletDamage + 1, Math.ceil(enemy.maxHp * 0.4));

    ctx.fillStyle = 'rgba(3, 10, 20, 0.7)';
    ctx.fillRect(-enemy.width / 2, -enemy.height / 2 - 14, enemy.width, 6);
    ctx.fillStyle = killableNow ? '#80f5be' : softTarget ? '#ffd86b' : '#ff7a7a';
    ctx.fillRect(-enemy.width / 2, -enemy.height / 2 - 14, enemy.width * healthRatio, 6);
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.strokeRect(-enemy.width / 2, -enemy.height / 2 - 14, enemy.width, 6);

    if (killableNow || softTarget) {
      ctx.strokeStyle = killableNow ? 'rgba(128,245,190,0.95)' : 'rgba(255,216,107,0.95)';
      ctx.lineWidth = 2;
      ctx.strokeRect(-enemy.width / 2 - 4, -enemy.height / 2 - 4, enemy.width + 8, enemy.height + 8);
      ctx.fillStyle = killableNow ? '#d8fff0' : '#fff1bd';
      ctx.font = 'bold 10px Trebuchet MS, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(killableNow ? 'FINISH' : 'WEAK', 0, -enemy.height / 2 - 20);
      ctx.textAlign = 'start';
    }

    ctx.restore();
  });
}

function drawCoins() {
  coins.forEach((coin) => {
    ctx.fillStyle = '#ffd86b';
    ctx.beginPath();
    ctx.arc(coin.x, coin.y, coin.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f7ae00';
    ctx.beginPath();
    ctx.arc(coin.x, coin.y, coin.size * 0.45, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawParticles() {
  particles.forEach((particle) => {
    ctx.globalAlpha = Math.max(0, particle.life / 28);
    ctx.fillStyle = particle.color;
    ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
    ctx.globalAlpha = 1;
  });
}

function drawProgress() {
  const ratio = Math.min(1, state.waveKills / state.waveTarget);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(20, 20, W - 40, 14);
  ctx.fillStyle = state.bossWave ? '#ff9c5e' : '#80f5be';
  ctx.fillRect(20, 20, (W - 40) * ratio, 14);
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.strokeRect(20, 20, W - 40, 14);

  ctx.fillStyle = 'rgba(245,247,255,0.9)';
  ctx.font = 'bold 12px Trebuchet MS, sans-serif';
  ctx.fillText(state.bossWave ? 'BOSS WAVE' : `WAVE CLEAR ${state.waveKills}/${state.waveTarget}`, 24, 50);
}

function drawWarnings() {
  if (state.bossWarningTimer <= 0 || !state.running || state.paused) return;
  const alpha = state.bossWarningTimer % 24 < 12 ? 0.8 : 0.2;
  ctx.fillStyle = `rgba(255, 114, 114, ${alpha})`;
  ctx.fillRect(0, 96, W, 42);
  ctx.fillStyle = '#fff8f3';
  ctx.font = 'bold 20px Trebuchet MS, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('WARNING: BOSS INBOUND', W / 2, 124);
  ctx.textAlign = 'start';
}

function render() {
  drawBackground();
  drawProgress();
  drawWarnings();
  drawCoins();
  drawBullets();
  drawEnemies();
  drawPlayer();
  drawParticles();

  if (state.flashTimer > 0) {
    ctx.fillStyle = 'rgba(255, 114, 114, 0.18)';
    ctx.fillRect(0, 0, W, H);
  }

  if (state.paused) {
    ctx.fillStyle = 'rgba(3, 8, 14, 0.55)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#f5f7ff';
    ctx.font = 'bold 30px Trebuchet MS, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED', W / 2, H / 2);
    ctx.textAlign = 'start';
  }
}

function loop() {
  update();
  render();
  requestAnimationFrame(loop);
}

let touchStartX = null;

canvas.addEventListener('pointerdown', (event) => {
  event.preventDefault();
  onGameInteraction();
  if (!state.running || state.paused) return;
  const rect = canvas.getBoundingClientRect();
  touchStartX = event.clientX - rect.left;
});

canvas.addEventListener('pointerup', (event) => {
  event.preventDefault();
  if (!state.running || state.paused || touchStartX === null) return;
  const rect = canvas.getBoundingClientRect();
  const endX = event.clientX - rect.left;
  const delta = endX - touchStartX;

  if (Math.abs(delta) > 30) {
    moveLane(delta > 0 ? 1 : -1);
  } else {
    moveLane(endX < rect.width / 2 ? -1 : 1);
  }

  touchStartX = null;
});

canvas.addEventListener('pointercancel', () => {
  touchStartX = null;
});

window.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase();
  if (key === 'arrowleft' || key === 'a') {
    event.preventDefault();
    moveLane(-1);
  }
  if (key === 'arrowright' || key === 'd') {
    event.preventDefault();
    moveLane(1);
  }
  if ((key === ' ' || key === 'enter') && !state.running && !state.inUpgrade && !state.gameOver) {
    event.preventDefault();
    startGame();
  }
  if (key === 'p') {
    event.preventDefault();
    togglePause();
  }
  if (key === 'm') {
    event.preventDefault();
    toggleAudio();
  }
});

startBtn.addEventListener('click', () => {
  onGameInteraction();
  startGame();
});
restartBtn.addEventListener('click', () => {
  onGameInteraction();
  startGame();
});
startBtn.addEventListener('click', () => playSfx('uiClick'));
restartBtn.addEventListener('click', () => playSfx('uiClick'));
pauseBtn.addEventListener('click', () => {
  onGameInteraction();
  playSfx('uiClick');
  togglePause();
});
leftBtn.addEventListener('pointerdown', () => {
  onGameInteraction();
  playSfx('uiClick');
  moveLane(-1);
});
rightBtn.addEventListener('pointerdown', () => {
  onGameInteraction();
  playSfx('uiClick');
  moveLane(1);
});
audioBtn.addEventListener('click', () => {
  onGameInteraction();
  playSfx('uiClick');
  toggleAudio();
});
backgroundMusic.addEventListener('ended', () => {
  queueNextTrack();
  ensureMusicStarted();
});

resetGame();
preloadSfx();
requestAnimationFrame(loop);
