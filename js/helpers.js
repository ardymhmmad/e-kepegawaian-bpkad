// ═══════════════════════════════════════════════════
// UNIT / SUBUNIT HELPERS
// ═══════════════════════════════════════════════════

// Populate unit dropdown for a given type — always includes "Semua Unit"
function populateUnitFilter(type){
  const sel=document.getElementById(type+'-f-unit');
  if(!sel) return;
  const cur=sel.value; // preserve current selection if any
  sel.innerHTML='<option value="">Semua Unit</option>'+
    Object.keys(UNITS).map(u=>`<option value="${u}">${u}</option>`).join('');
  if(cur) sel.value=cur;
}

// Sync sub-unit dropdown to match selected unit
function onUnitFilter(type){
  const unit=document.getElementById(type+'-f-unit')?.value||'';
  const subSel=document.getElementById(type+'-f-sub');
  if(!subSel) return;
  const curSub=subSel.value;
  const subs=unit?UNITS[unit]||[]:[];
  subSel.innerHTML='<option value="">Semua Sub Unit</option>'+
    subs.map(s=>`<option value="${s}">${s}</option>`).join('');
  // restore sub selection if still valid
  if(curSub && subs.includes(curSub)) subSel.value=curSub;
}

// Init ALL filter dropdowns and wire change events — called once at app init
function initAllFilters(){
  const DATA_TYPES = ['asn','pppk','pjlp'];
  const ALL_TYPES  = ['asn','pppk','pjlp','kp','kgb'];
  // Note: cuti and alokasi-cuti have their own filter wiring in renderCutiPage/renderAlokasiPage

  ALL_TYPES.forEach(type=>{
    const unitSel = document.getElementById(type+'-f-unit');
    const subSel  = document.getElementById(type+'-f-sub');
    if(!unitSel) return;

    // Populate options immediately
    populateUnitFilter(type);

    // Wire unit change: update sub options, then re-render table
    unitSel.addEventListener('change', ()=>{
      onUnitFilter(type);
      refreshTable(type);
    });

    // Wire sub change: re-render table
    if(subSel){
      subSel.addEventListener('change', ()=>{ refreshTable(type); });
    }
  });

  // Wire search boxes
  ALL_TYPES.forEach(type=>{
    const sb = document.querySelector('#page-'+type+' .search-box');
    if(sb) sb.addEventListener('input', ()=>{ refreshTable(type); });
  });
}

// Central render dispatcher — always reads current filter state
function refreshTable(type){
  const f = getFilters(type);
  if(type==='kp')       renderKP(f);
  else if(type==='kgb') renderKGB(f);
  else                  renderTable(type, f);
}
function buildUnitSubSelects(selectedUnit='', selectedSub='', prefix='fu'){
  const unitOpts=Object.keys(UNITS).map(u=>`<option value="${u}"${u===selectedUnit?' selected':''}>${u}</option>`).join('');
  const subOpts=selectedUnit?(UNITS[selectedUnit]||[]).map(s=>`<option value="${s}"${s===selectedSub?' selected':''}>${s}</option>`).join(''):'';
  return `<div class="fg"><label>Unit Kerja</label><select id="${prefix}_unit" onchange="updateSubUnit('${prefix}')"><option value="">— Pilih Unit —</option>${unitOpts}</select></div><div class="fg"><label>Sub Unit Kerja</label><select id="${prefix}_subunit"><option value="">— Pilih Sub Unit —</option>${subOpts}</select></div>`;
}
function updateSubUnit(prefix){
  const unit=document.getElementById(prefix+'_unit')?.value;
  const sel=document.getElementById(prefix+'_subunit');
  if(!sel) return;
  const subs=unit?UNITS[unit]||[]:[];
  sel.innerHTML='<option value="">— Pilih Sub Unit —</option>'+subs.map(s=>`<option value="${s}">${s}</option>`).join('');
}
function getFilters(type){
  // Pensiun — pakai id khusus
  if(type==='pensiun') return {
    q:      (document.getElementById('pensiun-q')?.value||'').toLowerCase(),
    unit:   document.getElementById('pensiun-unit')?.value||'',
    status: document.getElementById('pensiun-status')?.value||''
  };
  // KP — search pakai id kp-q, filter kp-f-unit, kp-f-status
  if(type==='kp') return {
    q:      (document.getElementById('kp-q')?.value||'').toLowerCase(),
    unit:   document.getElementById('kp-f-unit')?.value||'',
    status: document.getElementById('kp-f-status')?.value||''
  };
  // KGB — search pakai id kgb-q, filter kgb-f-unit, kgb-f-status
  if(type==='kgb') return {
    q:      (document.getElementById('kgb-q')?.value||'').toLowerCase(),
    unit:   document.getElementById('kgb-f-unit')?.value||'',
    status: document.getElementById('kgb-f-status')?.value||''
  };
  // Default — ASN/PPPK/PJLP
  return {
    q:      (document.querySelector('#page-'+type+' .search-box')?.value||'').toLowerCase(),
    unit:   document.getElementById(type+'-f-unit')?.value||'',
    sub:    document.getElementById(type+'-f-sub')?.value||'',
    status: document.getElementById(type+'-f-status')?.value||''
  };
}

