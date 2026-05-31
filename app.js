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

// ---------- INIT ----------
async function init() {
  await populateSehirler();
  sehirSel.addEventListener('change', onSehirChange);
  sahaSel.addEventListener('change', onSahaChange);

  // Özel Müşteri Paylaşım Linki Kontrolü
  const params = new URLSearchParams(window.location.search);
  const directSahaId = params.get('sahaId');
  if (directSahaId) {
    const selectorCard = document.querySelector('.selector-card');
    if (selectorCard) selectorCard.style.display = 'none'; // Arama kutularını gizle
    const heroSec = document.querySelector('.hero');
    if (heroSec) heroSec.style.display = 'none'; // Hero kısmını gizle (daha kompakt görünüm)
    
    selectedSahaId = directSahaId;
    content.innerHTML = '<div class="loading"><div class="spinner"></div> Saha bilgileri yükleniyor...</div>';
    currentSahaData = await getSahaById(selectedSahaId);
    if (currentSahaData) {
      applyActiveHours(currentSahaData);
      renderContent();
    } else {
      content.innerHTML = '<div class="empty-state">❌ Saha bulunamadı veya silinmiş.</div>';
    }
  }
}

async function populateSehirler() {
  const sehirler = await getSehirler();
  sehirSel.innerHTML = '<option value="">Şehir seçin...</option>';
  sehirler.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s;
    opt.textContent = s;
    sehirSel.appendChild(opt);
  });
}

async function onSehirChange() {
  const sehir = sehirSel.value;
  sahaSel.innerHTML = '<option value="">Saha seçin...</option>';
  sahaSel.disabled = !sehir;
  selectedSahaId = null;

  if (!sehir) return;
  const sahalar = await getSahalarBySehir(sehir);
  sahalar.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.id;
    opt.textContent = `${s.ad} — ${s.ilce}`;
    sahaSel.appendChild(opt);
  });
  sahaSel.disabled = false;
}

function applyActiveHours(saha) {
  if (saha && saha.aktif_saatler) {
    SAATLER.length = 0;
    saha.aktif_saatler.split(',').forEach(s => SAATLER.push(s));
    SAATLER.sort((a,b) => TUM_SAATLER.indexOf(a) - TUM_SAATLER.indexOf(b));
  } else {
    SAATLER.length = 0;
    ['18:00', '19:00', '20:00', '21:00', '22:00', '23:00', '00:00'].forEach(s => SAATLER.push(s));
  }
}

