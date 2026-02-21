var cfg  = DATA.config;

var items = [];
var idx   = 0;

// ── Audio ─────────────────────────────────────────────────────────────────────
var currentAudio = null;
var pendingTimer = null;

function stopAudio() {
  if (pendingTimer) { clearTimeout(pendingTimer); pendingTimer = null; }
  if (currentAudio) { currentAudio.pause(); currentAudio = null; }
}

function playAudioFile(src, onEnded) {
  var audio = new Audio(src);
  currentAudio = audio;
  audio.addEventListener('ended', function() {
    if (currentAudio === audio) currentAudio = null;
    if (onEnded) onEnded();
  });
  audio.play().catch(function() {
    if (currentAudio === audio) currentAudio = null;
    if (onEnded) onEnded();
  });
}

// ── Mute ──────────────────────────────────────────────────────────────────────
var muted   = false;
var btnMute = document.getElementById('btn-mute');

// ── Auto-slide ────────────────────────────────────────────────────────────────
var autoSlide        = false;
var autoSlideTimer   = null;
var slideGracePeriod = cfg.slideGracePeriod || 3000;
btnMute.addEventListener('click', function() {
  muted = !muted;
  btnMute.innerHTML = '<i data-lucide="' + (muted ? 'volume-x' : 'volume-2') + '"></i>';
  if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [btnMute] });
  btnMute.classList.toggle('muted', muted);
  if (muted) stopAudio();
});

function speakItem(item, onComplete) {
  if (muted) { if (onComplete) onComplete(); return; }
  stopAudio();
  var audioFi = cfg.finnish && item.audio_fi;
  var audioEn = cfg.english && item.audio_en;
  if (audioFi) {
    playAudioFile(audioFi, audioEn ? function() {
      pendingTimer = setTimeout(function() {
        pendingTimer = null;
        playAudioFile(audioEn, onComplete || null);
      }, 500);
    } : (onComplete || null));
  } else if (audioEn) {
    playAudioFile(audioEn, onComplete || null);
  } else {
    if (onComplete) onComplete();
  }
}

function clearAutoSlideTimer() {
  if (autoSlideTimer) { clearTimeout(autoSlideTimer); autoSlideTimer = null; }
}

function scheduleAutoSlide() {
  if (!autoSlide) return;
  clearAutoSlideTimer();
  autoSlideTimer = setTimeout(function() {
    autoSlideTimer = null;
    if (!animating) { lockNav(); showCard((idx + 1) % items.length, 'next'); }
  }, slideGracePeriod);
}

// ── Contrast helper ───────────────────────────────────────────────────────────
function contrastText(hex) {
  var r = parseInt(hex.slice(1, 3), 16);
  var g = parseInt(hex.slice(3, 5), 16);
  var b = parseInt(hex.slice(5, 7), 16);
  return (r * 0.299 + g * 0.587 + b * 0.114) > 150 ? '#1a1a1a' : '#ffffff';
}

// ── Card builder ──────────────────────────────────────────────────────────────
function buildCard(item) {
  var card = document.createElement('div');
  card.className = 'card';

  var hasBoth = cfg.finnish && cfg.english;
  var fiText  = cfg.finnish ? item.finnish : '';
  var enText  = cfg.english ? item.english : '';

  var labelHTML = (hasBoth && fiText !== enText)
    ? '<span class="lbl-fi">' + fiText + '</span><span class="lbl-en">' + enText + '</span>'
    : '<span class="lbl-single">' + (fiText || enText) + '</span>';

  if (item.letter !== '') {
    card.classList.add('card-letter');
    var upper = document.createElement('div');
    upper.className   = 'card-letter-upper';
    upper.textContent = item.letter.toUpperCase();
    var lower = document.createElement('div');
    lower.className   = 'card-letter-lower';
    lower.textContent = item.letter.toLowerCase();
    card.appendChild(upper);
    card.appendChild(lower);
  } else if (item.number !== '') {
    card.classList.add('card-number');
    var digit = document.createElement('div');
    digit.className   = 'card-number-digit';
    digit.textContent = item.number;
    card.appendChild(digit);
  } else if (item.color) {
    card.classList.add('card-color');
    card.style.backgroundColor = item.color;
    card.style.color            = contrastText(item.color);
  } else if (item.images && item.images.length) {
    card.classList.add('card-has-image');
    var img       = document.createElement('img');
    img.className = 'card-img';
    img.alt       = enText || fiText;
    img.draggable = false;
    img.onload  = function() { this.classList.add('img-ready'); };
    img.onerror = function() {
      card.removeChild(img);
      card.classList.remove('card-has-image');
      card.classList.add('card-no-image');
    };
    img.src = item.images[Math.floor(Math.random() * item.images.length)];
    if (img.complete) img.classList.add('img-ready');
    card.appendChild(img);
  } else {
    card.classList.add('card-no-image');
  }

  if (item.letter === '') {
    var label       = document.createElement('div');
    label.className = 'card-label';
    label.innerHTML = labelHTML;
    card.appendChild(label);
  }

  return card;
}

