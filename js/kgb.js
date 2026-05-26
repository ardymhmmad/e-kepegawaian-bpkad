// ═══════════════════════════════════════════════════
// SK KGB — Cetak Surat Keputusan Kenaikan Gaji Berkala
// ═══════════════════════════════════════════════════

// Tabel gaji pokok PNS (PP No.5/2024) — Golongan: [masa_kerja_0, masa_kerja_2, ... masa_kerja_32]
// Format: GAJI_PNS[golongan][masa_kerja_tahun] = gaji_pokok
const GAJI_PNS = {
  // Golongan I — MKG: 0,2,4,6,8,10,12,14,16,18,20,22,24,26 (± sesuai tabel)
  'I/a':  {0:1685700,2:1738800,4:1793500,6:1850000,8:1908300,10:1968400,12:2030400,14:2094300,16:2160300,18:2228500,20:2298500,22:2370900,24:2445500,26:2522600,28:2522600},
  'I/b':  {3:1840800,5:1898800,7:1958600,9:2020300,11:2083900,13:2149600,15:2217300,17:2287100,19:2359100,21:2433400,23:2510100,25:2589100,27:2670700},
  'I/c':  {3:1918700,5:1979100,7:2041500,9:2105800,11:2172100,13:2240500,15:2311100,17:2383900,19:2458900,21:2536400,23:2616300,25:2698700,27:2783700},
  'I/d':  {3:1999300,5:2062900,7:2127800,9:2194800,11:2264000,13:2335300,15:2408800,17:2484700,19:2562900,21:2643700,23:2726900,25:2812800,27:2901400},
  // Golongan II — MKG: 0,1,3,5,7,...33
  'II/a': {0:2184000,1:2218400,3:2288200,5:2360300,7:2434600,9:2511300,11:2590400,13:2672000,15:2756200,17:2843000,19:2932500,21:3024900,23:3120100,25:3218400,27:3319800,29:3424300,31:3532200,33:3643400},
  'II/b': {3:2385000,5:2460100,7:2537600,9:2617500,11:2700000,13:2785000,15:2872700,17:2963200,19:3056500,21:3152800,23:3252100,25:3354500,27:3460200,29:3569200,31:3681600,33:3797500},
  'II/c': {3:2485900,5:2564200,7:2645000,9:2728300,11:2814200,13:2902800,15:2994300,17:3088600,19:3185800,21:3286200,23:3389700,25:3496400,27:3606500,29:3720100,31:3837300,33:3958200},
  'II/d': {3:2591100,5:2672700,7:2756800,9:2843700,11:2933200,13:3025600,15:3120900,17:3219200,19:3320600,21:3425200,23:3533100,25:3644300,27:3759100,29:3877500,31:3999600,33:4125600},
  // Golongan III — MKG: 0,2,4,6,...32
  'III/a':{0:2785700,2:2873500,4:2964000,6:3057300,8:3153600,10:3252900,12:3355400,14:3461100,16:3570100,18:3682500,20:3798500,22:3918100,24:4041500,26:4168800,28:4300100,30:4435500,32:4575200},
  'III/b':{0:2903600,2:2995000,4:3089300,6:3186600,8:3287000,10:3390500,12:3497300,14:3607500,16:3721100,18:3838300,20:3959200,22:4083900,24:4212500,26:4345100,28:4482000,30:4623200,32:4768800},
  'III/c':{0:3026400,2:3121700,4:3220000,6:3321400,8:3426000,10:3533900,12:3645200,14:3760100,16:3878500,18:4000600,20:4126600,22:4256600,24:4390700,26:4528900,28:4671600,30:4818700,32:4970500},
  'III/d':{0:3154400,2:3253700,4:3356200,6:3461900,8:3571000,10:3683400,12:3799400,14:3919100,16:4042500,18:4169900,20:4301200,22:4436700,24:4576400,26:4720500,28:4869200,30:5022500,32:5180700},
  // Golongan IV — MKG: 0,2,4,6,...32
  'IV/a': {0:3287800,2:3391400,4:3498200,6:3608400,8:3722000,10:3839200,12:3960200,14:4084900,16:4213500,18:4346200,20:4483100,22:4624300,24:4770000,26:4920200,28:5075200,30:5235000,32:5399900},
  'IV/b': {0:3426900,2:3534800,4:3646200,6:3761000,8:3879500,10:4001600,12:4127700,14:4257700,16:4391800,18:4530100,20:4672800,22:4819900,24:4971700,26:5128300,28:5289800,30:5456400,32:5628300},
  'IV/c': {0:3571900,2:3684400,4:3800400,6:3920100,8:4043600,10:4170900,12:4302300,14:4437800,16:4577500,18:4721700,20:4870400,22:5023800,24:5182000,26:5345200,28:5513600,30:5687200,32:5866400},
  'IV/d': {0:3723000,2:3840200,4:3961200,6:4085900,8:4214600,10:4347300,12:4484300,14:4625500,16:4771200,18:4921400,20:5076400,22:5236300,24:5401200,26:5571400,28:5746800,30:5927800,32:6114500},
  'IV/e': {0:3880400,2:4002700,4:4128700,6:4258700,8:4392900,10:4531200,12:4673900,14:4821100,16:4973000,18:5129600,20:5291200,22:5457800,24:5629700,26:5807000,28:5989900,30:6178600,32:6373200},
};

