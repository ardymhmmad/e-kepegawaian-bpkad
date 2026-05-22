// ═══════════════════════════════════════════════════
// SK KGB — Cetak Surat Keputusan Kenaikan Gaji Berkala
// ═══════════════════════════════════════════════════

// Tabel gaji pokok PNS (PP No.5/2024) — Golongan: [masa_kerja_0, masa_kerja_2, ... masa_kerja_32]
// Format: GAJI_PNS[golongan][masa_kerja_tahun] = gaji_pokok
const GAJI_PNS = {
  'I/a':  {0:1685700,2:1736900,4:1789800,6:1844800,8:1901800,10:1960800,12:2022000,14:2085500,16:2151300,18:2219500,20:2290200,22:2363500,24:2439500,26:2518300,28:2599900,30:2684400,32:2771900},
  'I/b':  {0:1840800,2:1897200,4:1955400,6:2015800,8:2078200,10:2143000,12:2210200,14:2279900,16:2352100,18:2427000,20:2504700,22:2585100,24:2668500,26:2754900,28:2844400,30:2937100,32:3033000},
  'I/c':  {0:1918700,2:1976400,4:2036300,6:2098600,8:2163400,10:2230700,12:2300600,14:2373200,16:2448600,18:2526800,20:2607900,22:2692100,24:2779500,26:2870200,28:2964200,30:3061700,32:3162700},
  'I/d':  {0:1999300,2:2059300,4:2121400,6:2185900,8:2252800,10:2322200,12:2394200,14:2468800,16:2546200,18:2626500,20:2709800,22:2796300,24:2886000,26:2979100,28:3075700,30:3175900,32:3279800},
  'II/a': {0:2184000,2:2251200,4:2321000,6:2393300,8:2468300,10:2546000,12:2626600,14:2710200,16:2796800,18:2886600,20:2979700,22:3076200,24:3176200,26:3279800,28:3387200,30:3498500,32:3613900},
  'II/b': {0:2385000,2:2458100,4:2533900,6:2612400,8:2693800,10:2778100,12:2865500,14:2956200,16:3050100,18:3147400,20:3248200,22:3352700,24:3461000,26:3573200,28:3689500,30:3810000,32:3934900},
  'II/c': {0:2485600,2:2561600,4:2640400,6:2722000,8:2806800,10:2894700,12:2985900,14:3080700,16:3178900,18:3280900,20:3386700,22:3496600,24:3610600,26:3728900,28:3851500,30:3978900,32:4110600},
  'II/d': {0:2591100,2:2670400,4:2752600,6:2837800,8:2926100,10:3017700,12:3112700,14:3211200,16:3313400,18:3419200,20:3529100,22:3643200,24:3761500,26:3884200,28:4011600,30:4143800,32:4281100},
  'III/a':{0:2785700,2:2871500,4:2960300,6:3052100,8:3147200,10:3245600,12:3347400,14:3452800,16:3561900,18:3674700,20:3791600,22:3912600,24:4037900,26:4167700,28:4302200,30:4441700,32:4586200},
  'III/b':{0:2903600,2:2993000,4:3085500,6:3181200,8:3280200,10:3382700,12:3488900,14:3598800,16:3712500,18:3830200,20:3952000,22:4078200,24:4208900,26:4344300,28:4484700,30:4630200,32:4781100},
  'III/c':{0:3026100,2:3119900,4:3216900,6:3317200,8:3421000,10:3528400,12:3639600,14:3754700,16:3873900,18:3997300,20:4125100,22:4257500,24:4394700,26:4536800,28:4684100,30:4836800,32:4995200},
  'III/d':{0:3154600,2:3252800,4:3354400,6:3459600,8:3568500,10:3681200,12:3797900,14:3918700,16:4043900,18:4173500,20:4307700,22:4446700,24:4590700,26:4739900,28:4894600,30:5054900,32:5221200},
  'IV/a': {0:3287400,2:3390500,4:3497200,6:3607700,8:3722200,10:3840800,12:3963700,14:4091100,16:4223100,18:4359900,20:4501700,22:4648700,24:4801200,26:4959500,28:5123700,30:5294000,32:5470700},
  'IV/b': {0:3425200,2:3533000,4:3644600,6:3760100,8:3879800,10:4003800,12:4132400,14:4265800,16:4404100,18:4547600,20:4696400,22:4850700,24:5010800,26:5177000,28:5349500,30:5528800,32:5714900},
  'IV/c': {0:3568200,2:3681000,4:3797800,6:3918800,8:4044200,10:4174000,12:4308600,14:4448200,16:4593000,18:4743300,20:4899200,22:5061000,24:5229100,26:5403700,28:5585400,30:5773600,32:5968600},
  'IV/d': {0:3716300,2:3834300,4:3956400,6:4082900,8:4213800,10:4349400,12:4490000,14:4635800,16:4787100,18:4944200,20:5107300,22:5276700,24:5452800,26:5635900,28:5826400,30:6024500,32:6230500},
  'IV/e': {0:3870000,2:3993600,4:4121700,6:4254500,8:4392000,10:4534600,12:4682600,14:4836200,16:4995800,18:5161600,20:5334000,22:5513100,24:5699400,26:5893100,28:6094500,30:6304100,32:6521900},
};

