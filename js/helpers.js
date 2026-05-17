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
  return {
    q:(document.querySelector('#page-'+type+' .search-box')?.value||'').toLowerCase(),
    unit:document.getElementById(type+'-f-unit')?.value||'',
    sub:document.getElementById(type+'-f-sub')?.value||''
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
// PHOTO UPLOAD — Supabase Storage
// ═══════════════════════════════════════════════════
let _photoCtx = null; // {type, id}

function openPhotoModal(type, id){
  if(session?.role!=='admin'){ showToast('Hanya Admin yang dapat mengubah foto','error'); return; }
  const rec = DB[type]?.find(r=>r.id===id);
  if(!rec) return;
  _photoCtx = {type, id};
  const hasPhoto = !!rec.foto;
  document.getElementById('modal-title').textContent = 'Foto Pegawai — '+rec.nama;
  document.getElementById('modal-body').innerHTML = `
    <div style="text-align:center;margin-bottom:20px">
      <div class="photo-upload-circle" style="margin:0 auto 12px" onclick="document.getElementById('photo-file-in').click()">
        ${hasPhoto
          ? `<img id="photo-preview" src="${rec.foto}" style="width:100%;height:100%;object-fit:cover" onerror="this.style.display='none'">`
          : `<div id="photo-preview" style="width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;background:var(--primary-bg)">
               <span style="font-size:28px;font-weight:700;color:var(--primary-tx)">${initials(rec.nama)}</span>
             </div>`}
        <div class="photo-upload-overlay">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          <span>Ganti Foto</span>
        </div>
      </div>
      <div style="font-size:12px;color:var(--tx2);margin-bottom:4px">Klik foto untuk memilih gambar baru</div>
      <div style="font-size:11px;color:var(--tx3)">JPG, PNG · Maks 2MB</div>
      <input type="file" id="photo-file-in" accept=".jpg,.jpeg,.png" style="display:none" onchange="handlePhotoSelect(event)">
    </div>
    <div id="photo-upload-msg" style="font-size:12px;text-align:center;min-height:18px"></div>
    <div id="photo-size-wrap" style="display:none;margin-top:8px">
      <div style="font-size:11px;color:var(--tx3);margin-bottom:3px;text-align:right" id="photo-size-lbl"></div>
      <div class="photo-size-bar"><div class="photo-size-fill" id="photo-size-fill" style="width:0%"></div></div>
    </div>`;
  document.getElementById('modal-footer').innerHTML = `
    <button class="btn" onclick="closeModal()">Batal</button>
    ${hasPhoto?`<button class="btn btn-danger" onclick="removePhoto()">Hapus Foto</button>`:''}
    <button class="btn btn-primary" id="photo-save-btn" onclick="uploadPhoto()" disabled>Upload & Simpan</button>`;
  document.getElementById('modal').style.display='flex';
}

function handlePhotoSelect(e){
  const file = e.target.files[0];
  if(!file) return;
  const msg = document.getElementById('photo-upload-msg');
  const sizeWrap = document.getElementById('photo-size-wrap');
  const sizeLbl = document.getElementById('photo-size-lbl');
  const sizeFill = document.getElementById('photo-size-fill');
  const saveBtn = document.getElementById('photo-save-btn');

  // Validate format
  if(!['image/jpeg','image/png'].includes(file.type)){
    msg.textContent='✗ Format tidak didukung. Gunakan JPG atau PNG.';
    msg.style.color='var(--red-tx)';
    saveBtn.disabled=true; return;
  }
  // Validate size (2MB)
  const mb = file.size/1024/1024;
  if(mb>2){
    msg.textContent=`✗ Ukuran file ${mb.toFixed(1)}MB melebihi batas 2MB.`;
    msg.style.color='var(--red-tx)';
    saveBtn.disabled=true; return;
  }
  // Show size bar
  sizeWrap.style.display='block';
  sizeLbl.textContent=`${(file.size/1024).toFixed(0)} KB / 2048 KB`;
  sizeFill.style.width=Math.min(mb/2*100,100)+'%';
  sizeFill.style.background = mb>1.5?'var(--amb-tx)':'var(--primary)';

  // Preview
  const reader=new FileReader();
  reader.onload=ev=>{
    const prev=document.getElementById('photo-preview');
    if(prev.tagName==='IMG'){
      prev.src=ev.target.result;
    } else {
      const img=document.createElement('img');
      img.id='photo-preview';
      img.src=ev.target.result;
      img.style.cssText='width:100%;height:100%;object-fit:cover';
      prev.replaceWith(img);
    }
    msg.textContent='✓ File siap diupload';
    msg.style.color='var(--grn-tx)';
    saveBtn.disabled=false;
    saveBtn._file=file;
  };
  reader.readAsDataURL(file);
}

async function uploadPhoto(){
  const btn=document.getElementById('photo-save-btn');
  const msg=document.getElementById('photo-upload-msg');
  const file=btn._file;
  if(!file){ showToast('Pilih foto terlebih dahulu','error'); return; }
  btn.disabled=true; btn.textContent='Mengupload...';
  msg.textContent='Mengunggah ke Supabase Storage...'; msg.style.color='var(--tx3)';
  try{
    const rec=DB[_photoCtx.type]?.find(r=>r.id===_photoCtx.id);
    const ext=file.name.split('.').pop().toLowerCase();
    const filePath=`${_photoCtx.type}/${_photoCtx.id}_${Date.now()}.${ext}`;
    if(rec?.foto){
      const oldKey=rec.foto.split('/object/public/photos/')[1];
      if(oldKey) await supa.storage.from('photos').remove([decodeURIComponent(oldKey.split('?')[0])]);
    }
    const {error:upErr}=await supa.storage.from('photos').upload(filePath,file,{upsert:true,contentType:file.type});
    if(upErr) throw new Error(upErr.message);
    const {data:urlData}=supa.storage.from('photos').getPublicUrl(filePath);
    const url=urlData.publicUrl;
    const {error:dbErr}=await supa.from(_photoCtx.type).update({foto:url}).eq('id',_photoCtx.id);
    if(dbErr) throw new Error(dbErr.message);
    if(rec) rec.foto=url;
    refreshTable(_photoCtx.type);
    const dc=document.getElementById('detail-content');
    if(dc&&dc.dataset.id===_photoCtx.id) showDetail(_photoCtx.type,_photoCtx.id);
    closeModal(); showToast('Foto berhasil disimpan','success');
  }catch(err){
    msg.textContent='✗ '+err.message; msg.style.color='var(--red-tx)';
    btn.disabled=false; btn.textContent='Upload & Simpan';
  }
}

function savePhotoUrl(type, id, url, source){
  const rec = DB[type]?.find(r=>r.id===id);
  if(!rec) return;
  rec.foto = url;
  refreshTable(type);
  // Update detail page if open
  const dw=document.getElementById('detail-content');
  if(dw&&dw.dataset.id===id) showDetail(type,id);
  closeModal();
  showToast(`Foto berhasil disimpan (${source})`, 'success');
}

async function removePhoto(){
  if(!_photoCtx) return;
  const rec=DB[_photoCtx.type]?.find(r=>r.id===_photoCtx.id);
  if(rec){
    // Hapus dari Supabase Storage jika ada
    if(rec.foto){
      try{
        const path=rec.foto.split('/object/public/photos/')[1];
        if(path) await supa.storage.from('photos').remove([decodeURIComponent(path.split('?')[0])]);
      }catch(e){}
    }
    // Update database
    await supa.from(_photoCtx.type).update({foto:null}).eq('id',_photoCtx.id);
    delete rec.foto;
    refreshTable(_photoCtx.type);
  }
  closeModal();
  showToast('Foto dihapus','success');
}