// ── Navigation ────────────────────────────────────────────────────────────────
var animating = false;
var wrap      = document.getElementById('card-wrap');

function showCard(newIdx, direction) {
  if (animating) return;
  animating = true;

  var oldCard = wrap.querySelector('.card');
  var newCard = buildCard(items[newIdx]);

  if (oldCard) {
    oldCard.classList.add('anim-out');
    newCard.classList.add('anim-in');
    wrap.appendChild(newCard);
    setTimeout(function() { oldCard.remove(); animating = false; }, 300);
  } else {
    wrap.innerHTML = '';
    wrap.appendChild(newCard);
    animating = false;
  }

  idx = newIdx;
  speakItem(items[idx], scheduleAutoSlide);
}

// ── Navigation delay ──────────────────────────────────────────────────────────
var navDelay   = cfg.navigationDelay || 0;
var navLocked  = false;
var navPrevBtn = document.getElementById('nav-prev');
var navNextBtn = document.getElementById('nav-next');

function lockNav() {
  if (!navDelay) return;
  navLocked = true;
  navPrevBtn.style.opacity      = '0';
  navPrevBtn.style.pointerEvents = 'none';
  navNextBtn.style.opacity      = '0';
  navNextBtn.style.pointerEvents = 'none';
  setTimeout(function() {
    navLocked = false;
    navPrevBtn.style.opacity      = '1';
    navPrevBtn.style.pointerEvents = '';
    navNextBtn.style.opacity      = '1';
    navNextBtn.style.pointerEvents = '';
  }, navDelay);
}

function goNext() { if (!animating && !navLocked) { lockNav(); showCard((idx + 1) % items.length, 'next'); } }
function goPrev() { if (!animating && !navLocked) { lockNav(); showCard((idx - 1 + items.length) % items.length, 'prev'); } }

// ── Navigation controls ───────────────────────────────────────────────────────
wrap.addEventListener('click', function() { clearAutoSlideTimer(); speakItem(items[idx], scheduleAutoSlide); });
document.getElementById('nav-prev').addEventListener('click', function() { goPrev(); });
document.getElementById('nav-next').addEventListener('click', function() { goNext(); });

document.addEventListener('keydown', function(e) {
  if (!document.getElementById('screen-slideshow').classList.contains('active')) return;
  if (e.key === 'ArrowRight') goNext();
  if (e.key === 'ArrowLeft')  goPrev();
  if (e.key === ' ')          speakItem(items[idx]);
});

// ── Auto-slide button ─────────────────────────────────────────────────────────
var btnAutoSlide = document.getElementById('btn-autoslide');
btnAutoSlide.addEventListener('click', function() {
  autoSlide = !autoSlide;
  btnAutoSlide.innerHTML = '<i data-lucide="' + (autoSlide ? 'pause' : 'play') + '"></i>';
  if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [btnAutoSlide] });
  btnAutoSlide.classList.toggle('active', autoSlide);
  if (autoSlide) scheduleAutoSlide();
  else clearAutoSlideTimer();
});