// Ambil golongan singkat dari pangkat (misal "Penata Tingkat I (III/d)" → "III/d")
function getGolonganSingkat(pangkat){
  if(!pangkat) return '';
  const m = pangkat.match(/\(([IVX]+\/[a-e])\)/i);
  return m ? m[1] : pangkat;
}

// Ambil gaji dari tabel berdasarkan golongan + masa kerja
// Gol I/a     : MKG 0,2,4,...26
// Gol I/b,c,d : MKG 3,5,7,...27
// Gol II/a    : MKG 0,1,3,5,...33
// Gol II/b,c,d: MKG 3,5,7,...33
// Gol III,IV  : MKG 0,2,4,...32
const _GOL_IIA    = ['II/a'];
const _GOL_II_BCD = ['II/b','II/c','II/d'];
const _GOL_I_BCD  = ['I/b','I/c','I/d'];
const _MK_IA      = [0,2,4,6,8,10,12,14,16,18,20,22,24,26];
const _MK_I_BCD   = [3,5,7,9,11,13,15,17,19,21,23,25,27];
const _MK_IIA     = [0,1,3,5,7,9,11,13,15,17,19,21,23,25,27,29,31,33];
const _MK_II_BCD  = [3,5,7,9,11,13,15,17,19,21,23,25,27,29,31,33];
const _MK_STD     = [0,2,4,6,8,10,12,14,16,18,20,22,24,26,28,30,32];

function getMKList(gol){
  if(gol === 'I/a')              return _MK_IA;
  if(_GOL_I_BCD.includes(gol))  return _MK_I_BCD;
  if(_GOL_IIA.includes(gol))    return _MK_IIA;
  if(_GOL_II_BCD.includes(gol)) return _MK_II_BCD;
  return _MK_STD;
}

function getNearestMK(gol, mk){
  const list = getMKList(gol);
  const maxMK = list[list.length-1];
  const capped = Math.min(mk||0, maxMK);
  let nearest = list[0];
  for(const m of list){ if(m <= capped) nearest = m; else break; }
  return nearest;
}

function getGajiPokok(pangkat, masa_kerja_tahun){
  const gol = getGolonganSingkat(pangkat);
  const mk  = getNearestMK(gol, masa_kerja_tahun||0);

  // 1. Coba dari DB (diisi di Pengaturan)
  if(typeof TABEL_GAJI_PNS !== 'undefined' && TABEL_GAJI_PNS && TABEL_GAJI_PNS[gol]){
    const val = TABEL_GAJI_PNS[gol][mk] || TABEL_GAJI_PNS[gol][0] || 0;
    if(val > 0) return val;
  }

  // 2. Fallback ke hardcode GAJI_PNS
  const tabel = GAJI_PNS[gol];
  if(!tabel) return 0;
  return tabel[mk] || tabel[0] || 0;
}

