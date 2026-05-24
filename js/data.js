// ═══════════════════════════════════════════════════
// KP CALCULATION ENGINE
// ═══════════════════════════════════════════════════
function getMaxGol(pendidikan){
  return EDU_MAX[pendidikan]||'IV/e';
}
function nextGol(g){
  const i=GOL_LIST.indexOf(g);
  return i>=0&&i<GOL_LIST.length-1?GOL_LIST[i+1]:g;
}
function golIndex(g){ return GOL_LIST.indexOf(g); }
function calcKP(asn){
  const tmt=new Date(asn.tmt_pangkat);
  const today=new Date();
  const msPerYear=1000*60*60*24*365.25;
  const yearsElapsed=(today-tmt)/msPerYear;
  const maxGol=getMaxGol(asn.pendidikan);
  const curIdx=golIndex(asn.pangkat);
  const maxIdx=golIndex(maxGol);
  const atMax=curIdx>=maxIdx;

  // Date 4 years from TMT
  const dueDate=new Date(tmt);
  dueDate.setFullYear(dueDate.getFullYear()+4);
  const daysToKP=Math.ceil((dueDate-today)/(1000*60*60*24));
  const reminderDate=new Date(dueDate);
  reminderDate.setMonth(reminderDate.getMonth()-4);

  let status, keterangan, nextPangkat;
  if(atMax){
    // Max education — every 5 months if MS
    const due5m=new Date(tmt);
    due5m.setMonth(due5m.getMonth()+5);
    const days5m=Math.ceil((due5m-today)/(1000*60*60*24));
    nextPangkat=asn.pangkat;
    if(yearsElapsed>=4){
      status='Batas Pendidikan';
      keterangan=`Telah mencapai batas maksimal (${maxGol}) sesuai pendidikan ${asn.pendidikan}. Naik 1 tingkat tiap 5 bulan jika MS.`;
    } else {
      status='Batas Pendidikan';
      keterangan=`Golongan sudah di batas pendidikan ${asn.pendidikan} (maks ${maxGol}).`;
    }
  } else if(yearsElapsed>=4){
    status='Memenuhi Syarat';
    nextPangkat=nextGol(asn.pangkat);
    keterangan=`Telah memenuhi syarat 4 tahun dari TMT ${fmt(asn.tmt_pangkat)}. Dapat diusulkan ke ${nextPangkat}.`;
  } else if(daysToKP<=120){
    status='Mengingatkan';
    nextPangkat=nextGol(asn.pangkat);
    keterangan=`Jatuh tempo KP dalam ${daysToKP} hari (${fmtDate(dueDate)}). Siapkan berkas pengajuan ke ${nextPangkat}.`;
  } else {
    status='Belum Memenuhi Syarat';
    nextPangkat=nextGol(asn.pangkat);
    keterangan=`Belum mencapai 4 tahun. Jatuh tempo pada ${fmtDate(dueDate)} (${Math.abs(daysToKP)} hari lagi).`;
  }
  return { status, nextPangkat, dueDate, daysToKP, keterangan, maxGol };
}

// ═══════════════════════════════════════════════════
// KGB ENGINE
// ═══════════════════════════════════════════════════
function calcKGB(asn){
  const tmt=new Date(asn.tmt_kgb);
  const today=new Date();
  const due=new Date(tmt); due.setFullYear(due.getFullYear()+2);
  const daysToKGB=Math.ceil((due-today)/(1000*60*60*24));
  const gajiSkrg = (asn.gaji && asn.gaji > 0) ? parseInt(asn.gaji) : 0;
  let status;
  if(daysToKGB<0) status='Lewat Jatuh Tempo';
  else if(daysToKGB<=30) status='Segera';
  else status='Normal';
  return { due, daysToKGB, gajiSkrg, status };
}

// ═══════════════════════════════════════════════════
// PENSIUN ENGINE
// ═══════════════════════════════════════════════════

// ── Konfigurasi jenis cuti ─────────────────────────────────
// kurangiTahunan : apakah mengurangi sisa cuti tahunan
// bolehLebih     : apakah boleh melebihi jatah (tidak diblokir)
// hariKalender   : hitung hari kalender bukan hari kerja
const JENIS_CUTI_CONFIG = {
  'Cuti Tahunan'                      : { kurangiTahunan:true,  bolehLebih:false, hariKalender:false },
  'Cuti Sakit'                        : { kurangiTahunan:false, bolehLebih:true,  hariKalender:false },
  'Cuti Melahirkan'                   : { kurangiTahunan:false, bolehLebih:true,  hariKalender:true  },
  'Cuti Besar'                        : { kurangiTahunan:true,  bolehLebih:true,  hariKalender:false },
  'Cuti Alasan Penting'               : { kurangiTahunan:true,  bolehLebih:true,  hariKalender:false },
  'Cuti Di Luar Tanggungan Negara'    : { kurangiTahunan:false, bolehLebih:true,  hariKalender:false },
};

