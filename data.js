// =============================
// YESIL PANEL — Veri Katmanı
// =============================

const DB_KEY = 'yesilPanel_v2'; // Versiyon yükseltme

const SAATLER = [
  '18:00','19:00','20:00','21:00','22:00','23:00','00:00'
];

// Örnek başlangıç verisi
const ORNEK_DATA = {
  superAdminPin: '123456',
  sahalar: [
    {
      id: 'saha-001',
      ad: 'Yıldız Halı Saha',
      sehir: 'İstanbul',
      ilce: 'Kadıköy',
      adres: 'Moda Cad. No:15 Kadıköy/İstanbul',
      wp: '905551234567',
      defaultFiyat: 600,
      accessCode: '111222',
      slots: {}
    }
  ]
};

function getData() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (!raw) {
      localStorage.setItem(DB_KEY, JSON.stringify(ORNEK_DATA));
      return JSON.parse(JSON.stringify(ORNEK_DATA));
    }
    return JSON.parse(raw);
  } catch {
    return JSON.parse(JSON.stringify(ORNEK_DATA));
  }
}

function saveData(data) {
  localStorage.setItem(DB_KEY, JSON.stringify(data));
}

function getSehirler() {
  const data = getData();
  return [...new Set(data.sahalar.map(s => s.sehir))].sort();
}

function getSahalarBySehir(sehir) {
  const data = getData();
  return data.sahalar.filter(s => s.sehir === sehir);
}

function getSahaById(id) {
  const data = getData();
  return data.sahalar.find(s => s.id === id) || null;
}

function getSahaByAccessCode(code) {
  const data = getData();
  return data.sahalar.find(s => s.accessCode === code) || null;
}

function getSlots(sahaId, tarih) {
  const data = getData();
  const saha = data.sahalar.find(s => s.id === sahaId);
  if (!saha) return {};
  if (!saha.slots[tarih]) {
    const result = {};
    SAATLER.forEach(s => {
      result[s] = { durum: 'bos', fiyat: saha.defaultFiyat };
    });
    return result;
  }
  const result = {};
  SAATLER.forEach(s => {
    result[s] = saha.slots[tarih][s] || { durum: 'bos', fiyat: saha.defaultFiyat };
  });
  return result;
}

function setSlot(sahaId, tarih, saat, durum, fiyat) {
  const data = getData();
  const saha = data.sahalar.find(s => s.id === sahaId);
  if (!saha) return;
  if (!saha.slots[tarih]) saha.slots[tarih] = {};
  saha.slots[tarih][saat] = { durum, fiyat };
  saveData(data);
}

function addSaha(sahaObj) {
  const data = getData();
  sahaObj.id = 'saha-' + Date.now();
  sahaObj.slots = {};
  // Generate random 6 digit code if not provided
  if (!sahaObj.accessCode) {
    sahaObj.accessCode = Math.floor(100000 + Math.random() * 900000).toString();
  }
  data.sahalar.push(sahaObj);
  saveData(data);
  return sahaObj;
}

function updateSaha(id, updates) {
  const data = getData();
  const idx = data.sahalar.findIndex(s => s.id === id);
  if (idx === -1) return;
  data.sahalar[idx] = { ...data.sahalar[idx], ...updates };
  saveData(data);
}

function deleteSaha(id) {
  const data = getData();
  data.sahalar = data.sahalar.filter(s => s.id !== id);
  saveData(data);
}

function checkSuperAdminPin(pin) {
  return getData().superAdminPin === pin;
}

// Tarih kaymasını önlemek için yerel tarih döndüren fonksiyon
function formatISOLocal(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function todayStr() {
  return formatISOLocal(new Date());
}

function formatTarih(str) {
  const [y, m, d] = str.split('-');
  return `${d}.${m}.${y}`;
}

function buildWALink(wp, sahaAd, tarih, saat, fiyat, accessCode) {
  const panelLink = `${window.location.origin}/owner.html?date=${tarih}&time=${saat}`;
  const msg = encodeURIComponent(
    `Merhaba! ${sahaAd} sahasında ${formatTarih(tarih)} tarihinde ${saat} saatindeki boş alanı öğrenmek istiyorum. (${fiyat} ₺)\n\n${panelLink}`
  );
  return `https://wa.me/${wp}?text=${msg}`;
}