// Format tanggal Indonesia lengkap
function fmtTglIndo(d){
  if(!d) return '...........';
  const dt = d instanceof Date ? d : new Date(d+'T00:00:00');
  const bln=['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  return `${dt.getDate()} ${bln[dt.getMonth()]} ${dt.getFullYear()}`;
}

function fmtTglIndoStr(str){
  if(!str) return '...........';
  const [y,m,d] = str.split('-').map(Number);
  return fmtTglIndo(new Date(y,m-1,d));
}

// ── Dialog konfirmasi sebelum cetak ─────────────────────
function cetakSKKGB(id){
  const a = DB.asn.find(x=>x.id===id);
  if(!a){ showToast('Data ASN tidak ditemukan','error'); return; }

  const k = calcKGB(a);
  const tglLahir = tglLahirDariNIP(a.nip);
  const tglLahirStr = tglLahir ? fmtTglIndo(tglLahir) : '...........';
  const gol = getGolonganSingkat(a.pangkat);

  // Masa kerja lama dari DB
  const mkLamaTh = parseInt(a.masa_kerja_tahun)||0;
  const mkLamaBl = parseInt(a.masa_kerja_bulan)||0;

  // Masa kerja baru = +2 tahun
  let mkBaruTh = mkLamaTh + 2;
  let mkBaruBl = mkLamaBl;
  if(mkBaruBl >= 12){ mkBaruTh++; mkBaruBl -= 12; }

  // Gaji lama & baru
  const gajiLama = parseInt(a.gaji)||0;
  const gajiBaru = getGajiPokok(a.pangkat, mkBaruTh);

  // Tanggal penetapan = TMT KGB berikutnya
  const tglPenetapan = a.tmt_kgb ? (()=>{
    const [y,m,d] = a.tmt_kgb.split('-').map(Number);
    const next = new Date(y+2,m-1,d);
    return next.getFullYear()+'-'+String(next.getMonth()+1).padStart(2,'0')+'-'+String(next.getDate()).padStart(2,'0');
  })() : '';

  // KGB berikutnya = +2 tahun dari penetapan
  const tglKGBBerikutnya = tglPenetapan ? (()=>{
    const [y,m,d] = tglPenetapan.split('-').map(Number);
    const next = new Date(y+2,m-1,d);
    return next.getFullYear()+'-'+String(next.getMonth()+1).padStart(2,'0')+'-'+String(next.getDate()).padStart(2,'0');
  })() : '';

  // Data SK sebelumnya dari ASN
  const noSkSblm  = a.no_sk_kgb_sebelumnya  || '';
  const tglSkSblm = a.tgl_sk_kgb_sebelumnya || '';
  // Konversi YYYY-MM-DD → "1 Januari 2023"
  const tglSkSblmIndo = tglSkSblm ? fmtTglIndoStr(tglSkSblm) : '';
  // Format gabung untuk tampil di form: "1 Januari 2023 / No.XXX"
  const tglNomorSblmDefault = tglSkSblmIndo && noSkSblm
    ? tglSkSblmIndo + ' / ' + noSkSblm
    : tglSkSblmIndo || noSkSblm || '';

  // Tanggal surat = hari ini
  const today = new Date();
  const todayStr = today.getFullYear()+'-'+String(today.getMonth()+1).padStart(2,'0')+'-'+String(today.getDate()).padStart(2,'0');

  document.getElementById('modal-title').textContent = '🖨 Konfirmasi Data SK KGB';
  document.getElementById('modal-box').style.maxWidth = '560px';
  document.getElementById('modal-body').innerHTML = `
    <div style="font-size:12px;color:var(--tx2);margin-bottom:14px;background:var(--primary-bg);padding:10px 12px;border-radius:8px">
      <strong>${a.nama}</strong> — ${a.nip}<br>
      <span style="font-size:11px">${a.pangkat} · ${a.unit}</span>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <div class="fg">
        <label>Tanggal Surat</label>
        <input type="date" id="sk-tgl-surat" value="${todayStr}">
      </div>
      <div class="fg">
        <label>Nomor Surat</label>
        <input type="text" id="sk-nomor" placeholder="cth: 145" style="font-family:monospace">
        <div style="font-size:10px;color:var(--tx3)">800.1.1.1.13/<strong>NOMOR</strong>//BPKAD/${today.getFullYear()}</div>
      </div>
      <div class="fg">
        <label>Tanggal SK Sebelumnya</label>
        <input type="date" id="sk-tgl-sblm-date" value="${tglSkSblm||''}">
      </div>
      <div class="fg">
        <label>Nomor SK Sebelumnya</label>
        <input type="text" id="sk-no-sblm" value="${noSkSblm}" placeholder="cth: 800.1.1.1.13/045//BPKAD/2023">
      </div>
      <div class="fg">
        <label>TMT KGB Sebelumnya</label>
        <input type="date" id="sk-tmt-sblm" value="${a.tmt_kgb||''}">
      </div>
      <div class="fg">
        <label>Masa Kerja Sebelumnya</label>
        <div style="display:flex;gap:6px">
          <input type="number" id="sk-mk-lama-th" value="${mkLamaTh}" min="0" max="40" style="width:70px"> <span style="padding-top:8px;font-size:12px">Thn</span>
          <input type="number" id="sk-mk-lama-bl" value="${mkLamaBl}" min="0" max="11" style="width:70px"> <span style="padding-top:8px;font-size:12px">Bln</span>
        </div>
      </div>
      <div class="fg">
        <label>Gaji Pokok Lama (Rp)</label>
        <input type="number" id="sk-gaji-lama" value="${gajiLama}">
      </div>
      <div class="fg">
        <label>Masa Kerja Baru</label>
        <div style="display:flex;gap:6px">
          <input type="number" id="sk-mk-baru-th" value="${mkBaruTh}" min="0" max="40" style="width:70px"> <span style="padding-top:8px;font-size:12px">Thn</span>
          <input type="number" id="sk-mk-baru-bl" value="${mkBaruBl}" min="0" max="11" style="width:70px"> <span style="padding-top:8px;font-size:12px">Bln</span>
        </div>
      </div>
      <div class="fg">
        <label>Gaji Pokok Baru (Rp) <span style="font-size:10px;color:var(--tx3)">otomatis</span></label>
        <input type="number" id="sk-gaji-baru" value="${gajiBaru}">
        <div style="font-size:10px;color:var(--tx3)">Tabel BKN: Gol ${gol}, MK ${mkBaruTh} th</div>
      </div>
      <div class="fg">
        <label>Tanggal Penetapan (TMT berlaku)</label>
        <input type="date" id="sk-tgl-penetapan" value="${tglPenetapan}">
      </div>
      <div class="fg">
        <label>KGB Berikutnya</label>
        <input type="date" id="sk-tgl-berikutnya" value="${tglKGBBerikutnya}">
      </div>
    </div>`;

  document.getElementById('modal-footer').innerHTML = `
    <button class="btn" onclick="closeModal()">Batal</button>
    <button class="btn btn-primary" onclick="eksekusiCetakSKKGB('${id}','ttd')">🖨 TTD Biasa (Cetak)</button>
    <button class="btn btn-success" onclick="eksekusiCetakSKKGB('${id}','tte')" title="Kirim ke Admin TTE via WhatsApp">📲 TTE (Kirim WA)</button>`;
  document.getElementById('modal').style.display='flex';

  // Sinkron gaji baru saat masa kerja baru berubah
  ['sk-mk-baru-th','sk-mk-baru-bl'].forEach(elId=>{
    document.getElementById(elId)?.addEventListener('input', ()=>{
      const mth = parseInt(document.getElementById('sk-mk-baru-th')?.value)||0;
      const gb  = getGajiPokok(a.pangkat, mth);
      const el  = document.getElementById('sk-gaji-baru');
      if(el) el.value = gb;
    });
  });
}

function eksekusiCetakSKKGB(id, mode='ttd'){
  const a = DB.asn.find(x=>x.id===id);
  if(!a) return;

  // Validasi TTE sebelum tutup modal
  if(mode==='tte'){
    if(!FONNTE_TOKEN){ showToast('Token Fonnte belum diisi di Pengaturan','error'); return; }
    if(!WA_ADMIN_TTE){ showToast('Nomor WA Admin TTE belum diisi di Pengaturan','error'); return; }
  }

  const tglSurat     = document.getElementById('sk-tgl-surat')?.value||'';
  const nomor        = (document.getElementById('sk-nomor')?.value||'').trim();
  const _tglSblmDate = document.getElementById('sk-tgl-sblm-date')?.value||'';
  const _noSblm      = (document.getElementById('sk-no-sblm')?.value||'').trim();
  const tglNomorSblm = (_tglSblmDate ? fmtTglIndoStr(_tglSblmDate) : '')
    + (_tglSblmDate && _noSblm ? ' / ' : '')
    + (_noSblm ? 'No. '+_noSblm : '');
  const tmtSblm      = document.getElementById('sk-tmt-sblm')?.value||'';
  const mkLamaTh     = parseInt(document.getElementById('sk-mk-lama-th')?.value)||0;
  const mkLamaBl     = parseInt(document.getElementById('sk-mk-lama-bl')?.value)||0;
  const gajiLama     = parseInt(document.getElementById('sk-gaji-lama')?.value)||0;
  const mkBaruTh     = parseInt(document.getElementById('sk-mk-baru-th')?.value)||0;
  const mkBaruBl     = parseInt(document.getElementById('sk-mk-baru-bl')?.value)||0;
  const gajiBaru     = parseInt(document.getElementById('sk-gaji-baru')?.value)||0;
  const tglPenetapan = document.getElementById('sk-tgl-penetapan')?.value||'';
  const tglBerikutnya= document.getElementById('sk-tgl-berikutnya')?.value||'';

  if(!nomor){ showToast('Nomor surat wajib diisi','error'); return; }

  const tglLahir  = tglLahirDariNIP(a.nip);
  const gol       = getGolonganSingkat(a.pangkat);
  const [y]       = (tglSurat||new Date().toISOString().slice(0,10)).split('-');

  const nomorFull = `800.1.1.1.13/${nomor}//BPKAD/${y}`;
  const mkLamaStr = `${mkLamaTh} Tahun ${mkLamaBl} Bulan`;
  const mkBaruStr = `${mkBaruTh} Tahun ${mkBaruBl} Bulan`;

  // Untuk TTE: nama, NIP, pangkat dikosongkan
  const _nama    = mode==='tte' ? '' : a.nama;
  const _nip     = mode==='tte' ? '' : a.nip;
  const _pangkat = mode==='tte' ? '' : `${a.pangkat} / ${a.jabatan||'...'}`;
  const _hal     = mode==='tte' ? 'Kenaikan Gaji Berkala PNS' : `Kenaikan Gaji Berkala PNS a.n. ${a.nama}`;
  const _tembusan4 = mode==='tte' ? 'Sdr.' : `Sdr. ${a.nama}`;

  closeModal();

  // ── Render surat ke div print lalu panggil window.print() ──
  const el = document.getElementById('print-surat-kgb');
  if(!el){ showToast('Element print tidak ditemukan','error'); return; }

  // Sembunyikan print-surat biasa agar tidak bentrok
  const elSurat = document.getElementById('print-surat');
  if(elSurat) elSurat.innerHTML = '';

  el.innerHTML = `
  <div class="sk-kgb-print" id="sk-kgb-content" style="font-family:Arial,sans-serif;font-size:11pt;color:#000">

    <!-- KOP SURAT — sama persis dengan surat cuti -->
    <table style="width:100%;border-collapse:collapse;border:none;margin-bottom:4px">
      <tr style="border:none">
        <td style="width:130px;text-align:center;vertical-align:middle;border:none">
          ${_logoData
            ? `<img src="${_logoData}" style="width:105px;height:105px;object-fit:contain">`
            : `<div style="width:68px;height:68px;border:1px solid #000;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;text-align:center">LOGO</div>`}
        </td>
        <td style="text-align:center;vertical-align:middle;padding:0 8px;border:none">
          <div class="kop-instansi-1" style="font-weight:700;color:#000">PEMERINTAH PROVINSI KALIMANTAN SELATAN</div>
          <div class="kop-instansi-2" style="font-weight:700;color:#000">BADAN PENGELOLAAN KEUANGAN</div>
          <div class="kop-instansi-2" style="font-weight:700;color:#000">DAN ASET DAERAH</div>
          <div class="kop-alamat" style="color:#000">Jl. Raya Dharma Praja, Banjarbaru Kalimantan Selatan</div>
          <div class="kop-alamat" style="color:#000">(Kawasan Perkantoran Pemerintah Provinsi Kalsel)</div>
          <div class="kop-alamat" style="color:#000">Laman : https://bpkad.kalselprov.go.id,&nbsp; Pos-el : bpkad@kalselprov.go.id</div>
        </td>
      </tr>
    </table>
    <hr style="border:none;border-top:3px solid #000;margin:2px 0">
    <hr style="border:none;border-top:1px solid #000;margin:2px 0 10px">

    <!-- TANGGAL rata kanan -->
    <div style="text-align:right;margin-bottom:6pt">Banjarbaru, ${fmtTglIndoStr(tglSurat)}</div>

    <!-- NOMOR & HAL -->
    <table style="width:100%;border-collapse:collapse;border:none;margin-bottom:10pt">
      <tr>
        <td style="width:90px;border:none;padding:2px 0">Nomor</td>
        <td style="width:12px;border:none;padding:2px 0">:</td>
        <td style="border:none;padding:2px 0">${nomorFull}</td>
      </tr>
      <tr>
        <td style="border:none;padding:2px 0">Sifat</td>
        <td style="border:none;padding:2px 0">:</td>
        <td style="border:none;padding:2px 0">Biasa</td>
      </tr>
      <tr>
        <td style="border:none;padding:2px 0">Lampiran</td>
        <td style="border:none;padding:2px 0">:</td>
        <td style="border:none;padding:2px 0">-</td>
      </tr>
      <tr>
        <td style="border:none;padding:2px 0;vertical-align:top">Hal</td>
        <td style="border:none;padding:2px 0;vertical-align:top">:</td>
        <td style="border:none;padding:2px 0">${_hal}</td>
      </tr>
    </table>

    <!-- TUJUAN -->
    <table style="width:100%;border-collapse:collapse;border:none;margin-bottom:12pt">
      <tr>
        <td style="width:30px;vertical-align:top;border:none;padding:2px 0">Yth.</td>
        <td style="border:none;padding:2px 0">Kepala Badan Pengelolaan Keuangan dan Aset Daerah Provinsi Kalimantan Selatan</td>
      </tr>
      <tr>
        <td style="border:none;padding:2px 0"></td>
        <td style="border:none;padding:2px 0">u.p. Kepala Bidang Perbendaharaan, Akuntansi dan Pelaporan Keuangan Daerah</td>
      </tr>
      <tr>
        <td style="border:none;padding:2px 0"></td>
        <td style="border:none;padding:2px 0">di&nbsp;-</td>
      </tr>
      <tr>
        <td style="border:none;padding:0 0 8px 0"></td>
        <td style="border:none;padding:0 0 8px 30px">tempat</td>
      </tr>
    </table>

    <!-- ISI -->
    <p style="text-align:justify;margin-bottom:3pt;line-height:1.5;text-indent:30px">
      Dengan ini diberitahukan, bahwa berhubung dengan telah dipenuhinya masa kerja dan syarat lainnya kepada :
    </p>

    <table style="width:100%;border-collapse:collapse;border:none;margin-bottom:3pt">
      <tr>
        <td style="width:22px;vertical-align:top;border:none;padding:2px 0">1.</td>
        <td style="width:190px;vertical-align:top;border:none;padding:2px 0">Nama dan Tanggal Lahir</td>
        <td style="width:12px;vertical-align:top;border:none;padding:2px 0">:</td>
        <td style="vertical-align:top;border:none;padding:2px 0">
          <div style="display:flex;justify-content:space-between;gap:8px">
            <p>${_nama}</p>
            <span style="white-space:nowrap">(${tglLahir ? fmtTglIndo(tglLahir) : '...........'})</span>
          </div>
        </td>
      </tr>
      <tr>
        <td style="width:22px;vertical-align:top;border:none;padding:2px 0">2.</td>
        <td style="width:190px;vertical-align:top;border:none;padding:2px 0">NIP</td>
        <td style="width:12px;vertical-align:top;border:none;padding:2px 0">:</td>
        <td style="vertical-align:top;border:none;padding:2px 0">${_nip}</td>
      </tr>
      <tr>
        <td style="width:22px;vertical-align:top;border:none;padding:2px 0">3.</td>
        <td style="width:190px;vertical-align:top;border:none;padding:2px 0">Pangkat (Gol.ruang) / Jabatan</td>
        <td style="width:12px;vertical-align:top;border:none;padding:2px 0">:</td>
        <td style="vertical-align:top;border:none;padding:2px 0">${_pangkat}</td>
      </tr>
      <tr>
        <td style="width:22px;vertical-align:top;border:none;padding:2px 0">4.</td>
        <td style="width:190px;vertical-align:top;border:none;padding:2px 0">Kantor / Tempat</td>
        <td style="width:12px;vertical-align:top;border:none;padding:2px 0">:</td>
        <td style="vertical-align:top;border:none;padding:2px 0">Badan Pengelolaan Keuangan dan Aset Daerah Provinsi Kalimantan Selatan</td>
      </tr>
      <tr>
        <td style="width:22px;vertical-align:top;border:none;padding:2px 0">5.</td>
        <td style="width:190px;vertical-align:top;border:none;padding:2px 0">Gaji Pokok Lama</td>
        <td style="width:12px;vertical-align:top;border:none;padding:2px 0">:</td>
        <td style="vertical-align:top;border:none;padding:2px 0">Rp ${num(gajiLama)},-</td>
      </tr>
    </table>

    <p style="text-align:justify;margin-bottom:3pt;line-height:1.5;text-indent:30px">(atas dasar surat/keputusan terakhir tentang gaji/pangkat yang ditetapkan)</p>

    <table style="width:100%;border-collapse:collapse;border:none;margin-bottom:3pt">
      <tr>
        <td style="width:22px;vertical-align:top;border:none;padding:2px 0">a.</td>
        <td style="width:190px;vertical-align:top;border:none;padding:2px 0">Oleh Pejabat</td>
        <td style="width:12px;vertical-align:top;border:none;padding:2px 0">:</td>
        <td style="vertical-align:top;border:none;padding:2px 0">Gubernur Kalimantan Selatan</td>
      </tr>
      <tr>
        <td style="width:22px;vertical-align:top;border:none;padding:2px 0">b.</td>
        <td style="width:190px;vertical-align:top;border:none;padding:2px 0">Tanggal / Nomor</td>
        <td style="width:12px;vertical-align:top;border:none;padding:2px 0">:</td>
        <td style="vertical-align:top;border:none;padding:2px 0">${tglNomorSblm||'...........'}</td>
      </tr>
      <tr>
        <td style="width:22px;vertical-align:top;border:none;padding:2px 0">c.</td>
        <td style="width:190px;vertical-align:top;border:none;padding:2px 0">Terhitung mulai tanggal berlakunya gaji tersebut</td>
        <td style="width:12px;vertical-align:top;border:none;padding:2px 0">:</td>
        <td style="vertical-align:top;border:none;padding:2px 0">${fmtTglIndoStr(tmtSblm)}</td>
      </tr>
      <tr>
        <td style="width:22px;vertical-align:top;border:none;padding:2px 0">d.</td>
        <td style="width:190px;vertical-align:top;border:none;padding:2px 0">Masa Kerja Golongan</td>
        <td style="width:12px;vertical-align:top;border:none;padding:2px 0">:</td>
        <td style="vertical-align:top;border:none;padding:2px 0">${mkLamaStr}</td>
      </tr>
    </table>

    <p style="margin-bottom:3pt;line-height:1.5;text-indent:30px">Diberikan kenaikan gaji berkala hingga memperoleh :</p>

    <table style="width:100%;border-collapse:collapse;border:none;margin-bottom:3pt">
      <tr>
        <td style="width:22px;vertical-align:top;border:none;padding:2px 0">6.</td>
        <td style="width:190px;vertical-align:top;border:none;padding:2px 0">Gaji Pokok Baru</td>
        <td style="width:12px;vertical-align:top;border:none;padding:2px 0">:</td>
        <td style="vertical-align:top;border:none;padding:2px 0">Rp ${num(gajiBaru)},-</td>
      </tr>
      <tr>
        <td style="width:22px;vertical-align:top;border:none;padding:2px 0">7.</td>
        <td style="width:190px;vertical-align:top;border:none;padding:2px 0">Berdasarkan Masa Kerja</td>
        <td style="width:12px;vertical-align:top;border:none;padding:2px 0">:</td>
        <td style="vertical-align:top;border:none;padding:2px 0">${mkBaruStr}</td>
      </tr>
      <tr>
        <td style="width:22px;vertical-align:top;border:none;padding:2px 0">8.</td>
        <td style="width:190px;vertical-align:top;border:none;padding:2px 0">Dalam Golongan</td>
        <td style="width:12px;vertical-align:top;border:none;padding:2px 0">:</td>
        <td style="vertical-align:top;border:none;padding:2px 0">${gol}</td>
      </tr>
      <tr>
        <td style="width:22px;vertical-align:top;border:none;padding:2px 0">9.</td>
        <td style="width:190px;vertical-align:top;border:none;padding:2px 0">Terhitung Mulai Tanggal</td>
        <td style="width:12px;vertical-align:top;border:none;padding:2px 0">:</td>
        <td style="vertical-align:top;border:none;padding:2px 0">${fmtTglIndoStr(tglPenetapan)}</td>
      </tr>
      <tr>
        <td style="width:22px;vertical-align:top;border:none;padding:2px 0">10.</td>
        <td style="width:190px;vertical-align:top;border:none;padding:2px 0">Kenaikan Gaji Berkala Berikutnya</td>
        <td style="width:12px;vertical-align:top;border:none;padding:2px 0">:</td>
        <td style="vertical-align:top;border:none;padding:2px 0">${fmtTglIndoStr(tglBerikutnya)}</td>
      </tr>
    </table>

    <p style="text-align:justify;margin-bottom:3pt;line-height:1.5;text-indent:30px">
      Diharapkan agar sesuai dengan Peraturan Pemerintah yang berlaku dan Keputusan Presiden berikutnya, maka sesuai Anggaran Pendapatan dan Belanja Daerah tahun yang bersangkutan, kepada pegawai tersebut dapat dibayarkan penghasilannya berdasarkan gaji pokoknya yang baru.
    </p>

    <!-- TTD -->
    <table style="width:100%;border-collapse:collapse;border:none">
      <tr>
        <td style="width:49%;border:none"></td>
        <td style="border:none;vertical-align:top">
          <div style="display:flex;gap:0">
            <span style="min-width:40px">a.n.</span>
            <span>
            GUBERNUR KALIMANTAN SELATAN<br>
              KEPALA BADAN PENGELOLAAN<br>
              KEUANGAN DAN ASET DAERAH<br>
              PROVINSI KALIMANTAN SELATAN,<br>
<div style="height:80px"></div>
              H. Fatkhan, S.E., M.M<br>
              Pembina Tingkat I (IV/b) <br>
              NIP. 197505182010011001
            </span>
              
          </div>
          
        </td>
      </tr>
    </table>

    <!-- TEMBUSAN -->
    <div class="tembusan-text" style="margin-top:8pt">
      <div style="margin-bottom:3pt">Tembusan :</div>
      <div>1.&nbsp;&nbsp;Kepala Badan Kepegawaian Daerah Provisi Kalsel di Banjarbaru</div>
      <div>2.&nbsp;&nbsp;Kepala Cabang PT. Taspen Banjarmasin di Banjarmasin</div>
      <div>3.&nbsp;&nbsp;Bendaharawan Gaji PNS yang Bersangkutan</div>
      <div>4.&nbsp;&nbsp;${_tembusan4}</div>
    </div>

  </div>`;

  // Beri waktu browser render sebelum eksekusi
  setTimeout(async ()=>{
    if(mode === 'tte'){
      // ── Mode TTE: generate PDF SK → upload Supabase → kirim link via WA ──
      const pesan =
`📋 *PERMOHONAN TTE — SK KGB*

Kepada Yth. Admin TTE
Mohon dilakukan Tanda Tangan Elektronik untuk SK berikut:

👤 *Nama     :* ${a.nama}
🪪 *NIP      :* ${a.nip}
📂 *Pangkat  :* ${a.pangkat}
🏢 *Unit     :* ${a.unit}
📄 *Nomor SK :* ${nomorFull}
📅 *Tgl SK   :* ${fmtTglIndoStr(tglSurat)}
💰 *Gaji Baru:* Rp ${num(gajiBaru)}

Harap segera diproses. Terima kasih.
— E-Kepegawaian BPKAD`;

      showToast('⏳ Membuat PDF SK KGB...','info');
      try {
        const namaFile  = `SK_KGB_${a.nip}_${nomorFull.replace(/[^a-zA-Z0-9]/g,'_')}.pdf`;
        const pdfBase64 = await generatePdfBase64('sk-kgb-content');
        const ok        = await kirimWADenganFile(WA_ADMIN_TTE, pesan, pdfBase64, namaFile);
        if(ok){
          showToast('✅ SK KGB + link PDF berhasil dikirim ke Admin TTE','success');
        } else {
          await kirimWA(WA_ADMIN_TTE, pesan+'\n\n⚠️ _PDF gagal dikirim, mohon cetak manual._');
          showToast('⚠️ PDF gagal, pesan teks tetap terkirim','warning');
        }
      } catch(err){
        console.error('[TTE KGB]', err);
        await kirimWA(WA_ADMIN_TTE, pesan+'\n\n⚠️ _PDF gagal dibuat, mohon cetak manual._');
        showToast('⚠️ PDF gagal: '+err.message,'warning');
      }
      el.innerHTML = '';
      await logAudit(AUDIT_ACTION.SETTING, 'kgb', id,
        `Kirim SK KGB TTE — ${a.nama} (${nomorFull})`, null, null);
    } else {
      // ── Mode TTD Biasa: cetak langsung ──
      window.print();
      setTimeout(()=>{ el.innerHTML=''; }, 500);
    }
  }, 300);
}