// ═══════════════════════════════════════════════════
// MODAL / CONFIRM / TOAST
// ═══════════════════════════════════════════════════
function closeModal(){ document.getElementById('modal').style.display='none'; }
function closeModalOutside(e){ if(e.target===document.getElementById('modal')) closeModal(); }

function showConfirm(title,msg,onOk,onCancel,okLabel='Ya, Lanjutkan',cancelLabel='Batal'){
  document.getElementById('confirm-title').innerHTML=title;
  document.getElementById('confirm-msg').innerHTML=msg;
  document.getElementById('confirm-actions').innerHTML=`
    <button class="btn" onclick="closeConfirm()">${cancelLabel}</button>
    <button class="btn btn-primary" onclick="closeConfirm(true)">${okLabel}</button>`;
  document.getElementById('confirm-overlay').style.display='flex';
  window._confirmOk=onOk; window._confirmCancel=onCancel||null;
}
function closeConfirm(ok=false){
  document.getElementById('confirm-overlay').style.display='none';
  if(ok&&window._confirmOk) window._confirmOk();
  else if(!ok&&window._confirmCancel) window._confirmCancel();
}

let _toastTimer;
function showToast(msg,type=''){
  const t=document.getElementById('toast');
  t.textContent=msg; t.className='toast show'+(type?' '+type:'');
  clearTimeout(_toastTimer);
  _toastTimer=setTimeout(()=>t.classList.remove('show'),3000);
}

// ═══════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════
function fmt(d){ if(!d) return '—'; const p=d.split('-'); return p.length===3?p[2]+'-'+p[1]+'-'+p[0]:d; }
function fmtDate(d){ if(!d) return '—'; if(d instanceof Date) return d.getDate().toString().padStart(2,'0')+'-'+(d.getMonth()+1).toString().padStart(2,'0')+'-'+d.getFullYear(); return fmt(d); }
function today(){ return new Date().toISOString().slice(0,10).replace(/-/g,''); }
function daysUntil(d){ if(!d) return 999; return Math.ceil((new Date(d)-new Date())/(864e5)); }
function initials(n){ return (n||'').replace(/[,.].*$/,'').trim().split(/\s+/).map(w=>w[0]).join('').slice(0,2).toUpperCase(); }
function shortName(n){ return (n||'').split(',')[0].replace(/^(Drs\.|Dr\.|Ir\.|Hj\.|H\.)\s*/i,'').split(' ').slice(0,2).join(' '); }
function shortUnit(u){ if(!u) return '—'; if(u.length<=22) return u; return u.replace(/Subbidang\s*/i,'').replace(/Subbagian\s*/i,'').trim().substring(0,22)+'…'; }
function str(v){ if(v===null||v===undefined) return ''; if(v instanceof Date) return v.toISOString().slice(0,10); return String(v).trim(); }
function excelDate(v){
  if(!v) return '';
  if(v instanceof Date) return v.toISOString().slice(0,10);
  if(typeof v==='number'){ const d=XLSX.SSF.parse_date_code(v); return `${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`; }
  const s=String(v).trim();
  if(/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return s;
}
function num(v){ return Number(v||0).toLocaleString('id-ID'); }
function golBadge(g){ if(!g) return 'b-gray'; if(g.startsWith('IV')) return 'b-green'; if(g.startsWith('III')) return 'b-blue'; return 'b-gray'; }
function kpStatusBadge(s){ return s==='Memenuhi Syarat'?'b-green':s==='Mengingatkan'?'b-amber':s==='Batas Pendidikan'?'b-purple':'b-gray'; }
function kgbBadge(s){ return s==='Lewat Jatuh Tempo'?'b-red':s==='Segera'?'b-amber':'b-green'; }
function kontrakBadge(d){ const dy=daysUntil(d); return dy<0?'b-red':dy<=30?'b-amber':'b-green'; }

// ═══════════════════════════════════════════════════
// LOCALSTORAGE
// ═══════════════════════════════════════════════════
function saveLocal(){}
function loadLocal(){ return false; }

// ═══════════════════════════════════════════════════
// PDF GENERATOR & WA DENGAN LINK PDF
// ═══════════════════════════════════════════════════

// Generate PDF base64 dari elemen HTML
// Menggunakan iframe tersembunyi dengan CSS lengkap agar render sama dengan print
async function generatePdfBase64(elId){
  const elSrc = document.getElementById(elId);
  if(!elSrc) throw new Error('Elemen #'+elId+' tidak ditemukan');

  // Ambil semua CSS dari halaman utama
  const cssLinks  = Array.from(document.styleSheets)
    .map(s => { try{ return Array.from(s.cssRules).map(r=>r.cssText).join('\n'); } catch(e){ return ''; } })
    .join('\n');

  // Buat iframe tersembunyi
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;top:0;left:0;width:794px;height:1123px;opacity:0;pointer-events:none;border:none;z-index:-1;';
  document.body.appendChild(iframe);

  // Tulis HTML ke iframe dengan CSS lengkap + override visibility
  const iDoc = iframe.contentDocument || iframe.contentWindow.document;
  iDoc.open();
  iDoc.write(`<!DOCTYPE html><html><head><meta charset="utf-8">
    <style>
      ${cssLinks}
      /* Override: paksa semua visible */
      body, body *{ visibility:visible !important; }
      #${elId}, #${elId} *{ visibility:visible !important; display:block; }
      body{ background:#fff !important; margin:0; padding:0; width:794px; }
    </style>
  </head><body>
    <div id="${elId}" style="display:block !important; visibility:visible !important; position:static !important; width:794px; background:#fff;">
      ${elSrc.innerHTML}
    </div>
  </body></html>`);
  iDoc.close();

  // Tunggu iframe render selesai
  await new Promise(r => setTimeout(r, 800));

  try {
    const el = iDoc.getElementById(elId);
    if(!el) throw new Error('Elemen tidak ditemukan di iframe');

    const canvas = await html2canvas(el, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      width: 794,
      windowWidth: 794,
    });

    console.log('[PDF] iframe canvas:', canvas.width+'x'+canvas.height);
    if(canvas.width < 10 || canvas.height < 10) throw new Error('Canvas terlalu kecil — konten tidak ter-render');

    const { jsPDF } = window.jspdf;
    const pdf  = new jsPDF({ orientation:'portrait', unit:'mm', format:'a4' });
    const pdfW = pdf.internal.pageSize.getWidth();
    const pdfH = pdf.internal.pageSize.getHeight();
    const imgH = pdfW * (canvas.height / canvas.width);
    const img  = canvas.toDataURL('image/jpeg', 0.95);

    let posY = 0;
    while(posY < imgH){
      if(posY > 0) pdf.addPage();
      pdf.addImage(img, 'JPEG', 0, -posY, pdfW, imgH);
      posY += pdfH;
    }

    return pdf.output('datauristring').split(',')[1];
  } finally {
    document.body.removeChild(iframe);
  }
}

