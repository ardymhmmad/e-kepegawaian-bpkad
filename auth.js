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

// ═══════════════════════════════════════════════════
// LOGO INSTANSI
// ═══════════════════════════════════════════════════
let _logoData = null; // base64 or URL

function loadLogo(){
  try{
    const l=localStorage.getItem('ekp_logo');
    if(l){ _logoData=l; applyLogoEverywhere(l); }
  }catch(e){}
}

function applyLogoEverywhere(src){
  // Topbar seal
  const tb=document.querySelector('.app-topbar-seal');
  if(tb){
    const img=document.createElement('img');
    img.className='app-topbar-seal';
    img.src=src;
    img.style.cssText='width:34px;height:34px;object-fit:contain;border-radius:4px';
    tb.replaceWith(img);
  }
  // Login side seal
  const ls=document.querySelector('.login-side-seal');
  if(ls){
    const img=document.createElement('img');
    img.className='login-side-seal';
    img.src=src;
    img.style.cssText='width:80px;height:80px;object-fit:contain';
    ls.replaceWith(img);
  }
  // Sidebar brand icon
  const sb=document.querySelector('.s-brand-icon');
  if(sb){
    sb.innerHTML=`<img src="${src}" style="width:24px;height:24px;object-fit:contain;border-radius:4px">`;
  }
  // Login logo icon
  const li=document.querySelector('.login-logo-icon');
  if(li){
    li.innerHTML=`<img src="${src}" style="width:32px;height:32px;object-fit:contain">`;
  }
  // Settings preview
  updateLogoSettingsPreview(src);
}

function updateLogoSettingsPreview(src){
  const img=document.getElementById('logo-preview-img');
  const ph=document.getElementById('logo-preview-placeholder');
  const fn=document.getElementById('logo-filename');
  const rb=document.getElementById('logo-remove-btn');
  if(img){ img.src=src; img.style.display='block'; }
  if(ph) ph.style.display='none';
  if(fn) fn.textContent='Logo aktif';
  if(rb) rb.style.display='';
}

async function handleLogoUpload(e){
  const file=e.target.files[0]; if(!file) return;
  const st=document.getElementById('logo-upload-status');
  if(!['image/jpeg','image/png'].includes(file.type)){
    if(st) st.innerHTML=`<div style="color:var(--red-tx);font-size:12px">✗ Format tidak didukung. Gunakan JPG atau PNG.</div>`; return;
  }
  if(file.size>2*1024*1024){
    if(st) st.innerHTML=`<div style="color:var(--red-tx);font-size:12px">✗ Ukuran melebihi 2MB.</div>`; return;
  }
  if(st) st.innerHTML=`<div style="color:var(--tx3);font-size:12px;margin-top:6px">Mengupload logo ke Supabase...</div>`;
  try{
    const ext=file.name.split('.').pop().toLowerCase();
    const path='logo_instansi.'+ext;
    const {error:upErr}=await supa.storage.from('logos').upload(path,file,{upsert:true,contentType:file.type});
    if(upErr) throw new Error(upErr.message);
    const {data:urlData}=supa.storage.from('logos').getPublicUrl(path);
    const url=urlData.publicUrl+'?t='+Date.now();
    await supa.from('settings').upsert({setting_key:'logo_path',setting_val:url},{onConflict:'setting_key'});
    _logoData=url; applyLogoEverywhere(url);
    if(st) st.innerHTML=`<div style="color:var(--grn-tx);font-size:12px;margin-top:6px">✓ Logo berhasil disimpan dan diterapkan.</div>`;
    showToast('Logo instansi berhasil diperbarui','success');
  }catch(e){
    if(st) st.innerHTML=`<div style="color:var(--red-tx);font-size:12px;margin-top:6px">✗ ${e.message}</div>`;
  }
}

async function removeLogo(){
  _logoData=null;
  try{
    await supa.storage.from('logos').remove(['logo_instansi.png','logo_instansi.jpg','logo_instansi.jpeg']);
    await supa.from('settings').update({setting_val:null}).eq('setting_key','logo_path');
  }catch(e){}
  const img=document.getElementById('logo-preview-img');
  const ph=document.getElementById('logo-preview-placeholder');
  const fn=document.getElementById('logo-filename');
  const rb=document.getElementById('logo-remove-btn');
  if(img){ img.style.display='none'; img.src=''; }
  if(ph) ph.style.display='';
  if(fn) fn.textContent='Belum ada logo yang diupload';
  if(rb) rb.style.display='none';
  const st=document.getElementById('logo-upload-status');
  if(st) st.innerHTML=`<div style="color:var(--amb-tx);font-size:12px">Logo dihapus.</div>`;
  showToast('Logo dihapus','success');
}