async function onSahaChange() {
  selectedSahaId = sahaSel.value || null;
  if (selectedSahaId) {
    currentSahaData = await getSahaById(selectedSahaId);
    if (currentSahaData) {
      applyActiveHours(currentSahaData);
      renderContent();
    }
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
async function renderContent() {
  content.innerHTML = '<div class="loading"><div class="spinner"></div> Veriler yükleniyor...</div>';

  const slots = await getSlots(selectedSahaId, selectedTarih);
  const bosCount  = Object.values(slots).filter(s => s.durum === 'bos').length;
  const doluCount = Object.values(slots).filter(s => s.durum === 'dolu').length;

  content.innerHTML = ''; // Clear loading

  const infoBar = document.createElement('div');
  infoBar.className = 'saha-info anim-in';
  
  let imgSrc = currentSahaData.gorsel;
  if (imgSrc) {
    if (!imgSrc.startsWith('http://') && !imgSrc.startsWith('https://')) {
      if (!imgSrc.startsWith('/') && !imgSrc.startsWith('images/')) {
        imgSrc = 'images/' + imgSrc;
      }
    }
  } else {
    imgSrc = 'https://images.unsplash.com/photo-1575361204480-aadea25e6e68?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80';
  }
  let embedSrc = '';
  const rawHarita = currentSahaData.harita;
  
  if (rawHarita && rawHarita.includes('<iframe')) {
    // Admin Google Maps "Harita Yerleştir" iframe kodunu yapıştırmış
    const match = rawHarita.match(/src="([^"]+)"/);
    if (match && match[1]) embedSrc = match[1];
  } else if (rawHarita && rawHarita.startsWith('http') && (rawHarita.includes('embed') || rawHarita.includes('output='))) {
    // Admin direkt embed linkini yapıştırmış
    embedSrc = rawHarita;
  } else {
    // Sadece yer adı veya adres girilmişse, otomatik query yap
    const query = rawHarita || currentSahaData.adres || (currentSahaData.ad + ' ' + currentSahaData.ilce);
    embedSrc = `https://maps.google.com/maps?q=${encodeURIComponent(query)}&t=&z=14&ie=UTF8&iwloc=&output=embed`;
  }

  const mapsIframe = `<iframe width="100%" height="250" style="border:0; border-radius:12px; margin-top:15px; display:none;" id="mapIframe" loading="lazy" allowfullscreen src="${embedSrc}"></iframe>`;

  infoBar.innerHTML = `
    <div style="display:flex; justify-content:space-between; width:100%; gap:15px; align-items:flex-start;">
      <div class="saha-info-left" style="flex:1;">
        <h2>🏟️ ${currentSahaData.ad}</h2>
        <p style="color:var(--text-muted); font-size:13px; margin-bottom:12px;">${currentSahaData.adres || currentSahaData.ilce + ', ' + currentSahaData.sehir}</p>
        <div class="saha-stats" style="display:flex; gap:10px; align-items:center;">
          <span class="stat-badge bos">✅ ${bosCount} Boş</span>
          <span class="stat-badge" style="cursor:pointer; background:rgba(255,255,255,0.05); border:1px solid var(--dark-border); color:var(--text-light);" onclick="const f = document.getElementById('mapIframe'); f.style.display = f.style.display === 'none' ? 'block' : 'none';">
            📍 Haritada Gör
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-left:4px;"><path d="M6 9l6 6 6-6"/></svg>
          </span>
        </div>
      </div>
      <div class="saha-info-right" style="width:100px; height:100px; flex-shrink:0;">
        <img src="${imgSrc}" style="width:100%; height:100%; object-fit:cover; border-radius:12px; border:2px solid var(--dark-border); box-shadow:0 4px 10px rgba(0,0,0,0.3);" alt="${currentSahaData.ad}" onerror="this.src='https://images.unsplash.com/photo-1575361204480-aadea25e6e68?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80'" />
      </div>
    </div>
    ${mapsIframe}
  `;
  content.appendChild(infoBar);

  const strip = buildDateStrip();
  content.appendChild(strip);

  const legend = document.createElement('div');
  legend.className = 'legend';
  legend.innerHTML = `
    <div class="legend-item"><div class="legend-dot bos"></div> Boş — Tıklayarak WhatsApp ile iletişime geçin</div>
    <div class="legend-item"><div class="legend-dot dolu"></div> Dolu</div>
  `;
  content.appendChild(legend);

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
    chip.addEventListener('click', async () => {
      selectedTarih = iso;
      document.querySelectorAll('.date-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      await renderContent();
    });
    strip.appendChild(chip);
  }

  // 1 Haftadan sonrası için takvim butonu (Max 10 gün)
  const dpWrapper = document.createElement('div');
  dpWrapper.style.cssText = 'position:relative; display:flex; align-items:center; flex-shrink:0;';
  
  // İlk 7 günden birisi mi seçili kontrolü
  const first7Dates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    first7Dates.push(formatISOLocal(d));
  }
  const isSelectedCustom = !first7Dates.includes(selectedTarih);

  const dpIcon = document.createElement('div');
  dpIcon.className = 'date-chip' + (isSelectedCustom ? ' active' : '');
  dpIcon.style.cssText = 'min-width: 64px; justify-content: center;';
  
  if (isSelectedCustom) {
    const [y, m, d] = selectedTarih.split('-');
    dpIcon.innerHTML = `
      <span class="day-name" style="color: var(--green-200);">Seçildi</span>
      <span class="day-num" style="font-size:18px; margin: 2px 0;">${d}.${m}</span>
      <span class="month-name" style="color: var(--green-200);">📅 Değiştir</span>
    `;
  } else {
    dpIcon.innerHTML = `
      <span class="day-name">Diğer</span>
      <span class="day-num" style="font-size:20px; margin: 2px 0;">📅</span>
      <span class="month-name">Tarih Seç</span>
    `;
  }

  const dpInput = document.createElement('input');
  dpInput.type = 'date';
  dpInput.style.cssText = 'position:absolute; top:0; left:0; width:1px; height:1px; opacity:0; pointer-events:none;';
  
  const minD = new Date(today);
  dpInput.min = minD.toISOString().split('T')[0];
  const maxD = new Date(today);
  maxD.setDate(today.getDate() + 10);
  dpInput.max = maxD.toISOString().split('T')[0];

  dpInput.addEventListener('change', (e) => {
    if(e.target.value) {
      selectedTarih = e.target.value;
      renderContent();
    }
  });

  dpIcon.addEventListener('click', () => {
    try {
      dpInput.showPicker();
    } catch(e) {
      dpInput.click();
    }
  });

  dpWrapper.appendChild(dpIcon);
  dpWrapper.appendChild(dpInput);
  strip.appendChild(dpWrapper);

  return strip;
}