// Upload PDF ke Supabase Storage lalu kirim link via WA Fonnte
async function kirimWADenganFile(target, pesan, pdfBase64, namaFile){
  if(!FONNTE_TOKEN){ showToast('Token Fonnte belum diisi','error'); return false; }
  if(!target) return false;

  let nomor = String(target).replace(/\D/g,'');
  if(nomor.startsWith('0')) nomor = '62'+nomor.slice(1);

  try {
    // 1. Base64 → Blob
    const binary = atob(pdfBase64);
    const bytes  = new Uint8Array(binary.length);
    for(let i=0;i<binary.length;i++) bytes[i]=binary.charCodeAt(i);
    const blob = new Blob([bytes],{type:'application/pdf'});
    console.log('[WA-PDF] blob size:', blob.size, 'bytes');

    // 2. Upload ke Supabase Storage bucket 'sk-kgb'
    showToast('⏳ Mengupload PDF...','info');
    const path = `surat/${Date.now()}_${namaFile}`;
    const { error: upErr } = await supa.storage
      .from('sk-kgb')
      .upload(path, blob, { contentType:'application/pdf', upsert:true });

    if(upErr){
      console.error('[WA-PDF] Upload gagal:', upErr);
      showToast('❌ Upload gagal: '+upErr.message,'error');
      return false;
    }

    // 3. Ambil URL publik
    const { data: urlData } = supa.storage.from('sk-kgb').getPublicUrl(path);
    const url = urlData?.publicUrl;
    if(!url){ showToast('❌ Gagal ambil URL publik','error'); return false; }
    console.log('[WA-PDF] Public URL:', url);

    // 4. Kirim WA dengan link PDF disisipkan di pesan
    showToast('⏳ Mengirim WA...','info');
    const pesanFinal = pesan + `\n\n📎 *Download PDF:*\n${url}`;
    const res = await fetch('https://api.fonnte.com/send',{
      method:'POST',
      headers:{ 'Authorization': FONNTE_TOKEN },
      body: new URLSearchParams({ target:nomor, message:pesanFinal, countryCode:'62' })
    });
    const data = await res.json();
    console.log('[WA-PDF] Fonnte:', data);

    if(data.status !== true){
      showToast('❌ WA gagal: '+(data.reason||data.message||JSON.stringify(data)),'error');
      return false;
    }

    // 5. Auto-hapus file setelah 24 jam
    setTimeout(async ()=>{
      await supa.storage.from('sk-kgb').remove([path]);
      console.log('[WA-PDF] File dihapus:', path);
    }, 24*60*60*1000);

    return true;
  } catch(e){
    console.error('[WA-PDF] Error:', e);
    showToast('❌ Error: '+e.message,'error');
    return false;
  }
}
