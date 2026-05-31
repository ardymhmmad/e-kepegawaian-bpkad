// ── Pensiun helpers ────────────────────────────────────────
// getFilters ada di helpers.js (sudah di-extend untuk pensiun/kp/kgb)

function refreshTablePensiun(){
  pageNums['pensiun']=1;
  renderPensiun(getFilters('pensiun'));
}

function filterPensiunStatus(status){
  const sel = document.getElementById('pensiun-status');
  if(sel) sel.value = status;
  refreshTablePensiun();
}


function exportExcelPensiun(){
  const data = (DB.asn||[]).map(a=>{
    const p = calcPensiun(a);
    return {
      'NIP': a.nip,
      'Nama ASN': a.nama,
      'Unit Kerja': a.unit,
      'Tgl Lahir': p.tglLahir ? fmtDate(p.tglLahir) : '—',
      'Usia (th)': p.usia??'—',
      'Batas Usia': p.batasUsia+' th',
      'Tgl Pensiun': p.tglPensiun ? fmtDate(p.tglPensiun) : '—',
      'Sisa Hari': p.sisaHari??'—',
      'Status': p.status,
      'Keterangan': p.keterangan
    };
  });
  if(!data.length){ showToast('Tidak ada data','error'); return; }
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Monitoring Pensiun');
  XLSX.writeFile(wb, 'monitoring_pensiun_'+new Date().getFullYear()+'.xlsx');
}

// ═══════════════════════════════════════════════════
// SEED DATA
// ═══════════════════════════════════════════════════
function seedData(){
  DB.asn=[];
  DB.pppk=[];
  DB.pjlp=[];
}

// ═══════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════
async function init(){
  DB={asn:[],pppk:[],pjlp:[],cuti:[],alokasi:{}};
  initAllFilters(); renderDashboard(); // skeleton segera

  // Load semua data paralel
  const [_,settingsRes,cutiRes,alokasiRes] = await Promise.all([
    loadFromServer(),
    supa.from('settings').select('setting_key,setting_val'),
    supa.from('cuti').select('*').order('created_at',{ascending:false}),
    supa.from('alokasi_cuti').select('*').eq('tahun',new Date().getFullYear()),
  ]);

  // Terapkan settings
  if(settingsRes.data){
    const cfg={}; settingsRes.data.forEach(r=>{ cfg[r.setting_key]=r.setting_val; });
    if(cfg.logo_path){ _logoData=cfg.logo_path; applyLogoEverywhere(cfg.logo_path); }
    if(cfg.def_alokasi_cuti)   DEF_ALOKASI=parseInt(cfg.def_alokasi_cuti)||12;
    if(cfg.carry_over_enabled) CARRY_OVER_ENABLED=cfg.carry_over_enabled==='1';
    if(cfg.carry_over_max)     CARRY_OVER_MAX=parseInt(cfg.carry_over_max)||999;
    if(cfg.fonnte_token)       FONNTE_TOKEN=cfg.fonnte_token;
    if(cfg.no_urut_cuti)       NO_URUT_CUTI=parseInt(cfg.no_urut_cuti)||1;
  }

  // Cache cuti
  if(cutiRes.data) DB.cuti=cutiRes.data;

  // Cache alokasi override
  if(alokasiRes.data){
    const yr=new Date().getFullYear();
    alokasiRes.data.forEach(r=>{
      if(!DB.alokasi[r.asn_id]) DB.alokasi[r.asn_id]={};
      DB.alokasi[r.asn_id][yr]={};
      if(r.alokasi!==null) DB.alokasi[r.asn_id][yr].alokasi=r.alokasi;
      if(r.carryover_override!==null) DB.alokasi[r.asn_id][yr].carryover_override=r.carryover_override;
    });
  }

  renderDashboard(); updateCutiBadge();
  await loadWATemplates();
  if(typeof loadTabelGaji === 'function') await loadTabelGaji();

  const tahunIni = new Date().getFullYear();
  await Promise.all([
    loadLiburNasional(tahunIni),
    loadLiburNasional(tahunIni + 1),
  ]);

  // Cek tabel audit trail
  if(typeof checkAuditTable === 'function') checkAuditTable();

  // Auto-update masa kerja golongan semua ASN berdasarkan TMT KGB
  autoUpdateMasaKerja();
}

// Update masa_kerja_tahun & masa_kerja_bulan semua ASN dari TMT KGB
async function autoUpdateMasaKerja(){
  try {
    const updates = DB.asn
      .filter(a => a.tmt_kgb)
      .map(a => {
        const mk = hitungMasaKerjaGolongan(a.tmt_kgb);
        return { id: a.id, tahun: mk.tahun, bulan: mk.bulan };
      })
      .filter(u => {
        const a = DB.asn.find(x=>x.id===u.id);
        return a && (a.masa_kerja_tahun !== u.tahun || a.masa_kerja_bulan !== u.bulan);
      });

    if(!updates.length) return;

    // Update secara batch (paralel, max 5 sekaligus)
    for(let i=0; i<updates.length; i+=5){
      const batch = updates.slice(i, i+5);
      await Promise.all(batch.map(u =>
        supa.from('asn').update({
          masa_kerja_tahun: u.tahun,
          masa_kerja_bulan: u.bulan
        }).eq('id', u.id)
      ));
    }

    // Reload data ASN setelah update
    await reloadType('asn');
    console.log(`[MKG] Auto-update ${updates.length} ASN selesai`);
  } catch(e){ console.warn('[MKG] autoUpdateMasaKerja error:', e.message); }
}