// ── Screen management ─────────────────────────────────────────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(function(s) { s.classList.remove('active'); });
  document.getElementById(id).classList.add('active');
  if (id === 'screen-picker') clearAutoSlideTimer();
}

// ── Start slideshow ───────────────────────────────────────────────────────────
function startSlideshow(selectedItems) {
  items = selectedItems;
  idx   = 0;
  wrap.innerHTML = '';
  showScreen('screen-slideshow');
  lockNav();
  showCard(0, null);
}

// ── Category picker ───────────────────────────────────────────────────────────
var TILE_COLORS = DATA.config.tilesBgs && DATA.config.tilesBgs.length
  ? DATA.config.tilesBgs
  : [{bg:'#e63946',fg:'#fff'},{bg:'#2a9d8f',fg:'#fff'},{bg:'#e76f51',fg:'#fff'},
     {bg:'#457b9d',fg:'#fff'},{bg:'#06d6a0',fg:'#fff'},{bg:'#f4a261',fg:'#fff'},
     {bg:'#118ab2',fg:'#fff'},{bg:'#c77dff',fg:'#fff'}];

function calcTileFont() {
  var cols    = window.innerWidth >= 1024 ? 3 : 2;
  var rows    = Math.ceil(DATA.categories.length / cols);
  var tileW   = window.innerWidth  / cols;
  var tileH   = window.innerHeight / rows;
  var longest = DATA.categories.reduce(function(a, b) {
    return a.name.length > b.name.length ? a : b;
  }).name.toUpperCase();
  var size = (tileW * 0.8) / (longest.length * 0.62);
  return Math.min(size, tileH * 0.4);
}

function buildPicker() {
  var grid     = document.getElementById('category-grid');
  var fontSize = calcTileFont();
  var iconSz   = Math.max(32, Math.round(fontSize * 0.8));
  grid.style.setProperty('--cat-icon-sz', iconSz + 'px');

  DATA.categories.forEach(function(cat, i) {
    var fallback = TILE_COLORS[i % TILE_COLORS.length];
    var btn = document.createElement('button');
    btn.className        = 'cat-btn';
    btn.style.background = cat.color || fallback.bg;
    btn.style.color      = fallback.fg;

    if (cat.icon1) {
      var ic1 = document.createElement('div');
      ic1.className = 'cat-icon cat-icon-1';
      ic1.style.animationDelay = (i * 0.7) + 's';
      var el1 = document.createElement('i');
      el1.setAttribute('data-lucide', cat.icon1);
      ic1.appendChild(el1);
      btn.appendChild(ic1);
    }

    if (cat.icon2) {
      var ic2 = document.createElement('div');
      ic2.className = 'cat-icon cat-icon-2';
      ic2.style.animationDelay = ((i * 0.7) + 2) + 's';
      var el2 = document.createElement('i');
      el2.setAttribute('data-lucide', cat.icon2);
      ic2.appendChild(el2);
      btn.appendChild(ic2);
    }

    var content = document.createElement('div');
    content.className = 'cat-content';
    var title = document.createElement('span');
    title.className = 'cat-title';
    title.textContent = cat.name;
    title.style.fontSize     = fontSize + 'px';
    title.style.animationDelay = (i * 0.3) + 's';
    content.appendChild(title);
    btn.appendChild(content);

    var depth = document.createElement('div');
    depth.className = 'cat-depth';
    btn.appendChild(depth);

    var hov = document.createElement('div');
    hov.className = 'cat-hover';
    btn.appendChild(hov);

    btn.addEventListener('click', function() { startSlideshow(cat.items.slice()); });
    grid.appendChild(btn);
  });

  if (typeof lucide !== 'undefined') lucide.createIcons();

  window.addEventListener('resize', function() {
    var fs  = calcTileFont();
    var isz = Math.max(32, Math.round(fs * 0.8));
    grid.style.setProperty('--cat-icon-sz', isz + 'px');
    document.querySelectorAll('.cat-title').forEach(function(el) { el.style.fontSize = fs + 'px'; });
  });
}

// ── Boot ──────────────────────────────────────────────────────────────────────
buildPicker();
showScreen('screen-picker');