function hitungHariKalender(s, e){
  if(!s||!e) return 0;
  const parse = str => { const [y,m,d]=str.split('-').map(Number); return new Date(y,m-1,d,0,0,0); };
  const start=parse(s), end=parse(e);
  if(end<start) return 0;
  return Math.round((end-start)/(1000*60*60*24))+1;
}

function getCutiConfig(jenis){ return JENIS_CUTI_CONFIG[jenis] || JENIS_CUTI_CONFIG['Cuti Tahunan']; }

// Hitung hari kalender (inklusif)
function hitungHariKalender(s, e){
  if(!s||!e) return 0;
  const parse = str => { const [y,m,d]=str.split('-').map(Number); return new Date(y,m-1,d,0,0,0); };
  const start=parse(s), end=parse(e);
  if(end<start) return 0;
  return Math.round((end-start)/(1000*60*60*24))+1;
}

// Ekstrak tanggal lahir dari NIP (8 digit pertama: YYYYMMDD)
function tglLahirDariNIP(nip){
  if(!nip || nip.length < 8) return null;
  const s = String(nip).replace(/\s/g,'');
  const y = parseInt(s.substring(0,4));
  const m = parseInt(s.substring(4,6));
  const d = parseInt(s.substring(6,8));
  if(!y||!m||!d||m>12||d>31) return null;
  return new Date(y, m-1, d, 0,0,0);
}

function calcPensiun(asn){
  const tglLahir = tglLahirDariNIP(asn.nip);
  const batasUsia = parseInt(asn.batas_usia_pensiun) || 58;
  const today = new Date();

  if(!tglLahir) return {
    valid: false, tglLahir:null, tglPensiun:null, usia:null,
    sisaHari:null, sisaBulan:null,
    status:'Data Tidak Valid',
    keterangan:'NIP tidak valid atau batas usia belum diisi',
    batasUsia
  };

  // Pensiun = akhir bulan lahir + batasUsia tahun
  // Contoh: lahir 14-09-1967, batas 58 → pensiun 30-09-2025
  const tglPensiun = new Date(
    tglLahir.getFullYear() + batasUsia,  // tahun lahir + batas usia
    tglLahir.getMonth() + 1,             // bulan berikutnya (month+1)
    0                                    // hari ke-0 = hari terakhir bulan lahir
  );

  let usia = today.getFullYear() - tglLahir.getFullYear();
  const bulanDiff = today.getMonth() - tglLahir.getMonth();
  if(bulanDiff < 0 || (bulanDiff===0 && today.getDate() < tglLahir.getDate())) usia--;

  const msPerHari = 1000*60*60*24;
  const sisaHari  = Math.ceil((tglPensiun - today) / msPerHari);
  const sisaBulan = Math.ceil(sisaHari / 30.44);

  let status, keterangan;
  if(sisaHari <= 0){
    status = 'Segera Pensiun';
    keterangan = 'Telah mencapai batas usia pensiun per '+fmtDate(tglPensiun)+'. Segera proses berkas pensiun.';
  } else if(sisaHari <= 180){
    status = 'Segera Pensiun';
    keterangan = 'Akan pensiun dalam '+sisaHari+' hari lagi ('+fmtDate(tglPensiun)+'). Siapkan berkas pensiun.';
  } else {
    status = 'Aktif';
    keterangan = 'Pensiun pada '+fmtDate(tglPensiun)+' ('+sisaBulan+' bulan lagi).';
  }

  return { valid:true, tglLahir, tglPensiun, usia, sisaHari, sisaBulan, status, keterangan, batasUsia };
}

function pensiunBadge(status){
  if(status==='Segera Pensiun') return 'b-amber';
  if(status==='Aktif')          return 'b-green';
  return 'b-gray';
}

function terbilang(n){
  if(!n||n<=0) return 'nol';
  const sat=['','satu','dua','tiga','empat','lima','enam','tujuh','delapan','sembilan'];
  const bls=['','sepuluh','dua puluh','tiga puluh','empat puluh','lima puluh',
             'enam puluh','tujuh puluh','delapan puluh','sembilan puluh'];
  const bls11=['sebelas','dua belas','tiga belas','empat belas','lima belas',
               'enam belas','tujuh belas','delapan belas','sembilan belas'];
  if(n<=9)   return sat[n];
  if(n===10) return 'sepuluh';
  if(n<=19)  return bls11[n-11];
  if(n<100){
    const p=Math.floor(n/10), s=n%10;
    return bls[p]+(s?' '+sat[s]:'');
  }
