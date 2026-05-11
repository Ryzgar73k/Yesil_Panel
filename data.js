// =============================
// YESIL PANEL — Supabase Altyapısı
// =============================

const SUPABASE_URL = 'https://xualunumuphfunswjrodx.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh1YWx1bnVtcGhmdW5zd2pyb2R4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1Mjc0MDUsImV4cCI6MjA5NDEwMzQwNX0.BmnUx69s_ebyUrq3kO3cmV41ujv3xaTkvy8u9WWQ4bA';

const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const SAATLER = [
  '18:00','19:00','20:00','21:00','22:00','23:00','00:00'
];

const MASTER_PIN = '123456';

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

// --- Veri Fonksiyonları (ASYNC) ---

async function getSehirler() {
  const { data, error } = await supabase.from('sahalar').select('sehir');
  if (error) return [];
  return [...new Set(data.map(s => s.sehir))].sort();
}

async function getSahalarBySehir(sehir) {
  const { data, error } = await supabase.from('sahalar').select('*').eq('sehir', sehir);
  return error ? [] : data;
}

async function getSahaById(id) {
  const { data, error } = await supabase.from('sahalar').select('*').eq('id', id).single();
  return error ? null : data;
}

async function getSahaByAccessCode(code) {
  const { data, error } = await supabase.from('sahalar').select('*').eq('access_code', code).single();
  return error ? null : data;
}

async function getSlots(sahaId, tarih) {
  // Sahayı getir (fiyat için)
  const saha = await getSahaById(sahaId);
  if (!saha) return {};

  // Database'den dolu olanları veya özel fiyatlıları çek
  const { data, error } = await supabase
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
  const { error } = await supabase
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
  const { data, error } = await supabase.from('sahalar').insert({
    ad: sahaObj.ad,
    sehir: sahaObj.sehir,
    ilce: sahaObj.ilce,
    adres: sahaObj.adres,
    wp: sahaObj.wp,
    default_fiyat: sahaObj.defaultFiyat,
    access_code: sahaObj.accessCode || Math.floor(100000 + Math.random() * 900000).toString()
  }).select().single();

  return error ? null : data;
}

async function updateSaha(id, updates) {
  const { error } = await supabase.from('sahalar').update({
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
  const { error } = await supabase.from('sahalar').delete().eq('id', id);
  return !error;
}

function checkSuperAdminPin(pin) {
  return MASTER_PIN === pin;
}
