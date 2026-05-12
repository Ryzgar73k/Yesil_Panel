// =============================
// YESIL PANEL — Supabase Altyapısı
// =============================

const SUPABASE_URL = 'https://xualunumuphfunswjrodx.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh1YWx1bnVtcGhmdW5zd2pyb2R4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1Mjc0MDUsImV4cCI6MjA5NDEwMzQwNX0.BmnUx69s_ebyUrq3kO3cmV41ujv3xaTkvy8u9WWQ4bA';

// İsim çakışmasını önlemek için 'sb' adını kullanıyoruz
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const SAATLER = [
  '18:00','19:00','20:00','21:00','22:00','23:00','00:00'
];

const MASTER_PIN = '194673'; // İstediğin yeni şifre

// --- Yardımcı Fonksiyonlar ---
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

// --- Animasyon Fonksiyonu ---
window.showTransition = function(url) {
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:#1A1E1C;z-index:9999;display:flex;justify-content:center;align-items:center;opacity:0;transition:opacity 0.3s ease;';
  overlay.innerHTML = '<div style="font-size:80px; animation:spin-bounce 0.8s infinite ease-in-out;">⚽</div><style>@keyframes spin-bounce { 0% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-30px) rotate(180deg); } 100% { transform: translateY(0) rotate(360deg); } }</style>';
  document.body.appendChild(overlay);
  
  // Trigger reflow
  overlay.offsetHeight;
  overlay.style.opacity = '1';
  
  setTimeout(() => {
    window.location.href = url;
  }, 400);
};

// --- Veri Fonksiyonları (ASYNC) ---

async function getSehirler() {
  try {
    const { data, error } = await sb.from('sahalar').select('sehir');
    if (error) throw error;
    if (!data || data.length === 0) return [];
    return [...new Set(data.map(s => s.sehir))].sort();
  } catch (err) {
    console.error("Şehirler yüklenemedi:", err);
    return [];
  }
}

async function getSahalarBySehir(sehir) {
  const { data, error } = await sb.from('sahalar').select('*').eq('sehir', sehir);
  return error ? [] : data;
}

async function getSahaById(id) {
  const { data, error } = await sb.from('sahalar').select('*').eq('id', id).single();
  return error ? null : data;
}

async function getSahaByAccessCode(code) {
  const { data, error } = await sb.from('sahalar').select('*').eq('access_code', code).single();
  return error ? null : data;
}

async function getSlots(sahaId, tarih) {
  const saha = await getSahaById(sahaId);
  if (!saha) return {};

  const { data, error } = await sb
    .from('slots')
    .select('*')
    .eq('saha_id', sahaId)
    .eq('tarih', tarih);

  const result = {};
  SAATLER.forEach(s => {
    const dbSlot = data?.find(d => d.saat === s);
    result[s] = {
      durum: dbSlot ? dbSlot.durum : 'bos',
      fiyat: dbSlot && dbSlot.fiyat ? dbSlot.fiyat : saha.default_fiyat
    };
  });
  return result;
}

async function setSlot(sahaId, tarih, saat, durum, fiyat) {
  const { error } = await sb
    .from('slots')
    .upsert({
      saha_id: sahaId,
      tarih: tarih,
      saat: saat,
      durum: durum,
      fiyat: fiyat
    }, { onConflict: 'saha_id, tarih, saat' });
  
  if (error) console.error('SetSlot error:', error);
  return !error;
}

async function addSaha(sahaObj) {
  const { data, error } = await sb.from('sahalar').insert({
    ad: sahaObj.ad,
    sehir: sahaObj.sehir,
    ilce: sahaObj.ilce,
    adres: sahaObj.adres,
    wp: sahaObj.wp,
    default_fiyat: sahaObj.defaultFiyat,
    access_code: sahaObj.accessCode || Math.floor(100000 + Math.random() * 900000).toString()
  }).select().single();

  if (error) {
    console.error("Saha ekleme hatası:", error);
    alert("Supabase Hatası (Muhtemelen RLS ayarları eksik): " + error.message);
  }
  return error ? null : data;
}

async function updateSaha(id, updates) {
  const { error } = await sb.from('sahalar').update({
    ad: updates.ad,
    sehir: updates.sehir,
    ilce: updates.ilce,
    adres: updates.adres,
    wp: updates.wp,
    default_fiyat: updates.defaultFiyat,
    access_code: updates.accessCode
  }).eq('id', id);

  return !error;
}

async function deleteSaha(id) {
  const { error } = await sb.from('sahalar').delete().eq('id', id);
  return !error;
}

function checkSuperAdminPin(pin) {
  return MASTER_PIN === pin;
}
