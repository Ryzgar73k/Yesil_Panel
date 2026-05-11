// =============================
// YESIL PANEL — App.js (Customer)
// =============================

const GUNLER = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
const AYLAR  = ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'];

let selectedSahaId  = null;
let selectedTarih   = todayStr();
let currentSahaData = null;

// ---------- DOM ----------
const sehirSel  = document.getElementById('sehirSelect');
const sahaSel   = document.getElementById('sahaSelect');
const content   = document.getElementById('contentArea');
const waModal   = document.getElementById('waModal');
const modalClose= document.getElementById('modalClose');
const waLink    = document.getElementById('waLink');
const modalInfo = document.getElementById('modalInfo');

// ---------- INIT ----------
function init() {
  populateSehirler();
  sehirSel.addEventListener('change', onSehirChange);
  sahaSel.addEventListener('change', onSahaChange);
}

function populateSehirler() {
  const sehirler = getSehirler();
  sehirSel.innerHTML = '<option value="">Şehir seçin...</option>';
  sehirler.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s;
    opt.textContent = s;
    sehirSel.appendChild(opt);
  });
}

function onSehirChange() {
  const sehir = sehirSel.value;
  sahaSel.innerHTML = '<option value="">Saha seçin...</option>';
  sahaSel.disabled = !sehir;
  selectedSahaId = null;

  if (!sehir) return;
  const sahalar = getSahalarBySehir(sehir);
  sahalar.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.id;
    opt.textContent = `${s.ad} — ${s.ilce}`;
    sahaSel.appendChild(opt);
  });
  sahaSel.disabled = false;
}

function onSahaChange() {
  selectedSahaId = sahaSel.value || null;
  // gorBtn.disabled = !selectedSahaId;
  if (selectedSahaId) {
    currentSahaData = getSahaById(selectedSahaId);
    if (currentSahaData) renderContent();
  } else {
    content.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">🏟️</span>
        <h3>Saha Seçin</h3>
        <p>Yukarıdan şehir ve saha seçerek<br/>müsait saatleri görüntüleyin.</p>
      </div>
    `;
  }
}


// ---------- RENDER ----------
function renderContent() {
  content.innerHTML = '';

  // --- Saha info bar ---
  const slots = getSlots(selectedSahaId, selectedTarih);
  const bosCount  = Object.values(slots).filter(s => s.durum === 'bos').length;
  const doluCount = Object.values(slots).filter(s => s.durum === 'dolu').length;

  const infoBar = document.createElement('div');
  infoBar.className = 'saha-info anim-in';
  infoBar.innerHTML = `
    <div class="saha-info-left">
      <h2>🏟️ ${currentSahaData.ad}</h2>
      <p>📍 ${currentSahaData.adres}</p>
    </div>
    <div class="saha-stats">
      <span class="stat-badge bos">✅ ${bosCount} Boş</span>
      <span class="stat-badge dolu">🔴 ${doluCount} Dolu</span>
    </div>
  `;
  content.appendChild(infoBar);

  // --- Date strip ---
  const strip = buildDateStrip();
  content.appendChild(strip);

  // --- Legend ---
  const legend = document.createElement('div');
  legend.className = 'legend';
  legend.innerHTML = `
    <div class="legend-item"><div class="legend-dot bos"></div> Boş — Tıklayarak WhatsApp ile iletişime geçin</div>
    <div class="legend-item"><div class="legend-dot dolu"></div> Dolu</div>
  `;
  content.appendChild(legend);

  // --- Slots ---
  renderSlots(slots);
}

function buildDateStrip() {
  const strip = document.createElement('div');
  strip.className = 'date-strip';

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const iso = formatISOLocal(d);

    const chip = document.createElement('div');
    chip.className = 'date-chip' + (iso === selectedTarih ? ' active' : '');
    chip.innerHTML = `
      <span class="day-name">${i === 0 ? 'Bugün' : GUNLER[d.getDay()]}</span>
      <span class="day-num">${d.getDate()}</span>
      <span class="month-name">${AYLAR[d.getMonth()]}</span>
    `;
    chip.addEventListener('click', () => {
      selectedTarih = iso;
      document.querySelectorAll('.date-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const slots = getSlots(selectedSahaId, selectedTarih);
      renderSlots(slots);
      // update stats
      const bosCount  = Object.values(slots).filter(s => s.durum === 'bos').length;
      const doluCount = Object.values(slots).filter(s => s.durum === 'dolu').length;
      document.querySelector('.stat-badge.bos').textContent  = `✅ ${bosCount} Boş`;
      document.querySelector('.stat-badge.dolu').textContent = `🔴 ${doluCount} Dolu`;
    });
    strip.appendChild(chip);
  }
  return strip;
}

function renderSlots(slots) {
  const existing = document.querySelector('.slots-grid');
  if (existing) existing.remove();

  const grid = document.createElement('div');
  grid.className = 'slots-grid anim-in';

  SAATLER.forEach(saat => {
    const slot = slots[saat] || { durum: 'bos', fiyat: currentSahaData.defaultFiyat };
    const card = document.createElement('div');
    card.className = `slot-card ${slot.durum}`;

    const enSaat = incrementHour(saat);
    card.innerHTML = `
      <div class="slot-time">${saat}</div>
      <div class="slot-duration">1 Saatlik Kiralama · ${enSaat}'e kadar</div>
      <div class="slot-price">${slot.fiyat.toLocaleString('tr-TR')} ₺</div>
      <div class="slot-status">
        ${slot.durum === 'bos'
          ? '<svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/></svg> Müsait'
          : '<svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11H7v-2h10v2z"/></svg> Dolu'}
      </div>
      ${slot.durum === 'bos' ? '<div class="slot-wa-hint">📱 WhatsApp\'a Tıkla</div>' : ''}
    `;

    if (slot.durum === 'bos') {
      card.addEventListener('click', () => {
        const link = buildWALink(currentSahaData.wp, currentSahaData.ad, selectedTarih, saat, slot.fiyat, currentSahaData.accessCode);
        window.open(link, '_blank');
      });
    }

    grid.appendChild(card);
  });

  content.appendChild(grid);
}

function incrementHour(time) {
  const [h] = time.split(':').map(Number);
  const next = (h + 1) % 24;
  return `${String(next).padStart(2, '0')}:00`;
}

// Removed openWAModal and closeModal for direct WhatsApp link

// ---------- START ----------
init();