// Ambil golongan singkat dari pangkat (misal "Penata Tingkat I (III/d)" → "III/d")
function getGolonganSingkat(pangkat){
  if(!pangkat) return '';
  const m = pangkat.match(/\(([IVX]+\/[a-e])\)/i);
  return m ? m[1] : pangkat;
}

// Ambil gaji dari tabel berdasarkan golongan + masa kerja
function getGajiPokok(pangkat, masa_kerja_tahun){
  const gol = getGolonganSingkat(pangkat);
  const tabel = GAJI_PNS[gol];
  if(!tabel) return 0;
  // Cari masa kerja yang cocok (kelipatan 2, ke bawah)
  const mk = Math.floor((masa_kerja_tahun||0) / 2) * 2;
  const key = Math.min(mk, 32);
  return tabel[key] || tabel[0] || 0;
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
        <label>Tanggal/Nomor SK Sebelumnya</label>
        <input type="text" id="sk-tgl-nomor-sblm" placeholder="cth: 01 Januari 2023 / No.XXX">
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
    <button class="btn btn-primary" onclick="eksekusiCetakSKKGB('${id}')">🖨 Cetak SK</button>`;
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

function eksekusiCetakSKKGB(id){
  const a = DB.asn.find(x=>x.id===id);
  if(!a) return;

  const tglSurat     = document.getElementById('sk-tgl-surat')?.value||'';
  const nomor        = (document.getElementById('sk-nomor')?.value||'').trim();
  const tglNomorSblm = (document.getElementById('sk-tgl-nomor-sblm')?.value||'').trim();
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

  closeModal();

  // ── Render surat ke div print lalu panggil window.print() ──
  const el = document.getElementById('print-surat-kgb');
  if(!el){ showToast('Element print tidak ditemukan','error'); return; }

  // Sembunyikan print-surat biasa agar tidak bentrok
  const elSurat = document.getElementById('print-surat');
  if(elSurat) elSurat.innerHTML = '';

  el.innerHTML = `
  <div class="sk-kgb-print" id="sk-kgb-content" style="font-family:'Times New Roman',serif;font-size:12pt;color:#000">

    <!-- KOP SURAT — sama persis dengan surat cuti -->
    <table style="width:100%;border-collapse:collapse;border:none;margin-bottom:4px">
      <tr style="border:none">
        <td style="width:130px;text-align:center;vertical-align:middle;border:none">
          ${_logoData
            ? `<img src="${_logoData}" style="width:105px;height:105px;object-fit:contain">`
            : `<div style="width:68px;height:68px;border:1px solid #000;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;text-align:center">LOGO</div>`}
        </td>
        <td style="text-align:center;vertical-align:middle;padding:0 8px;border:none">
          <div style="font-size:14pt;font-weight:700;color:#000">PEMERINTAH PROVINSI KALIMANTAN SELATAN</div>
          <div style="font-size:18pt;font-weight:700;color:#000">BADAN PENGELOLAAN KEUANGAN</div>
          <div style="font-size:18pt;font-weight:700;color:#000">DAN ASET DAERAH</div>
          <div style="font-size:10pt;color:#000">Jl. Raya Dharma Praja, Banjarbaru Kalimantan Selatan</div>
          <div style="font-size:10pt;color:#000">(Kawasan Perkantoran Pemerintah Provinsi Kalsel)</div>
          <div style="font-size:10pt;color:#000">Laman : https://bpkad.kalselprov.go.id,&nbsp; Pos-el : bpkad@kalselprov.go.id</div>
        </td>
      </tr>
    </table>
    <hr style="border:none;border-top:3px solid #000;margin:2px 0">
    <hr style="border:none;border-top:1px solid #000;margin:2px 0 10px">

    <!-- TANGGAL rata kanan -->
    <div style="text-align:right;margin-bottom:6pt">Banjarbaru, ${fmtTglIndoStr(tglSurat)}</div>

    <!-- NOMOR & HAL -->
    <table style="width:60%;border-collapse:collapse;border:none;margin-bottom:10pt">
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
        <td style="border:none;padding:2px 0"><strong>Kenaikan Gaji Berkala PNS a.n. ${a.nama}</strong></td>
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
        <td style="border:none;padding:2px 0">di -</td>
      </tr>
      <tr>
        <td style="border:none;padding:2px 0"></td>
        <td style="border:none;padding:2px 0"><u>tempat</u></td>
      </tr>
    </table>

    <!-- ISI -->
    <p style="text-align:justify;margin-bottom:10pt;line-height:1.5">
      Dengan ini diberitahukan, bahwa berhubung dengan telah dipenuhinya masa kerja dan syarat lainnya kepada :
    </p>

    <table style="width:100%;border-collapse:collapse;border:none;margin-bottom:8pt">
      <tr>
        <td style="width:24px;vertical-align:top;border:none;padding:2px 0">1.</td>
        <td style="width:200px;vertical-align:top;border:none;padding:2px 0">Nama dan Tanggal Lahir</td>
        <td style="width:14px;vertical-align:top;border:none;padding:2px 0">:</td>
        <td style="border:none;padding:2px 0"><strong>${a.nama}</strong>&nbsp;&nbsp;(${tglLahir ? fmtTglIndo(tglLahir) : '...........'})</td>
      </tr>
      <tr>
        <td style="border:none;padding:2px 0">2.</td><td style="border:none;padding:2px 0">NIP</td><td style="border:none;padding:2px 0">:</td>
        <td style="border:none;padding:2px 0">${a.nip}</td>
      </tr>
      <tr>
        <td style="border:none;padding:2px 0">3.</td><td style="border:none;padding:2px 0">Pangkat (Gol.ruang) / Jabatan</td><td style="border:none;padding:2px 0">:</td>
        <td style="border:none;padding:2px 0">${a.pangkat} / ${a.jabatan||'...'}</td>
      </tr>
      <tr>
        <td style="border:none;padding:2px 0">4.</td><td style="border:none;padding:2px 0">Kantor / Tempat</td><td style="border:none;padding:2px 0">:</td>
        <td style="border:none;padding:2px 0">Badan Pengelolaan Keuangan dan Aset Daerah Provinsi Kalimantan Selatan</td>
      </tr>
      <tr>
        <td style="border:none;padding:2px 0">5.</td><td style="border:none;padding:2px 0">Gaji Pokok Lama</td><td style="border:none;padding:2px 0">:</td>
        <td style="border:none;padding:2px 0">Rp ${num(gajiLama)},-</td>
      </tr>
    </table>

    <p style="text-align:justify;margin-bottom:6pt;line-height:1.5">(atas dasar surat/keputusan terakhir tentang gaji/pangkat yang ditetapkan)</p>

    <table style="width:100%;border-collapse:collapse;border:none;margin-bottom:12pt">
      <tr>
        <td style="width:24px;border:none;padding:2px 0">a.</td>
        <td style="width:200px;border:none;padding:2px 0">Oleh Pejabat</td>
        <td style="width:14px;border:none;padding:2px 0">:</td>
        <td style="border:none;padding:2px 0">Gubernur Kalimantan Selatan</td>
      </tr>
      <tr>
        <td style="border:none;padding:2px 0">b.</td><td style="border:none;padding:2px 0">Tanggal / Nomor</td><td style="border:none;padding:2px 0">:</td>
        <td style="border:none;padding:2px 0">${tglNomorSblm||'...........'}</td>
      </tr>
      <tr>
        <td style="border:none;padding:2px 0">c.</td><td style="border:none;padding:2px 0">Terhitung mulai tanggal berlakunya gaji tersebut</td><td style="border:none;padding:2px 0">:</td>
        <td style="border:none;padding:2px 0">${fmtTglIndoStr(tmtSblm)}</td>
      </tr>
      <tr>
        <td style="border:none;padding:2px 0">d.</td><td style="border:none;padding:2px 0">Masa Kerja Golongan</td><td style="border:none;padding:2px 0">:</td>
        <td style="border:none;padding:2px 0">${mkLamaStr}</td>
      </tr>
    </table>

    <p style="margin-bottom:10pt;line-height:1.5">Diberikan kenaikan gaji berkala hingga memperoleh :</p>

    <table style="width:100%;border-collapse:collapse;border:none;margin-bottom:16pt">
      <tr>
        <td style="width:24px;border:none;padding:2px 0">6.</td>
        <td style="width:200px;border:none;padding:2px 0">Gaji Pokok Baru</td>
        <td style="width:14px;border:none;padding:2px 0">:</td>
        <td style="border:none;padding:2px 0"><strong>Rp ${num(gajiBaru)},-</strong></td>
      </tr>
      <tr>
        <td style="border:none;padding:2px 0">7.</td><td style="border:none;padding:2px 0">Berdasarkan Masa Kerja</td><td style="border:none;padding:2px 0">:</td>
        <td style="border:none;padding:2px 0">${mkBaruStr}</td>
      </tr>
      <tr>
        <td style="border:none;padding:2px 0">8.</td><td style="border:none;padding:2px 0">Dalam Golongan</td><td style="border:none;padding:2px 0">:</td>
        <td style="border:none;padding:2px 0">${gol}</td>
      </tr>
      <tr>
        <td style="border:none;padding:2px 0">9.</td><td style="border:none;padding:2px 0">Terhitung Mulai Tanggal</td><td style="border:none;padding:2px 0">:</td>
        <td style="border:none;padding:2px 0">${fmtTglIndoStr(tglPenetapan)}</td>
      </tr>
      <tr>
        <td style="border:none;padding:2px 0">10.</td><td style="border:none;padding:2px 0">Kenaikan Gaji Berkala Berikutnya</td><td style="border:none;padding:2px 0">:</td>
        <td style="border:none;padding:2px 0">${fmtTglIndoStr(tglBerikutnya)}</td>
      </tr>
    </table>

    <p style="text-align:justify;margin-bottom:20pt;line-height:1.5">
      Diharapkan agar sesuai dengan Peraturan Pemerintah yang berlaku dan Keputusan Presiden berikutnya, maka sesuai Anggaran Pendapatan dan Belanja Daerah tahun yang bersangkutan, kepada pegawai tersebut dapat dibayarkan penghasilannya berdasarkan gaji pokoknya yang baru.
    </p>

    <!-- TTD -->
    <table style="width:100%;border-collapse:collapse;border:none">
      <tr>
        <td style="width:55%;border:none"></td>
        <td style="border:none;vertical-align:top">
          <div>a.n. GUBERNUR KALIMANTAN SELATAN</div>
          <div>KEPALA BADAN PENGELOLAAN KEUANGAN</div>
          <div>DAN ASET DAERAH</div>
          <div>PROVINSI KALIMANTAN SELATAN,</div>
          <div style="margin-top:55pt">&nbsp;</div>
        </td>
      </tr>
    </table>

    <!-- TEMBUSAN -->
    <div style="font-size:9pt;margin-top:8pt">
      <div style="margin-bottom:3pt">Tembusan :</div>
      <div>1.&nbsp;&nbsp;Kepala Badan Kepegawaian Daerah Provisi Kalsel di Banjarbaru</div>
      <div>2.&nbsp;&nbsp;Kepala Cabang PT. Taspen Banjarmasin di Banjarmasin</div>
      <div>3.&nbsp;&nbsp;Bendaharawan Gaji PNS yang Bersangkutan</div>
      <div>4.&nbsp;&nbsp;Sdr. ${a.nama}</div>
    </div>

  </div>`;

  // Beri waktu browser render sebelum print
  setTimeout(()=>{
    window.print();
    // Kosongkan setelah print
    setTimeout(()=>{ el.innerHTML=''; }, 500);
  }, 300);
}