function renderSlots(slots) {
  const grid = document.createElement('div');
  grid.className = 'slots-grid anim-in';

  SAATLER.forEach(saat => {
    const slot = slots[saat];
    const card = document.createElement('div');
    let statusHTML = '';
    let hintHTML = '';
    
    if (slot.durum === 'bos') {
      statusHTML = '<svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/></svg> Müsait';
      hintHTML = '<div class="slot-wa-hint">📱 WhatsApp\'a Tıkla</div>';
    } else if (slot.durum === 'abone') {
      statusHTML = '<svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11H7v-2h10v2z"/></svg> ABONE';
      hintHTML = '<div class="slot-notify-hint" style="pointer-events:auto; color:#f39c12; font-size:13px; font-weight:600; margin-top:10px; cursor:pointer; padding:6px; background:rgba(243,156,18,0.1); border-radius:6px;">🔔 İptal Olursa Bildir</div>';
    } else {
      statusHTML = '<svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11H7v-2h10v2z"/></svg> Dolu';
      hintHTML = '<div class="slot-notify-hint" style="pointer-events:auto; color:#f39c12; font-size:13px; font-weight:600; margin-top:10px; cursor:pointer; padding:6px; background:rgba(243,156,18,0.1); border-radius:6px;">🔔 İptal Olursa Bildir</div>';
    }

    // Abone görünümü için CSS class'ı (Dolu ile aynı temeli kullansın)
    const cardClass = slot.durum === 'abone' ? 'dolu abone' : slot.durum;
    card.className = `slot-card ${cardClass}`;

    const enSaat = incrementHour(saat);
    card.innerHTML = `
      <div class="slot-time" style="font-size:18px;">${saat} - ${enSaat}</div>
      <div class="slot-duration">1 Saatlik Kiralama</div>
      <div class="slot-price">${slot.fiyat.toLocaleString('tr-TR')} ₺</div>
      <div class="slot-status">
        ${statusHTML}
      </div>
      ${hintHTML}
    `;

    if (slot.durum === 'bos') {
      card.addEventListener('click', () => {
        const link = buildWALink(currentSahaData.wp, currentSahaData.ad, selectedTarih, saat, slot.fiyat, currentSahaData.access_code);
        window.open(link, '_blank');
      });
    } else {
      // Abone veya Dolu ise bildirim isteği ekle
      const hintBtn = card.querySelector('.slot-notify-hint');
      if (hintBtn) {
        hintBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          requestNotification(currentSahaData.id, selectedTarih, saat);
        });
      }
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

async function requestNotification(sahaId, tarih, saat) {
  const tel = prompt(`${tarih} ${saat} seansı iptal olursa size WhatsApp'tan haber vereceğiz.\nLütfen telefon numaranızı başında sıfır olmadan girin (Örn: 5xxxxxxxxx):`);
  if (!tel) return; // Kullanıcı iptal etti
  
  const cleanTel = tel.replace(/[^0-9]/g, '');
  if (cleanTel.length < 10) {
    alert("Geçersiz telefon numarası. Lütfen 10 haneli numaranızı eksiksiz girin.");
    return;
  }
  
  const formattedTel = cleanTel.length === 10 ? '90' + cleanTel : (cleanTel.startsWith('0') ? '9' + cleanTel : cleanTel);
  
  const success = await addBildirimTalep(sahaId, tarih, saat, formattedTel);
  if (success) {
    alert("Talebiniz alındı! İptal durumunda size ilk fırsatta mesaj atılacaktır.");
  } else {
    alert("Bir hata oluştu, lütfen internet bağlantınızı kontrol edip tekrar deneyin.");
  }
}

// ---------- START ----------
init();
