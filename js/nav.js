// ═══════════════════════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════════════════════
const pageConfigs = {
  dashboard:{ title:'Dashboard', sub:'Data kepegawaian Badan Pengelolaan Keuangan dan Aset Daerah' },
  asn:{ title:'Data ASN', sub:'Aparatur Sipil Negara' },
  pppk:{ title:'PPPK Paruh Waktu', sub:'Pegawai Pemerintah dengan Perjanjian Kerja' },
  pjlp:{ title:'PJLP', sub:'Penyedia Jasa Lainnya Perorangan' },
  kp:{ title:'Kenaikan Pangkat', sub:'Kenaikan Pangkat — otomatis 4 tahun dari TMT' },
  kgb:{ title:'KGB', sub:'Interval 2 tahun dari TMT KGB' },
  detail:{ title:'Detail Pegawai', sub:'' },
  cuti:{ title:'Pengajuan Cuti', sub:'Pengajuan, validasi, dan persetujuan cuti pegawai ASN' },
  'alokasi-cuti':{ title:'Alokasi Cuti', sub:'Atur kuota hari cuti per pegawai (default & override)' },
  'cuti-detail':{ title:'Detail Pengajuan Cuti', sub:'' },
  settings:{ title:'Pengaturan', sub:'Konfigurasi logo, pengguna, dan sistem' },
  pensiun:{ title:'Monitoring Pensiun', sub:'Pemantauan batas usia pensiun ASN' }
};

function showPage(id, btn){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.ni').forEach(n=>n.classList.remove('active'));
  document.getElementById('page-'+id)?.classList.add('active');
  if(btn) btn.classList.add('active');
  currentPage = id;
  const cfg = pageConfigs[id]||{title:id,sub:''};
  document.getElementById('pt-title').textContent = cfg.title;
  document.getElementById('pt-sub').textContent = cfg.sub;
  buildTopbarActions(id);
  // Fade-in content
  const pg=document.getElementById('page-'+id);
  if(pg){ pg.style.opacity='0'; requestAnimationFrame(()=>{ pg.style.transition='opacity .22s ease'; pg.style.opacity='1'; }); }
  if(id==='dashboard')        renderDashboard();
  else if(id==='settings')    renderSettings();
  else if(id==='cuti')        renderCutiPage();
  else if(id==='alokasi-cuti') renderAlokasiPage();
  else if(id==='cuti-detail') { /* rendered by openCutiDetail */ }
  else if(id==='kp'){
    const uKP = document.getElementById('kp-f-unit');
    if(uKP && uKP.options.length <= 1) (UNITS||[]).forEach(u=>{ const o=document.createElement('option'); o.value=u; o.textContent=u; uKP.appendChild(o); });
    if(typeof DB!=='undefined' && DB.asn && DB.asn.length > 0){
      renderKP(getFilters('kp'));
    } else {
      const _t=setInterval(function(){ if(DB.asn && DB.asn.length>0){ clearInterval(_t); renderKP(getFilters('kp')); } },200);
      setTimeout(function(){ clearInterval(_t); renderKP(getFilters('kp')); },5000);
    }
  }
  else if(id==='kgb'){
    const uKGB = document.getElementById('kgb-f-unit');
    if(uKGB && uKGB.options.length <= 1) (UNITS||[]).forEach(u=>{ const o=document.createElement('option'); o.value=u; o.textContent=u; uKGB.appendChild(o); });
    if(typeof DB!=='undefined' && DB.asn && DB.asn.length > 0){
      renderKGB(getFilters('kgb'));
    } else {
      const _t=setInterval(function(){ if(DB.asn && DB.asn.length>0){ clearInterval(_t); renderKGB(getFilters('kgb')); } },200);
      setTimeout(function(){ clearInterval(_t); renderKGB(getFilters('kgb')); },5000);
    }
  }
  else if(id==='pensiun'){
    // Isi dropdown unit Pensiun jika belum
    const uPensiun = document.getElementById('pensiun-unit');
    if(uPensiun && uPensiun.options.length <= 1) (UNITS||[]).forEach(u=>{ const o=document.createElement('option'); o.value=u; o.textContent=u; uPensiun.appendChild(o); });
    // Pastikan DB.asn sudah terisi sebelum render
    if(typeof DB!=='undefined' && DB.asn && DB.asn.length > 0){
      renderPensiun(getFilters('pensiun'));
    } else {
      // Data belum siap — tunggu sebentar lalu render ulang
      const _tryRenderPensiun = setInterval(function(){
        if(typeof DB!=='undefined' && DB.asn && DB.asn.length > 0){
          clearInterval(_tryRenderPensiun);
          renderPensiun(getFilters('pensiun'));
        }
      }, 200);
      // Timeout 5 detik — render kosong daripada stuck
      setTimeout(function(){ clearInterval(_tryRenderPensiun); renderPensiun(getFilters('pensiun')); }, 5000);
    }
  }
  else refreshTable(id);
}

function buildTopbarActions(id){
  const ro = session?.role==='user';
  const act = document.getElementById('pt-actions');
  let h='';
  if(['asn','pppk','pjlp'].includes(id)){
    if(!ro) h+=`<button class="btn btn-primary always-allow" onclick="openImport('${id}')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>Import Excel</button>`;
    if(!ro) h+=`<button class="btn btn-success always-allow" onclick="openAddForm('${id}')">+ Tambah</button>`;
    h+=`<button class="btn" onclick="exportExcel('${id}')">Export Excel</button>`;
  } else if(id==='kp'||id==='kgb'){
    h+=`<button class="btn" onclick="exportExcel('${id}')">Export Excel</button>`;
  } else if(id==='pensiun'){
    h+=`<button class="btn" onclick="exportExcelPensiun()">Export Excel</button>`;
  } else if(id==='settings'){
    h='';
  } else if(id==='cuti'){
    if(!ro) h+=`<button class="btn btn-primary always-allow" onclick="openAjukanCuti()">+ Ajukan Cuti</button>`;
    h+=`<button class="btn" onclick="exportCutiExcel()">Export Excel</button>`;
    if(!ro) h+=`<button class="btn btn-danger always-allow" onclick="hapusCutiTerpilih()">🗑 Hapus Terpilih</button>`;
  } else if(id==='alokasi-cuti'){
    // no extra buttons needed
  }
  act.innerHTML=h;
}
